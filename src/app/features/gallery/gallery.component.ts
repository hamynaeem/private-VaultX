import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { FirestoreService } from '../../services/firestore.service';
import { StorageService } from '../../services/storage.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { VaultFile } from '../../models/vault.models';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="gallery-page animate-fadeIn">
      <div class="page-header">
        <h1>Photo Gallery</h1>
        <p>{{ photos().length }} photos in your secure vault</p>
      </div>

      <!-- Controls -->
      <div class="controls glass-card">
        <div class="search-box">
          <mat-icon>search</mat-icon>
          <input [(ngModel)]="search" placeholder="Search photos..." class="search-input" />
        </div>
        <div class="control-right">
          <mat-form-field appearance="outline" class="sort-select">
            <mat-label>Sort</mat-label>
            <mat-select [(ngModel)]="sortBy">
              <mat-option value="newest">Newest First</mat-option>
              <mat-option value="oldest">Oldest First</mat-option>
              <mat-option value="name">Name</mat-option>
              <mat-option value="size">Size</mat-option>
            </mat-select>
          </mat-form-field>
          <div class="view-toggle">
            <button [class.active]="viewMode() === 'grid'" (click)="viewMode.set('grid')">
              <mat-icon>grid_view</mat-icon>
            </button>
            <button [class.active]="viewMode() === 'large'" (click)="viewMode.set('large')">
              <mat-icon>view_module</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Photo Grid -->
      @if (filtered().length === 0) {
        <div class="empty-state glass-card">
          <mat-icon>photo_library</mat-icon>
          <h3>No Photos Found</h3>
          <p>Upload photos to see them here</p>
        </div>
      } @else {
        <div class="photo-grid" [class.large-grid]="viewMode() === 'large'">
          @for (photo of filtered(); track photo.id) {
            <div class="photo-card" (click)="openPhoto(photo)">
              <div class="photo-thumb">
                <img [src]="getSrc(photo) || photo.downloadUrl" [alt]="photo.fileName" loading="lazy" />
                <div class="photo-overlay">
                  <div class="overlay-actions">
                    <button (click)="downloadFile(photo, $event)">
                      <mat-icon>download</mat-icon>
                    </button>
                    <button class="danger" (click)="deletePhoto(photo, $event)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
              <div class="photo-info">
                <span class="photo-name">{{ photo.fileName }}</span>
                <span class="photo-size">{{ storage.formatBytes(photo.fileSize) }}</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Lightbox Modal -->
      @if (activePhoto()) {
        <div class="lightbox" (click)="activePhoto.set(null)">
          <div class="lightbox-content" (click)="$event.stopPropagation()">
            <button class="lightbox-close" (click)="activePhoto.set(null)">
              <mat-icon>close</mat-icon>
            </button>
            <img [src]="getSrc(activePhoto()!) || activePhoto()!.downloadUrl" [alt]="activePhoto()!.fileName" />
            <div class="lightbox-info">
              <span>{{ activePhoto()!.fileName }}</span>
              <span>{{ storage.formatBytes(activePhoto()!.fileSize) }}</span>
              <button class="btn-gradient" (click)="downloadFile(activePhoto()!)">
                <mat-icon>download</mat-icon> Download
              </button>
            </div>
          </div>
          <button class="lightbox-nav prev" (click)="navigate(-1, $event)">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button class="lightbox-nav next" (click)="navigate(1, $event)">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .gallery-page { display: flex; flex-direction: column; gap: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .page-header p { color: var(--text-secondary); font-size: 14px; }

    .controls {
      padding: 14px 20px; display: flex; align-items: center;
      justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .search-box {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
      border-radius: 10px; padding: 8px 14px; flex: 1; max-width: 360px;
    }
    .search-box mat-icon { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }
    .search-input {
      background: none; border: none; outline: none; color: var(--text-primary);
      font-size: 14px; width: 100%;
    }
    .control-right { display: flex; align-items: center; gap: 12px; }
    .sort-select { width: 150px; }
    .view-toggle { display: flex; border: 1px solid var(--glass-border); border-radius: 8px; overflow: hidden; }
    .view-toggle button {
      padding: 7px 10px; background: none; border: none; color: var(--text-muted); cursor: pointer;
      transition: all 0.2s; display: flex; align-items: center;
    }
    .view-toggle button.active { background: var(--primary); color: white; }
    .view-toggle mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .photo-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px;
    }
    .photo-grid.large-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }

    .photo-card {
      border-radius: 12px; overflow: hidden;
      background: var(--bg-card); border: 1px solid var(--glass-border);
      cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
    }
    .photo-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
    .photo-thumb { position: relative; aspect-ratio: 1; overflow: hidden; }
    .photo-thumb img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
    .photo-card:hover .photo-thumb img { transform: scale(1.05); }
    .photo-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.2s;
    }
    .photo-card:hover .photo-overlay { opacity: 1; }
    .overlay-actions { display: flex; gap: 8px; }
    .overlay-actions button {
      width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3); color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .overlay-actions button:hover { background: rgba(255,255,255,0.25); }
    .overlay-actions button.danger:hover { background: rgba(239,68,68,0.6); }
    .overlay-actions mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .photo-info { padding: 10px 12px; }
    .photo-name { font-size: 12px; font-weight: 500; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .photo-size { font-size: 11px; color: var(--text-muted); }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5; }
    .empty-state h3 { font-size: 18px; margin-bottom: 8px; color: var(--text-secondary); }

    /* Lightbox */
    .lightbox {
      position: fixed; inset: 0; background: rgba(0,0,0,0.92);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
    }
    .lightbox-content {
      position: relative; max-width: 90vw; max-height: 90vh;
      display: flex; flex-direction: column; align-items: center;
    }
    .lightbox-content img { max-width: 80vw; max-height: 75vh; object-fit: contain; border-radius: 12px; }
    .lightbox-close {
      position: absolute; top: -50px; right: 0; width: 40px; height: 40px;
      border-radius: 50%; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.2);
      color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .lightbox-info {
      display: flex; align-items: center; gap: 16px; margin-top: 16px;
      color: rgba(255,255,255,0.8); font-size: 14px;
    }
    .lightbox-info .btn-gradient {
      display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px;
    }
    .lightbox-nav {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2); color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .lightbox-nav.prev { left: -80px; }
    .lightbox-nav.next { right: -80px; }
    .lightbox-nav:hover { background: rgba(255,255,255,0.2); }

    @media (max-width: 640px) {
      .photo-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
      .lightbox-nav { display: none; }
    }
  `],
})
export class GalleryComponent {
  private auth = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  storage = inject(StorageService);
  private localStorage = inject(LocalStorageService);
  private snackBar = inject(MatSnackBar);

  photos = computed(() =>
    this.firestoreService.files().filter((f) => f.fileType === 'photo'),
  );

  search = '';
  sortBy = 'newest';
  viewMode = signal<'grid' | 'large'>('grid');
  activePhoto = signal<VaultFile | null>(null);

  filtered = computed(() => {
    let list = this.photos();
    if (this.search) {
      list = list.filter((f) => f.fileName.toLowerCase().includes(this.search.toLowerCase()));
    }
    return list;
  });

  openPhoto(photo: VaultFile) {
    this.activePhoto.set(photo);
    // trigger preview fetch if needed
    if (photo.downloadUrl?.startsWith('local:')) this.getSrc(photo);
  }

  navigate(dir: -1 | 1, e: Event) {
    e.stopPropagation();
    const list = this.filtered();
    const idx = list.findIndex((f) => f.id === this.activePhoto()?.id);
    const next = (idx + dir + list.length) % list.length;
    this.activePhoto.set(list[next]);
    if (this.activePhoto()?.downloadUrl?.startsWith('local:')) this.getSrc(this.activePhoto()!);
  }

  downloadFile(photo: VaultFile, e?: Event) {
    e?.stopPropagation();
    if (photo.downloadUrl?.startsWith('local:')) {
      const fileId = photo.downloadUrl.replace('local:', '');
      this.localStorage.downloadFileAsBlob(fileId).then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = photo.fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }).catch(() => this.snackBar.open('Download failed', 'Dismiss', { duration: 3000 }));
      return;
    }

    const a = document.createElement('a');
    a.href = photo.downloadUrl;
    a.download = photo.fileName;
    a.target = '_blank';
    a.click();
  }

  async deletePhoto(photo: VaultFile, e: Event) {
    e.stopPropagation();
    if (!confirm(`Delete "${photo.fileName}"?`)) return;
    try {
      if (photo.storagePath?.startsWith('local:')) {
        const fileId = photo.storagePath.replace(/^local:/, '');
        await this.localStorage.deleteFile(fileId);
      } else {
        await this.storage.deleteFile(photo.storagePath);
      }
      await this.firestoreService.deleteFile(photo.id);
      this.snackBar.open('Photo deleted', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to delete', 'Dismiss', { duration: 3000 });
    }
  }

  // Preview cache
  private previewCache = new Map<string, string>();
  private fetching = new Set<string>();

  getSrc(photo: VaultFile): string {
    if (!photo.downloadUrl) return '';
    if (!photo.downloadUrl.startsWith('local:')) return photo.downloadUrl;
    const id = photo.downloadUrl.replace('local:', '');
    if (this.previewCache.has(id)) return this.previewCache.get(id)!;
    if (this.fetching.has(id)) return '';
    this.fetching.add(id);
    this.localStorage.downloadFileAsBlob(id).then((blob) => {
      const url = URL.createObjectURL(blob);
      this.previewCache.set(id, url);
      this.fetching.delete(id);
    }).catch(() => {
      this.fetching.delete(id);
    });
    return '';
  }
}
