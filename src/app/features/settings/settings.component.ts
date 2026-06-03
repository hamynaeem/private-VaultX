import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { StorageService } from '../../services/storage.service';
import { FirestoreService } from '../../services/firestore.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="settings-page animate-fadeIn">
      <div class="page-header">
        <h1>Settings</h1>
        <p>Manage your profile and preferences</p>
      </div>

      <div class="settings-grid">
        <!-- Profile Card -->
        <div class="settings-card glass-card">
          <div class="card-title"><mat-icon>person</mat-icon> Profile</div>
          <div class="profile-section">
            <div class="avatar-area">
              <div class="big-avatar">
                @if (auth.vaultUser()?.photoURL) {
                  <img [src]="auth.vaultUser()!.photoURL" [alt]="auth.vaultUser()!.fullName" />
                } @else {
                  <mat-icon>person</mat-icon>
                }
              </div>
              <div class="avatar-info">
                <h3>{{ auth.vaultUser()?.fullName ?? 'User' }}</h3>
                <span>{{ auth.vaultUser()?.email }}</span>
                <div class="verified-badge">
                  <mat-icon>verified</mat-icon>
                  Verified Account
                </div>
              </div>
            </div>
            <div class="form-fields">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Full Name</mat-label>
                <input matInput [(ngModel)]="fullName" />
                <mat-icon matPrefix>badge</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email Address</mat-label>
                <input matInput [value]="auth.vaultUser()?.email ?? ''" readonly />
                <mat-icon matPrefix>email</mat-icon>
              </mat-form-field>
              <button class="btn-gradient save-btn" (click)="saveProfile()" [disabled]="saving()">
                @if (saving()) { <mat-spinner diameter="16"></mat-spinner> }
                @else { <mat-icon>save</mat-icon> Save Changes }
              </button>
            </div>
          </div>
        </div>

        <!-- Theme -->
        <div class="settings-card glass-card">
          <div class="card-title"><mat-icon>palette</mat-icon> Appearance</div>
          <div class="theme-section">
            <p>Choose your preferred theme</p>
            <div class="theme-options">
              <div
                class="theme-option"
                [class.selected]="theme.theme() === 'dark'"
                (click)="theme.theme() !== 'dark' && theme.toggle()"
              >
                <div class="theme-preview dark-preview">
                  <div class="preview-sidebar"></div>
                  <div class="preview-content">
                    <div class="preview-block"></div>
                    <div class="preview-block short"></div>
                  </div>
                </div>
                <div class="theme-label">
                  <mat-icon>dark_mode</mat-icon>
                  Dark Mode
                  @if (theme.theme() === 'dark') { <mat-icon class="check">check_circle</mat-icon> }
                </div>
              </div>
              <div
                class="theme-option"
                [class.selected]="theme.theme() === 'light'"
                (click)="theme.theme() !== 'light' && theme.toggle()"
              >
                <div class="theme-preview light-preview">
                  <div class="preview-sidebar"></div>
                  <div class="preview-content">
                    <div class="preview-block"></div>
                    <div class="preview-block short"></div>
                  </div>
                </div>
                <div class="theme-label">
                  <mat-icon>light_mode</mat-icon>
                  Light Mode
                  @if (theme.theme() === 'light') { <mat-icon class="check">check_circle</mat-icon> }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Storage -->
        <div class="settings-card glass-card">
          <div class="card-title"><mat-icon>storage</mat-icon> Storage Usage</div>
          <div class="storage-section">
            <div class="storage-big">
              <div class="storage-numbers">
                <span class="used">{{ storageService.formatBytes(stats().storageUsed) }}</span>
                <span class="of">of</span>
                <span class="total">{{ storageService.formatBytes(stats().storageLimit) }}</span>
              </div>
              <div class="storage-percent">{{ percent() | number:'1.0-1' }}% used</div>
            </div>
            <div class="progress-bar" style="height:10px">
              <div class="progress-fill" [style.width.%]="percent()"></div>
            </div>
            <div class="storage-breakdown">
              <div class="breakdown-row">
                <div class="dot" style="background:#10b981"></div>
                <span>Photos</span>
                <span class="ml-auto">{{ stats().totalPhotos }} files</span>
              </div>
              <div class="breakdown-row">
                <div class="dot" style="background:#6366f1"></div>
                <span>Documents</span>
                <span class="ml-auto">{{ stats().totalDocuments }} files</span>
              </div>
              <div class="breakdown-row">
                <div class="dot" style="background:#ef4444"></div>
                <span>PDFs</span>
                <span class="ml-auto">{{ stats().totalPdfs }} files</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="settings-card glass-card danger-card">
          <div class="card-title"><mat-icon>warning</mat-icon> Danger Zone</div>
          <div class="danger-section">
            <div class="danger-item">
              <div>
                <h4>Sign Out</h4>
                <p>Sign out from all devices</p>
              </div>
              <button class="danger-btn" (click)="auth.logout()">
                <mat-icon>logout</mat-icon> Sign Out
              </button>
            </div>
            <div class="danger-item">
              <div>
                <h4>Delete Account</h4>
                <p>Permanently delete your account and all data</p>
              </div>
              <button class="danger-btn delete">
                <mat-icon>delete_forever</mat-icon> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { display: flex; flex-direction: column; gap: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .page-header p { color: var(--text-secondary); font-size: 14px; }

    .settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .settings-card { padding: 24px; }
    .card-title { font-size: 16px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
    .card-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary-light); }

    /* Profile */
    .profile-section { display: flex; flex-direction: column; gap: 20px; }
    .avatar-area { display: flex; align-items: center; gap: 16px; }
    .big-avatar {
      width: 72px; height: 72px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      border: 3px solid rgba(99,102,241,0.4);
    }
    .big-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .big-avatar mat-icon { font-size: 32px; color: white; }
    .avatar-info h3 { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
    .avatar-info span { font-size: 13px; color: var(--text-secondary); display: block; margin-bottom: 6px; }
    .verified-badge { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #10b981; font-weight: 500; }
    .verified-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .form-fields { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .save-btn { height: 40px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; border-radius: 10px; }

    /* Theme */
    .theme-section p { color: var(--text-secondary); font-size: 13px; margin-bottom: 16px; }
    .theme-options { display: flex; gap: 14px; }
    .theme-option {
      flex: 1; border-radius: 12px; overflow: hidden; cursor: pointer;
      border: 2px solid transparent; transition: all 0.2s;
    }
    .theme-option.selected { border-color: var(--primary); }
    .theme-preview { height: 80px; display: flex; gap: 4px; padding: 8px; }
    .dark-preview { background: #0f0f1a; }
    .light-preview { background: #f0f4ff; }
    .preview-sidebar { width: 24px; background: rgba(99,102,241,0.3); border-radius: 6px; }
    .preview-content { flex: 1; display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
    .preview-block { height: 12px; border-radius: 4px; background: rgba(255,255,255,0.15); }
    .light-preview .preview-block { background: rgba(0,0,0,0.1); }
    .preview-block.short { width: 60%; }
    .theme-label { display: flex; align-items: center; gap: 8px; padding: 10px 12px; font-size: 13px; font-weight: 500; }
    .theme-label .check { font-size: 16px; width: 16px; height: 16px; color: var(--primary-light); margin-left: auto; }

    /* Storage */
    .storage-section { display: flex; flex-direction: column; gap: 16px; }
    .storage-big { display: flex; flex-direction: column; gap: 4px; }
    .storage-numbers { display: flex; align-items: baseline; gap: 6px; }
    .used { font-size: 28px; font-weight: 800; color: var(--primary-light); }
    .of { color: var(--text-muted); font-size: 14px; }
    .total { font-size: 18px; font-weight: 600; color: var(--text-secondary); }
    .storage-percent { font-size: 13px; color: var(--text-muted); }
    .storage-breakdown { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
    .breakdown-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .ml-auto { margin-left: auto; color: var(--text-muted); }

    /* Danger */
    .danger-card { border: 1px solid rgba(239,68,68,0.2); }
    .danger-card .card-title { color: #ef4444; }
    .danger-card .card-title mat-icon { color: #ef4444; }
    .danger-section { display: flex; flex-direction: column; gap: 0; }
    .danger-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid rgba(239,68,68,0.1); }
    .danger-item:last-child { border-bottom: none; }
    .danger-item h4 { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
    .danger-item p { font-size: 12px; color: var(--text-muted); }
    .danger-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
      background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
      color: #ef4444; cursor: pointer; transition: all 0.2s; white-space: nowrap;
    }
    .danger-btn:hover { background: rgba(239,68,68,0.2); }
    .danger-btn.delete { background: #ef4444; color: white; border-color: #ef4444; }
    .danger-btn.delete:hover { background: #dc2626; }
    .danger-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    @media (max-width: 768px) {
      .settings-grid { grid-template-columns: 1fr; }
      .theme-options { flex-direction: column; }
    }
    ::ng-deep .mat-mdc-text-field-wrapper { background: rgba(255,255,255,0.03) !important; }
  `],
})
export class SettingsComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  storageService = inject(StorageService);
  private firestoreService = inject(FirestoreService);
  private snackBar = inject(MatSnackBar);

  saving = signal(false);
  fullName = this.auth.vaultUser()?.fullName ?? '';

  stats = () => this.firestoreService.getStats(this.auth.currentUser()?.uid ?? '');
  percent = () => {
    const s = this.stats();
    return (s.storageUsed / s.storageLimit) * 100;
  };

  async saveProfile() {
    if (!this.fullName.trim()) return;
    this.saving.set(true);
    try {
      await this.auth.updateUserProfile({ fullName: this.fullName.trim() });
      this.snackBar.open('Profile updated', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to update profile', 'Dismiss', { duration: 3000 });
    } finally {
      this.saving.set(false);
    }
  }
}
