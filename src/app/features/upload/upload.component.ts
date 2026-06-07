import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { StorageService } from '../../services/storage.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { FirestoreService } from '../../services/firestore.service';
import { UploadTask } from '../../models/vault.models';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="upload-page animate-fadeIn">
      <div class="page-header">
        <h1>Upload Files</h1>
        <p>Upload photos, documents, PDFs, and more to your secure vault.</p>
      </div>

      <!-- Folder Selector -->
      <div class="glass-card options-bar">
        <mat-form-field appearance="outline" class="folder-select">
          <mat-label>Save to Folder</mat-label>
          <mat-icon matPrefix>folder</mat-icon>
          <mat-select [(ngModel)]="selectedFolder">
            <mat-option value="">Root (No Folder)</mat-option>
            @for (folder of folders(); track folder.id) {
              <mat-option [value]="folder.id">{{ folder.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Drop Zone -->
      <div
        class="drop-zone glass-card"
        [class.drag-over]="isDragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave()"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <input
          #fileInput
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          style="display:none"
          (change)="onFileSelect($event)"
        />
        <div class="drop-content">
          <div class="drop-icon" [class.bounce]="isDragging()">
            <mat-icon>cloud_upload</mat-icon>
          </div>
          <h2>Drag & Drop Files Here</h2>
          <p>or click to browse your files</p>
          <div class="file-types">
            <span class="badge badge-photo">Photos</span>
            <span class="badge badge-pdf">PDFs</span>
            <span class="badge badge-doc">Documents</span>
            <span class="badge badge-other">Others</span>
          </div>
          <p class="file-limit">Maximum file size: 50MB per file</p>
        </div>
      </div>

      <!-- Upload Queue -->
      @if (uploadQueue().length > 0) {
        <div class="queue-card glass-card">
          <div class="queue-header">
            <h3><mat-icon>queue</mat-icon> Upload Queue ({{ uploadQueue().length }})</h3>
              <div style="display:flex;gap:8px;align-items:center">
                <button mat-stroked-button (click)="clearCompleted()">Clear Completed</button>
                <button mat-stroked-button color="primary" (click)="syncLocal()">Sync Local</button>
              </div>
          </div>
          <div class="queue-list">
            @for (task of uploadQueue(); track task.file.name) {
              <div class="queue-item glass-card">
                <!-- Preview -->
                <div class="item-preview">
                  @if (task.file.type.startsWith('image/')) {
                    <img [src]="getPreview(task.file)" [alt]="task.file.name" />
                  } @else {
                    <div class="file-type-icon" [class]="getTypeClass(task.file)">
                      <mat-icon>{{ getFileIcon(task.file) }}</mat-icon>
                    </div>
                  }
                </div>

                <!-- Info -->
                <div class="item-info">
                  <div class="item-name">{{ task.file.name }}</div>
                  <div class="item-size">{{ formatBytes(task.file.size) }}</div>

                  @if (task.status === 'uploading') {
                    <div class="progress-bar" style="margin-top:6px">
                      <div class="progress-fill" [style.width.%]="task.progress"></div>
                    </div>
                    <div class="progress-text">{{ task.progress }}%</div>
                  }
                  @if (task.status === 'error') {
                    <div class="error-text">{{ task.error }}</div>
                  }
                </div>

                <!-- Status -->
                <div class="item-status">
                  @switch (task.status) {
                    @case ('pending') {
                      <div class="status-badge pending"><mat-icon>schedule</mat-icon> Pending</div>
                    }
                    @case ('uploading') {
                      <div class="status-badge uploading"><mat-icon>sync</mat-icon> Uploading</div>
                    }
                    @case ('success') {
                      <div class="status-badge success"><mat-icon>check_circle</mat-icon> Done</div>
                    }
                    @case ('error') {
                      <div class="status-badge error"><mat-icon>error</mat-icon> Failed</div>
                    }
                  }
                </div>
              </div>
            }
          </div>

          <!-- Upload Button -->
          @if (hasPending()) {
            <button class="btn-gradient upload-all-btn" (click)="uploadAll()" [disabled]="isUploading()">
              <mat-icon>rocket_launch</mat-icon>
              Upload All Files
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .upload-page { display: flex; flex-direction: column; gap: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .page-header p { color: var(--text-secondary); font-size: 14px; }

    .options-bar { padding: 16px 20px; }
    .folder-select { width: 300px; }

    .drop-zone {
      min-height: 240px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.3s; border: 2px dashed var(--glass-border);
    }
    .drop-zone:hover { border-color: var(--primary); background: rgba(99,102,241,0.05); }

    .drop-content { text-align: center; padding: 40px 20px; }
    .drop-icon {
      width: 80px; height: 80px; border-radius: 24px; margin: 0 auto 20px;
      background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
      display: flex; align-items: center; justify-content: center;
      border: 1px solid rgba(99,102,241,0.3);
    }
    .drop-icon mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--primary-light); }
    .drop-icon.bounce { animation: bounce 0.5s infinite alternate; }
    @keyframes bounce { to { transform: translateY(-8px); } }
    .drop-content h2 { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .drop-content p { color: var(--text-secondary); font-size: 14px; margin-bottom: 16px; }
    .file-types { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 12px; }
    .file-limit { font-size: 12px; color: var(--text-muted); }

    .queue-card { padding: 24px; }
    .queue-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .queue-header h3 { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .queue-header mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary-light); }

    .queue-list { display: flex; flex-direction: column; gap: 10px; }
    .queue-item { padding: 14px; display: flex; align-items: center; gap: 14px; }
    .item-preview {
      width: 50px; height: 50px; border-radius: 10px; overflow: hidden; flex-shrink: 0;
      background: var(--bg-card);
    }
    .item-preview img { width: 100%; height: 100%; object-fit: cover; }
    .file-type-icon {
      width: 50px; height: 50px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .file-type-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }
    .file-type-photo { background: rgba(16,185,129,0.15); color: #10b981; }
    .file-type-pdf { background: rgba(239,68,68,0.15); color: #ef4444; }
    .file-type-doc { background: rgba(99,102,241,0.15); color: #818cf8; }
    .file-type-other { background: rgba(245,158,11,0.15); color: #f59e0b; }

    .item-info { flex: 1; overflow: hidden; }
    .item-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-size { font-size: 12px; color: var(--text-muted); }
    .progress-text { font-size: 11px; color: var(--primary-light); margin-top: 2px; }
    .error-text { font-size: 12px; color: #ef4444; margin-top: 4px; }

    .item-status { flex-shrink: 0; }
    .status-badge {
      display: flex; align-items: center; gap: 4px; padding: 4px 10px;
      border-radius: 99px; font-size: 12px; font-weight: 500;
    }
    .status-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .status-badge.pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .status-badge.uploading { background: rgba(99,102,241,0.15); color: #818cf8; }
    .status-badge.success { background: rgba(16,185,129,0.15); color: #10b981; }
    .status-badge.error { background: rgba(239,68,68,0.15); color: #ef4444; }

    .upload-all-btn {
      width: 100%; height: 48px; margin-top: 16px; font-size: 15px; font-weight: 600;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
  `],
})
export class UploadComponent {
  private auth = inject(AuthService);
  private storageService = inject(StorageService);
  private localStorage = inject(LocalStorageService);
  private firestoreService = inject(FirestoreService);
  private snackBar = inject(MatSnackBar);

  folders = this.firestoreService.folders;
  uploadQueue = signal<UploadTask[]>([]);
  isDragging = signal(false);
  isUploading = signal(false);
  selectedFolder = '';

  private previews = new Map<string, string>();

  hasPending = () => this.uploadQueue().some((t) => t.status === 'pending');

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave() {
    this.isDragging.set(false);
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    this.addFiles(files);
  }

  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.addFiles(files);
    input.value = '';
  }

  private addFiles(files: File[]) {
    const valid = files.filter((f) => f.size <= 50 * 1024 * 1024);
    const invalid = files.filter((f) => f.size > 50 * 1024 * 1024);
    if (invalid.length) {
      this.snackBar.open(`${invalid.length} file(s) exceed 50MB limit`, 'Dismiss', { duration: 3000 });
    }
    const tasks: UploadTask[] = valid.map((file) => ({
      file,
      progress: 0,
      status: 'pending',
    }));
    this.uploadQueue.update((q) => [...q, ...tasks]);
  }

  async uploadAll() {
    const uid = this.auth.currentUser()?.uid;
    if (!uid) return;
    this.isUploading.set(true);

    const pending = this.uploadQueue().filter((t) => t.status === 'pending');

    for (const task of pending) {
      this.updateTask(task.file.name, { status: 'uploading' });
      await new Promise<void>((resolve) => {
        this.storageService.uploadFile(
          uid,
          task.file,
          (progress) => this.updateTask(task.file.name, { progress }),
          async (url, path) => {
            const fileType = this.storageService.getFileType(task.file);
            try {
              const docRef = await this.firestoreService.addFile({
                userId: uid,
                folderId: this.selectedFolder || null,
                fileName: task.file.name,
                fileType,
                mimeType: task.file.type,
                fileSize: task.file.size,
                downloadUrl: url,
                storagePath: path,
                createdAt: null as any,
              });
              console.log('File metadata saved to Firestore', docRef);
              this.updateTask(task.file.name, { status: 'success', progress: 100 });
            } catch (err: any) {
              console.error('Failed to save file metadata', err);
              const msg = err?.message ?? String(err);
              this.updateTask(task.file.name, { status: 'error', error: msg });
              this.snackBar.open('Failed to save file metadata: ' + msg, 'Dismiss', { duration: 5000 });
            } finally {
              resolve();
            }
          },
          (err) => {
            this.updateTask(task.file.name, { status: 'error', error: err.message });
            resolve();
          },
        );
      });
    }

    this.isUploading.set(false);
    this.snackBar.open('Upload complete!', 'OK', { duration: 3000 });
  }

  async syncLocal() {
    const uid = this.auth.currentUser()?.uid;
    if (!uid) {
      this.snackBar.open('Not signed in', 'Dismiss', { duration: 3000 });
      return;
    }
    this.snackBar.open('Syncing local files...', '', { duration: 2000 });
    try {
      const res = await this.firestoreService.syncLocalFiles(uid);
      this.snackBar.open(`Synced ${res.created} file(s)`, 'OK', { duration: 4000 });
    } catch (err: any) {
      console.error('Sync failed', err);
      this.snackBar.open('Sync failed: ' + (err?.message ?? String(err)), 'Dismiss', { duration: 5000 });
    }
  }

  private updateTask(name: string, partial: Partial<UploadTask>) {
    this.uploadQueue.update((q) =>
      q.map((t) => (t.file.name === name ? { ...t, ...partial } : t)),
    );
  }

  clearCompleted() {
    this.uploadQueue.update((q) => q.filter((t) => t.status !== 'success'));
  }

  getPreview(file: File): string {
    if (!this.previews.has(file.name)) {
      this.previews.set(file.name, URL.createObjectURL(file));
    }
    return this.previews.get(file.name)!;
  }

  getFileIcon(file: File): string {
    if (file.type === 'application/pdf') return 'picture_as_pdf';
    if (file.type.includes('word')) return 'description';
    if (file.type.includes('sheet')) return 'table_chart';
    return 'insert_drive_file';
  }

  getTypeClass(file: File): string {
    if (file.type.startsWith('image/')) return 'file-type-photo';
    if (file.type === 'application/pdf') return 'file-type-pdf';
    if (file.type.includes('document') || file.type.includes('word')) return 'file-type-doc';
    return 'file-type-other';
  }

  formatBytes = (bytes: number) => this.storageService.formatBytes(bytes);
}
