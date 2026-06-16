import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  limit,
  Unsubscribe,
  Timestamp,
} from '@angular/fire/firestore';
import { db } from './file-db';
import { VaultFile, VaultFolder, StorageStats } from '../models/vault.models';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  private firestore = inject(Firestore);

  files = signal<VaultFile[]>([]);
  folders = signal<VaultFolder[]>([]);
  isLoading = signal(false);

  private unsubFiles?: Unsubscribe;
  private unsubFolders?: Unsubscribe;

  subscribeToFiles(userId: string) {
    const q = query(
      collection(this.firestore, 'files'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );
    this.unsubFiles = onSnapshot(q, (snap) => {
      this.files.set(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VaultFile));
    });
  }

  subscribeToFolders(userId: string) {
    const q = query(
      collection(this.firestore, 'folders'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    );
    this.unsubFolders = onSnapshot(q, (snap) => {
      this.folders.set(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VaultFolder));
    });
  }

  unsubscribeAll() {
    this.unsubFiles?.();
    this.unsubFolders?.();
  }

  async addFile(file: Omit<VaultFile, 'id'>) {
    return addDoc(collection(this.firestore, 'files'), {
      ...file,
      createdAt: Timestamp.now(),
    });
  }

  async deleteFile(fileId: string) {
    return deleteDoc(doc(this.firestore, 'files', fileId));
  }

  async addFolder(folder: Omit<VaultFolder, 'id'>) {
    return addDoc(collection(this.firestore, 'folders'), {
      ...folder,
      createdAt: Timestamp.now(),
    });
  }

  async updateFolder(folderId: string, data: Partial<VaultFolder>) {
    return updateDoc(doc(this.firestore, 'folders', folderId), data as Record<string, unknown>);
  }

  async deleteFolder(folderId: string) {
    return deleteDoc(doc(this.firestore, 'folders', folderId));
  }

  async moveFile(fileId: string, newFolderId: string | null) {
    return updateDoc(doc(this.firestore, 'files', fileId), { folderId: newFolderId });
  }

  async getRecentFiles(userId: string, count = 5): Promise<VaultFile[]> {
    const q = query(
      collection(this.firestore, 'files'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(count),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VaultFile);
  }

  private mimeToFileType(mime: string): 'photo' | 'document' | 'pdf' | 'other' {
    if (!mime) return 'other';
    if (mime.startsWith('image/')) return 'photo';
    if (mime === 'application/pdf') return 'pdf';
    if (
      mime.includes('document') ||
      mime.includes('word') ||
      mime.includes('sheet') ||
      mime.includes('presentation') ||
      mime.includes('text/')
    )
      return 'document';
    return 'other';
  }

  // Sync local IndexedDB files into Firestore as metadata documents.
  async syncLocalFiles(userId?: string): Promise<{ created: number }> {
    const uid = userId ?? '';
    const entries = await db.files.toArray();
    let created = 0;
    for (const e of entries) {
      if (uid && e.userId && e.userId !== uid) continue;
      const storagePath = `local:${e.id}`;
      // check if exists
      const q = query(collection(this.firestore, 'files'), where('storagePath', '==', storagePath), where('userId', '==', uid));
      const snap = await getDocs(q);
      if (!snap.empty) continue;
      const fileType = this.mimeToFileType(e.mimeType || '');
      await addDoc(collection(this.firestore, 'files'), {
        userId: uid,
        folderId: null,
        fileName: e.fileName,
        fileType,
        mimeType: e.mimeType,
        fileSize: e.fileSize,
        downloadUrl: storagePath,
        storagePath,
        createdAt: Timestamp.now(),
      });
      created++;
    }
    return { created };
  }

  getStats(userId: string): StorageStats {
    const allFiles = this.files();
    const userFiles = allFiles.filter((f) => f.userId === userId);
    return {
      totalFiles: userFiles.length,
      totalPhotos: userFiles.filter((f) => f.fileType === 'photo').length,
      totalDocuments: userFiles.filter((f) => f.fileType === 'document').length,
      totalPdfs: userFiles.filter((f) => f.fileType === 'pdf').length,
      storageUsed: userFiles.reduce((acc, f) => acc + (f.fileSize ?? 0), 0),
      storageLimit: 15 * 1024 * 1024 * 1024, // 15 GB
    };
  }
}
