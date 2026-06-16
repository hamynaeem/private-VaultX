import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FirestoreService } from '../../services/firestore.service';
import { StorageService } from '../../services/storage.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { VaultFile } from '../../models/vault.models';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="docs-page animate-fadeIn">
      <div class="page-header">
        <h1>Documents Vault</h1>
        <p>{{ docs().length }} documents stored securely</p>
      </div>

      <!-- Controls -->
      <div class="controls glass-card">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input [(ngModel)]="search" placeholder="Search documents..." class="search-input" />
        </div>
        <div class="control-right">
          <mat-form-field appearance="outline" class="filter-select">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="typeFilter">
              <mat-option value="all">All</mat-option>
              <mat-option value="pdf">PDFs</mat-option>
              <mat-option value="document">Documents</mat-option>
              <mat-option value="other">Other</mat-option>
            </mat-select>
          </mat-form-field>
          <div class="view-toggle">
            <button [class.active]="viewMode() === 'list'" (click)="viewMode.set('list')">
              <mat-icon>view_list</mat-icon>
            </button>
            <button [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')">
              <mat-icon>grid_view</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Documents -->
      @if (filtered().length === 0) {
        <div class="empty-state glass-card">
          <mat-icon>folder_open</mat-icon>
          <h3>No Documents Found</h3>
          <p>Upload documents to see them here</p>
        </div>
      } @else if (viewMode() === 'list') {
        <div class="doc-list glass-card">
          <div class="list-header">
            <span>Name</span>
            <span>Type</span>
            <span>Size</span>
            <span>Actions</span>
          </div>
          @for (doc of filtered(); track doc.id) {
            <div class="list-row">
              <div class="doc-name">
                <div class="doc-icon" [class]="'type-' + doc.fileType">
                  <mat-icon>{{ getIcon(doc.fileType) }}</mat-icon>
                </div>
                <span>{{ doc.fileName }}</span>
              </div>
              <span class="badge" [class]="'badge-' + doc.fileType">{{ doc.fileType }}</span>
              <span class="doc-size">{{ storage.formatBytes(doc.fileSize) }}</span>
              <div class="row-actions">
                <button class="icon-action" (click)="viewOnline(doc)" matTooltip="View">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button class="icon-action" (click)="download(doc)" matTooltip="Download">
                  <mat-icon>download</mat-icon>
                </button>
                <button class="icon-action danger" (click)="deleteDoc(doc)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="doc-grid">
          @for (doc of filtered(); track doc.id) {
            <div class="doc-card glass-card">
              <div class="card-icon" [class]="'type-' + doc.fileType">
                <mat-icon>{{ getIcon(doc.fileType) }}</mat-icon>
              </div>
              <div class="card-name">{{ doc.fileName }}</div>
              <div class="card-meta">
                <span class="badge" [class]="'badge-' + doc.fileType">{{ doc.fileType }}</span>
                <span class="doc-size">{{ storage.formatBytes(doc.fileSize) }}</span>
              </div>
              <div class="card-actions">
                <button class="icon-action" (click)="viewOnline(doc)" matTooltip="View">
                  <mat-icon>visibility</mat-icon>
                </button>
                <button class="icon-action" (click)="download(doc)" matTooltip="Download">
                  <mat-icon>download</mat-icon>
                </button>
                <button class="icon-action danger" (click)="deleteDoc(doc)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .docs-page { display: flex; flex-direction: column; gap: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .page-header p { color: var(--text-secondary); font-size: 14px; }

    .controls { padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .search-box { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 10px; padding: 8px 14px; flex: 1; max-width: 360px; }
    .search-box mat-icon { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }
    .search-input { background: none; border: none; outline: none; color: var(--text-primary); font-size: 14px; width: 100%; }
    .control-right { display: flex; align-items: center; gap: 12px; }
    .filter-select { width: 140px; }
    .view-toggle { display: flex; border: 1px solid var(--glass-border); border-radius: 8px; overflow: hidden; }
    .view-toggle button { padding: 7px 10px; background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; }
    .view-toggle button.active { background: var(--primary); color: white; }
    .view-toggle mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* List View */
    .doc-list { overflow: hidden; }
    .list-header { display: grid; grid-template-columns: 1fr 100px 80px 100px; gap: 16px; padding: 12px 20px; border-bottom: 1px solid var(--glass-border); font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .list-row { display: grid; grid-template-columns: 1fr 100px 80px 100px; gap: 16px; padding: 12px 20px; align-items: center; transition: background 0.2s; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .list-row:last-child { border-bottom: none; }
    .list-row:hover { background: var(--bg-card-hover); }
    .doc-name { display: flex; align-items: center; gap: 12px; overflow: hidden; }
    .doc-name span { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .doc-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .doc-icon mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .doc-size { font-size: 13px; color: var(--text-muted); }
    .row-actions { display: flex; gap: 4px; }
    .icon-action { width: 32px; height: 32px; border-radius: 8px; background: none; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .icon-action:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .icon-action.danger:hover { background: rgba(239,68,68,0.15); color: #ef4444; }
    .icon-action mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Type colors */
    .type-pdf { background: rgba(239,68,68,0.15); color: #ef4444; }
    .type-document { background: rgba(99,102,241,0.15); color: #818cf8; }
    .type-other { background: rgba(245,158,11,0.15); color: #f59e0b; }

    /* Grid View */
    .doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
    .doc-card { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; cursor: default; }
    .card-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
    .card-icon mat-icon { font-size: 28px; width: 28px; height: 28px; }
    .card-name { font-size: 13px; font-weight: 500; word-break: break-word; }
    .card-meta { display: flex; gap: 8px; align-items: center; }
    .card-actions { display: flex; gap: 8px; }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 18px; margin-bottom: 8px; color: var(--text-secondary); }
  `],
})
export class DocumentsComponent {
  private firestoreService = inject(FirestoreService);
  storage = inject(StorageService);
  private localStorage = inject(LocalStorageService);
  private snackBar = inject(MatSnackBar);

  docs = computed(() =>
    this.firestoreService.files().filter((f) => f.fileType !== 'photo'),
  );

  search = '';
  typeFilter = 'all';
  viewMode = signal<'list' | 'grid'>('list');

  filtered = computed(() => {
    let list = this.docs();
    if (this.search) {
      list = list.filter((f) => f.fileName.toLowerCase().includes(this.search.toLowerCase()));
    }
    if (this.typeFilter !== 'all') {
      list = list.filter((f) => f.fileType === this.typeFilter);
    }
    return list;
  });

  getIcon(type: string): string {
    switch (type) {
      case 'pdf': return 'picture_as_pdf';
      case 'document': return 'description';
      default: return 'insert_drive_file';
    }
  }

  download(file: VaultFile) {
    if (file.downloadUrl?.startsWith('local:')) {
      const fileId = file.downloadUrl.replace('local:', '');
      this.localStorage.downloadFileAsBlob(fileId).then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }).catch(() => this.snackBar.open('Download failed', 'Dismiss', { duration: 3000 }));
      return;
    }

    const a = document.createElement('a');
    a.href = file.downloadUrl;
    a.download = file.fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  viewOnline(file: VaultFile) {
    if (file.downloadUrl?.startsWith('local:')) {
      const fileId = file.downloadUrl.replace('local:', '');
      this.localStorage.downloadFileAsBlob(fileId).then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }).catch(() => this.snackBar.open('Failed to open file', 'Dismiss', { duration: 3000 }));
      return;
    }

    window.open(file.downloadUrl, '_blank');
  }

  async deleteDoc(file: VaultFile) {
    if (!confirm(`Delete "${file.fileName}"?`)) return;
    try {
      if (file.storagePath?.startsWith('local:')) {
        const fileId = file.storagePath.replace(/^local:/, '');
        await this.localStorage.deleteFile(fileId);
      } else {
        await this.storage.deleteFile(file.storagePath);
      }
      await this.firestoreService.deleteFile(file.id);
      this.snackBar.open('File deleted', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to delete', 'Dismiss', { duration: 3000 });
    }
  }
}
