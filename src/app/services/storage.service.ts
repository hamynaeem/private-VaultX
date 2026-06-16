import { Injectable, inject, signal } from '@angular/core';
import { UploadTask as VaultUploadTask } from '../models/vault.models';
import { LocalStorageService } from './local-storage.service';

@Injectable({ providedIn: 'root' })
export class StorageService {
  uploadQueue = signal<VaultUploadTask[]>([]);
  private localStorage = inject(LocalStorageService);

  constructor() {}

  getFileType(file: File): 'photo' | 'document' | 'pdf' | 'other' {
    if (file.type.startsWith('image/')) return 'photo';
    if (file.type === 'application/pdf') return 'pdf';
    if (
      file.type.includes('document') ||
      file.type.includes('word') ||
      file.type.includes('sheet') ||
      file.type.includes('presentation') ||
      file.type.includes('text/')
    )
      return 'document';
    return 'other';
  }

  getStoragePath(uid: string, fileType: string, fileName: string): string {
    const folder = fileType === 'photo' ? 'photos' : fileType === 'pdf' ? 'documents' : 'files';
    return `users/${uid}/${folder}/${Date.now()}_${fileName}`;
  }

  async uploadFile(
    uid: string,
    file: File,
    onProgress?: (progress: number) => void,
    onComplete?: (url: string, path: string) => void,
    onError?: (err: Error) => void,
  ) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      onError?.(new Error('File exceeds maximum size'));
      return;
    }

    try {
      const folderId = await this.localStorage.ensureVaultFolder();
      const resp = await this.localStorage.uploadFile(folderId, file, onProgress, uid);
      const fileId = resp?.id;
      if (fileId) {
        const lpath = `local:${fileId}`;
        onComplete?.(lpath, lpath);
        return;
      }
      onError?.(new Error('Upload succeeded but no file id returned'));
    } catch (err: any) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async deleteFile(storagePath: string) {
    if (storagePath && storagePath.startsWith('local:')) {
      const fileId = storagePath.replace(/^local:/, '');
      return await this.localStorage.deleteFile(fileId);
    }
    throw new Error('No storage provider available for delete; only local: supported');
  }

  async listFiles(prefix = '', opts: { limit?: number; offset?: number; search?: string } = {}) {
    throw new Error('listFiles not implemented on StorageService; use LocalStorageService.listFiles directly');
  }

  async createSignedUrl(path: string, expiresIn = 60 * 60) {
    if (path && path.startsWith('local:')) return path; // marker for local storage
    throw new Error('createSignedUrl not supported for local storage');
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
