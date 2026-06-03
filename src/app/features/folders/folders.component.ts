import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../services/auth.service';
import { FirestoreService } from '../../services/firestore.service';
import { VaultFolder } from '../../models/vault.models';

@Component({
  selector: 'app-folders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <div class="folders-page animate-fadeIn">
      <div class="page-header-row">
        <div>
          <h1>Folder Management</h1>
          <p>Organize your vault with custom folders</p>
        </div>
        <button class="btn-gradient create-btn" (click)="showCreate.set(true)">
          <mat-icon>create_new_folder</mat-icon>
          New Folder
        </button>
      </div>

      <!-- Create Folder Dialog -->
      @if (showCreate()) {
        <div class="modal-overlay" (click)="showCreate.set(false)">
          <div class="modal glass-card" (click)="$event.stopPropagation()">
            <h3>Create New Folder</h3>
            <div class="modal-field">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Folder Name</mat-label>
                <input matInput [(ngModel)]="newFolderName" placeholder="My Documents" (keyup.enter)="createFolder()" />
                <mat-icon matPrefix>folder</mat-icon>
              </mat-form-field>
            </div>
            <div class="modal-actions">
              <button mat-stroked-button (click)="showCreate.set(false)">Cancel</button>
              <button class="btn-gradient" (click)="createFolder()" [disabled]="!newFolderName.trim()">
                Create
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Rename Dialog -->
      @if (renaming()) {
        <div class="modal-overlay" (click)="renaming.set(null)">
          <div class="modal glass-card" (click)="$event.stopPropagation()">
            <h3>Rename Folder</h3>
            <div class="modal-field">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>New Name</mat-label>
                <input matInput [(ngModel)]="renameName" (keyup.enter)="confirmRename()" />
              </mat-form-field>
            </div>
            <div class="modal-actions">
              <button mat-stroked-button (click)="renaming.set(null)">Cancel</button>
              <button class="btn-gradient" (click)="confirmRename()">Rename</button>
            </div>
          </div>
        </div>
      }

      <!-- Folders Grid -->
      @if (folders().length === 0) {
        <div class="empty-state glass-card">
          <mat-icon>folder_open</mat-icon>
          <h3>No Folders Yet</h3>
          <p>Create folders to organize your files</p>
        </div>
      } @else {
        <div class="folders-grid">
          @for (folder of folders(); track folder.id) {
            <div class="folder-card glass-card">
              <div class="folder-header">
                <div class="folder-icon">
                  <mat-icon>folder</mat-icon>
                </div>
                <div class="folder-menu">
                  <button class="icon-btn" (click)="startRename(folder)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button class="icon-btn danger" (click)="deleteFolder(folder)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
              <div class="folder-name">{{ folder.name }}</div>
              <div class="folder-stats">
                <span>{{ getFileCount(folder.id) }} files</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .folders-page { display: flex; flex-direction: column; gap: 20px; }
    .page-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .page-header-row h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .page-header-row p { color: var(--text-secondary); font-size: 14px; }
    .create-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; }

    .folders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
    .folder-card { padding: 20px; transition: transform 0.2s; }
    .folder-card:hover { transform: translateY(-3px); }
    .folder-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .folder-icon { width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1)); display: flex; align-items: center; justify-content: center; }
    .folder-icon mat-icon { font-size: 28px; width: 28px; height: 28px; color: #f59e0b; }
    .folder-menu { display: flex; gap: 4px; }
    .icon-btn { width: 30px; height: 30px; border-radius: 8px; background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
    .icon-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .icon-btn.danger:hover { background: rgba(239,68,68,0.15); color: #ef4444; }
    .icon-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .folder-name { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .folder-stats { font-size: 12px; color: var(--text-muted); }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; opacity: 0.5; color: #f59e0b; }
    .empty-state h3 { font-size: 18px; margin-bottom: 8px; color: var(--text-secondary); }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 200; display: flex; align-items: center; justify-content: center; }
    .modal { padding: 28px; width: 400px; max-width: 90vw; }
    .modal h3 { font-size: 18px; font-weight: 700; margin-bottom: 20px; }
    .modal-field { margin-bottom: 12px; }
    .full-width { width: 100%; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
    .modal-actions .btn-gradient { padding: 8px 20px; border-radius: 8px; }
  `],
})
export class FoldersComponent {
  private auth = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private snackBar = inject(MatSnackBar);

  folders = this.firestoreService.folders;
  showCreate = signal(false);
  renaming = signal<VaultFolder | null>(null);
  newFolderName = '';
  renameName = '';

  getFileCount(folderId: string): number {
    return this.firestoreService.files().filter((f) => f.folderId === folderId).length;
  }

  async createFolder() {
    const name = this.newFolderName.trim();
    if (!name) return;
    const uid = this.auth.currentUser()?.uid;
    if (!uid) return;
    try {
      await this.firestoreService.addFolder({ userId: uid, name, createdAt: null as any });
      this.newFolderName = '';
      this.showCreate.set(false);
      this.snackBar.open('Folder created', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to create folder', 'Dismiss', { duration: 3000 });
    }
  }

  startRename(folder: VaultFolder) {
    this.renaming.set(folder);
    this.renameName = folder.name;
  }

  async confirmRename() {
    const folder = this.renaming();
    if (!folder || !this.renameName.trim()) return;
    try {
      await this.firestoreService.updateFolder(folder.id, { name: this.renameName.trim() });
      this.renaming.set(null);
      this.snackBar.open('Folder renamed', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to rename', 'Dismiss', { duration: 3000 });
    }
  }

  async deleteFolder(folder: VaultFolder) {
    if (!confirm(`Delete folder "${folder.name}"? Files inside will not be deleted.`)) return;
    try {
      await this.firestoreService.deleteFolder(folder.id);
      this.snackBar.open('Folder deleted', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to delete', 'Dismiss', { duration: 3000 });
    }
  }
}
