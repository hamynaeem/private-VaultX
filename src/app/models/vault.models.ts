import { Timestamp } from '@angular/fire/firestore';

export interface VaultUser {
  uid: string;
  fullName: string;
  email: string;
  photoURL: string;
  createdAt: Timestamp;
  storageUsed: number; // bytes
}

export interface VaultFolder {
  id: string;
  userId: string;
  name: string;
  createdAt: Timestamp;
  fileCount?: number;
}

export interface VaultFile {
  id: string;
  userId: string;
  folderId: string | null;
  fileName: string;
  fileType: 'photo' | 'document' | 'pdf' | 'other';
  mimeType: string;
  fileSize: number; // bytes
  downloadUrl: string;
  thumbnailUrl?: string;
  storagePath: string;
  createdAt: Timestamp;
}

export interface UploadTask {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  downloadUrl?: string;
}

export interface StorageStats {
  totalFiles: number;
  totalPhotos: number;
  totalDocuments: number;
  totalPdfs: number;
  storageUsed: number;
  storageLimit: number;
}

export interface LoginActivity {
  id: string;
  userId: string;
  timestamp: Timestamp;
  device: string;
  location: string;
  ip: string;
  success: boolean;
}
