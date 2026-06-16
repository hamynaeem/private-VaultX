import { Injectable, signal } from '@angular/core';
import { db, FileEntry } from './file-db';

function uint8ArrayToBase64(u8: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < u8.length; i += chunkSize) {
    const slice = u8.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(slice) as any);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  isLocked = signal(true);
  private masterCryptoKey: CryptoKey | null = null;
  private autoLockMs = 5 * 60 * 1000; // default 5 minutes
  private autoLockTimer: any = null;

  constructor() {
    this.init();
  }

  private async init() {
    // If a wrapped master key exists, remain locked until unlock(pin) is called.
    const wrapped = await db.meta.get('wrappedMaster');
    const raw = await db.meta.get('masterKey');
    if (raw && raw.value) {
      const rawBytes = base64ToUint8Array(String(raw.value));
      this.masterCryptoKey = await crypto.subtle.importKey('raw', rawBytes as unknown as BufferSource, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
      this.isLocked.set(false);
      this.resetAutoLockTimer();
    } else if (wrapped && wrapped.value) {
      this.isLocked.set(true);
    } else {
      // first run: generate device master key and store it (wrapped is optional later)
      const mk = crypto.getRandomValues(new Uint8Array(32));
      await db.meta.put({ key: 'masterKey', value: uint8ArrayToBase64(mk) });
      this.masterCryptoKey = await crypto.subtle.importKey('raw', mk as unknown as BufferSource, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
      this.isLocked.set(false);
      this.resetAutoLockTimer();
    }
  }

  setAutoLockTimeout(ms: number) {
    this.autoLockMs = ms;
    this.resetAutoLockTimer();
  }

  private resetAutoLockTimer() {
    if (this.autoLockTimer) clearTimeout(this.autoLockTimer);
    if (!this.masterCryptoKey) return;
    this.autoLockTimer = setTimeout(() => this.lock(), this.autoLockMs);
  }

  private ensureKey(): CryptoKey {
    if (!this.masterCryptoKey) throw new Error('Storage locked. Unlock with PIN.');
    this.resetAutoLockTimer();
    return this.masterCryptoKey;
  }

  private async deriveKeyFromPin(pin: string, salt: Uint8Array) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', enc.encode(pin) as unknown as BufferSource, { name: 'PBKDF2' }, false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: 200000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey', 'unwrapKey']
    );
    return key;
  }

  async setPin(pin: string) {
    if (!this.masterCryptoKey) throw new Error('No master key available');
    // export raw master key
    const raw = await crypto.subtle.exportKey('raw', this.masterCryptoKey);
    const rawU8 = new Uint8Array(raw);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const wrapKey = await this.deriveKeyFromPin(pin, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrapped = await crypto.subtle.wrapKey('raw', this.masterCryptoKey, wrapKey, { name: 'AES-GCM', iv: iv as unknown as BufferSource });
    await db.meta.put({ key: 'wrappedMaster', value: { wrapped: uint8ArrayToBase64(new Uint8Array(wrapped)), iv: uint8ArrayToBase64(iv), salt: uint8ArrayToBase64(salt) } });
    // remove unwrapped master key from meta storage
    await db.meta.delete('masterKey');
    this.resetAutoLockTimer();
  }

  async unlock(pin: string) {
    const wrappedMeta = await db.meta.get('wrappedMaster');
    if (!wrappedMeta || !wrappedMeta.value) throw new Error('No PIN set');
    const { wrapped, iv, salt } = wrappedMeta.value as { wrapped: string; iv: string; salt: string };
    const wrappedBytes = base64ToUint8Array(wrapped);
    const ivBytes = base64ToUint8Array(iv);
    const saltBytes = base64ToUint8Array(salt);
    const wrapKey = await this.deriveKeyFromPin(pin, saltBytes);
    // unwrap to get a CryptoKey we can use as master key
    const masterKey = await crypto.subtle.unwrapKey(
      'raw',
      wrappedBytes as unknown as BufferSource,
      wrapKey,
      { name: 'AES-GCM', iv: ivBytes as unknown as BufferSource },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    this.masterCryptoKey = masterKey;
    this.isLocked.set(false);
    this.resetAutoLockTimer();
  }

  lock() {
    this.masterCryptoKey = null;
    this.isLocked.set(true);
    if (this.autoLockTimer) clearTimeout(this.autoLockTimer);
  }

  // Ensure encryption-only when storing
  private async encryptBuffer(buffer: ArrayBuffer) {
    const key = this.ensureKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer);
    return { cipher: new Uint8Array(cipher), iv };
  }

  private async decryptToBlob(cipherBuffer: ArrayBuffer, ivBase64: string, mimeType: string) {
    const key = this.ensureKey();
    const iv = base64ToUint8Array(ivBase64);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as unknown as BufferSource }, key, cipherBuffer as unknown as BufferSource);
    return new Blob([plain], { type: mimeType });
  }

  private readFileArrayBuffer(file: File, onProgress?: (n: number) => void): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onprogress = (ev) => {
        if (ev.lengthComputable && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 80));
      };
      fr.onerror = () => reject(new Error('File read error'));
      fr.onload = () => resolve(fr.result as ArrayBuffer);
      fr.readAsArrayBuffer(file);
    });
  }

  async ensureVaultFolder(folderName = 'VaultX') {
    const cached = await db.meta.get('vault_folder_id');
    if (cached && cached.value) return String(cached.value);
    const id = 'local_vault';
    await db.meta.put({ key: 'vault_folder_id', value: id });
    return id;
  }

  async uploadFile(folderId: string, file: File, onProgress?: (n: number) => void, userId?: string) {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) throw new Error('File exceeds maximum size');

    const arrayBuffer = await this.readFileArrayBuffer(file, onProgress);
    const { cipher, iv } = await this.encryptBuffer(arrayBuffer);
    const id = crypto.randomUUID();
    const blob = new Blob([cipher.buffer], { type: 'application/octet-stream' });
    const entry: FileEntry = {
      id,
      userId: userId ?? '',
      folderId: folderId || null,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      iv: uint8ArrayToBase64(iv),
      data: blob,
    };
    await db.files.add(entry);
    onProgress?.(100);
    return { id };
  }

  async downloadFileAsBlob(fileId: string) {
    const entry = await db.files.get(fileId);
    if (!entry) throw new Error('File not found');
    const cipherBuffer = await entry.data.arrayBuffer();
    return await this.decryptToBlob(cipherBuffer, entry.iv, entry.mimeType);
  }

  async deleteFile(fileId: string) {
    await db.files.delete(fileId);
    return true;
  }

  async renameFile(fileId: string, newName: string) {
    await db.files.update(fileId, { fileName: newName, modifiedAt: Date.now() });
    return await db.files.get(fileId);
  }

  async listFiles(folderId: string, opts: { pageSize?: number; q?: string } = {}) {
    let collection = db.files.orderBy('createdAt');
    if (folderId) collection = collection.filter((f: any) => f.folderId === folderId);
    if (opts.q) {
      const q = opts.q.toLowerCase();
      collection = collection.filter((f: any) => f.fileName.toLowerCase().includes(q));
    }
    const pageSize = opts.pageSize ?? 100;
    const items = await collection.limit(pageSize).toArray();
    return { files: items.map((f: FileEntry) => ({ id: f.id, name: f.fileName, mimeType: f.mimeType, size: f.fileSize, modifiedTime: f.modifiedAt, thumbnailLink: `local:${f.id}` })) };
  }

  async calculateStorageUsage(uid?: string) {
    if (uid) {
      const items = await db.files.where('userId').equals(uid).toArray();
        return items.reduce((s: number, it: FileEntry) => s + (it.fileSize || 0), 0);
    }
    const all = await db.files.toArray();
      return all.reduce((s: number, it: FileEntry) => s + (it.fileSize || 0), 0);
  }
}
