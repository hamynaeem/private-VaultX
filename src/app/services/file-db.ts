import Dexie, { Table } from 'dexie';

export interface FileEntry {
  id: string;
  userId?: string;
  folderId?: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: number;
  modifiedAt: number;
  iv: string; // base64-encoded IV
  data: Blob;
}

export interface MetaEntry {
  key: string;
  value: any;
}

export class FileDB extends Dexie {
  files!: Table<FileEntry, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super('VaultXFilesDB');
    this.version(1).stores({
      files: 'id,userId,fileName,mimeType,createdAt,folderId',
      meta: 'key',
    });
  }
}

export const db = new FileDB();
