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
} from '@angular/fire/firestore';
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
      createdAt: serverTimestamp(),
    });
  }

  async deleteFile(fileId: string) {
    return deleteDoc(doc(this.firestore, 'files', fileId));
  }

  async addFolder(folder: Omit<VaultFolder, 'id'>) {
    return addDoc(collection(this.firestore, 'folders'), {
      ...folder,
      createdAt: serverTimestamp(),
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
