import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';
import { FirestoreService } from '../../services/firestore.service';
import { StorageService } from '../../services/storage.service';
import { VaultFile } from '../../models/vault.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  template: `
    <div class="dashboard animate-fadeIn">
      <!-- Welcome Banner -->
      <div class="welcome-card glass-card">
        <div class="welcome-content">
          <div>
            <h1>Welcome back, <span class="gradient-text">{{ firstName() }}</span> 👋</h1>
            <p>Your files are safe and encrypted. Here's what's happening in your vault today.</p>
          </div>
          <a routerLink="/upload" class="btn-gradient upload-cta">
            <mat-icon>cloud_upload</mat-icon>
            Upload Files
          </a>
        </div>
        <div class="welcome-illustration">
          <mat-icon>shield</mat-icon>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        @for (stat of statsCards(); track stat.label) {
          <div class="stat-card glass-card" [style.--accent-color]="stat.color">
            <div class="stat-icon" [style.background]="stat.bg">
              <mat-icon [style.color]="stat.color">{{ stat.icon }}</mat-icon>
            </div>
            <div class="stat-info">
              <span class="stat-value">{{ stat.value }}</span>
              <span class="stat-label">{{ stat.label }}</span>
            </div>
            <div class="stat-glow" [style.background]="stat.color"></div>
          </div>
        }
      </div>

      <!-- Storage + Recent -->
      <div class="bottom-grid">
        <!-- Storage Card -->
        <div class="storage-card glass-card">
          <div class="card-header">
            <h3><mat-icon>storage</mat-icon> Storage Usage</h3>
          </div>
          <div class="storage-visual">
            <div class="storage-circle">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="url(#grad)" stroke-width="10"
                  [attr.stroke-dasharray]="circumference()"
                  [attr.stroke-dashoffset]="dashOffset()"
                  stroke-linecap="round"
                  transform="rotate(-90 50 50)"
                />
                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#6366f1"/>
                    <stop offset="100%" stop-color="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="circle-label">
                <span class="circle-percent">{{ storagePercent() | number:'1.0-0' }}%</span>
                <span>Used</span>
              </div>
            </div>
            <div class="storage-breakdown">
              @for (item of storageBreakdown(); track item.label) {
                <div class="breakdown-item">
                  <div class="breakdown-dot" [style.background]="item.color"></div>
                  <span class="breakdown-label">{{ item.label }}</span>
                  <span class="breakdown-value">{{ item.value }}</span>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions glass-card">
          <div class="card-header"><h3><mat-icon>bolt</mat-icon> Quick Actions</h3></div>
          <div class="actions-grid">
            @for (action of quickActions; track action.label) {
              <a [routerLink]="action.route" class="action-item glass-card">
                <div class="action-icon" [style.background]="action.bg">
                  <mat-icon [style.color]="action.color">{{ action.icon }}</mat-icon>
                </div>
                <span>{{ action.label }}</span>
              </a>
            }
          </div>
        </div>
      </div>

      <!-- Recent Uploads -->
      <div class="recent-card glass-card">
        <div class="card-header">
          <h3><mat-icon>history</mat-icon> Recent Uploads</h3>
          <a routerLink="/documents" class="view-all">View All</a>
        </div>
        @if (loading()) {
          <div class="skeleton-list">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="skeleton-row">
                <div class="skeleton" style="width:40px;height:40px;border-radius:10px"></div>
                <div class="skeleton-text">
                  <div class="skeleton" style="width:200px;height:14px"></div>
                  <div class="skeleton" style="width:100px;height:12px"></div>
                </div>
                <div class="skeleton" style="width:60px;height:12px"></div>
              </div>
            }
          </div>
        } @else if (recentFiles().length === 0) {
          <div class="empty-state">
            <mat-icon>cloud_upload</mat-icon>
            <p>No files yet. Upload your first file!</p>
            <a routerLink="/upload" class="btn-gradient">Upload Now</a>
          </div>
        } @else {
          <div class="file-list">
            @for (file of recentFiles(); track file.id) {
              <div class="file-row">
                <div class="file-icon" [class]="'file-icon-' + file.fileType">
                  <mat-icon>{{ getFileIcon(file.fileType) }}</mat-icon>
                </div>
                <div class="file-info">
                  <span class="file-name">{{ file.fileName }}</span>
                  <span class="file-meta">{{ storageService.formatBytes(file.fileSize) }}</span>
                </div>
                <div class="file-badge">
                  <span class="badge" [class]="'badge-' + file.fileType">{{ file.fileType }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; gap: 20px; }

    /* Welcome */
    .welcome-card {
      padding: 28px 32px; background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1));
      border: 1px solid rgba(99,102,241,0.3); overflow: hidden; position: relative;
    }
    .welcome-content { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
    .welcome-content h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    .welcome-content p { color: var(--text-secondary); font-size: 14px; }
    .upload-cta {
      display: flex; align-items: center; gap: 8px; padding: 12px 24px;
      border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; white-space: nowrap;
    }
    .welcome-illustration {
      position: absolute; right: -20px; top: -20px; opacity: 0.06;
    }
    .welcome-illustration mat-icon { font-size: 160px; width: 160px; height: 160px; color: white; }

    /* Stats */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .stat-card {
      padding: 20px; position: relative; overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
    .stat-icon {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; margin-bottom: 12px;
    }
    .stat-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .stat-value { font-size: 28px; font-weight: 800; display: block; }
    .stat-label { font-size: 13px; color: var(--text-secondary); display: block; margin-top: 2px; }
    .stat-glow {
      position: absolute; bottom: -20px; right: -20px;
      width: 80px; height: 80px; border-radius: 50%; opacity: 0.08; filter: blur(20px);
    }

    /* Bottom Grid */
    .bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .storage-card, .quick-actions { padding: 24px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .card-header h3 { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .card-header mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary-light); }
    .view-all { color: var(--primary-light); text-decoration: none; font-size: 13px; font-weight: 500; }

    .storage-visual { display: flex; align-items: center; gap: 24px; }
    .storage-circle { position: relative; width: 140px; height: 140px; flex-shrink: 0; }
    .storage-circle svg { width: 100%; height: 100%; }
    .circle-label {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .circle-percent { font-size: 24px; font-weight: 800; }
    .circle-label span:last-child { font-size: 12px; color: var(--text-muted); }
    .storage-breakdown { display: flex; flex-direction: column; gap: 12px; flex: 1; }
    .breakdown-item { display: flex; align-items: center; gap: 8px; }
    .breakdown-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .breakdown-label { font-size: 13px; color: var(--text-secondary); flex: 1; }
    .breakdown-value { font-size: 13px; font-weight: 600; }

    .actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .action-item {
      padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 10px;
      text-decoration: none; color: var(--text-primary); text-align: center;
      font-size: 13px; font-weight: 500; border-radius: 12px; transition: all 0.2s;
    }
    .action-item:hover { transform: translateY(-2px); }
    .action-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .action-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }

    /* Recent */
    .recent-card { padding: 24px; }
    .file-list { display: flex; flex-direction: column; gap: 2px; }
    .file-row {
      display: flex; align-items: center; gap: 14px; padding: 12px;
      border-radius: 10px; transition: background 0.2s;
    }
    .file-row:hover { background: var(--bg-card-hover); }
    .file-icon {
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .file-icon-photo { background: rgba(16,185,129,0.15); color: #10b981; }
    .file-icon-pdf { background: rgba(239,68,68,0.15); color: #ef4444; }
    .file-icon-document { background: rgba(99,102,241,0.15); color: #818cf8; }
    .file-icon-other { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .file-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .file-info { flex: 1; overflow: hidden; }
    .file-name { font-size: 14px; font-weight: 500; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file-meta { font-size: 12px; color: var(--text-muted); }
    .file-badge { flex-shrink: 0; }

    .empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; }
    .empty-state p { margin-bottom: 16px; }

    .skeleton-list { display: flex; flex-direction: column; gap: 12px; }
    .skeleton-row { display: flex; align-items: center; gap: 14px; padding: 8px 0; }
    .skeleton-text { flex: 1; display: flex; flex-direction: column; gap: 8px; }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .bottom-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .welcome-card { padding: 20px; }
      .welcome-content h1 { font-size: 18px; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  storageService = inject(StorageService);

  loading = signal(true);
  recentFiles = signal<VaultFile[]>([]);

  firstName = computed(() => {
    const name = this.auth.vaultUser()?.fullName ?? this.auth.currentUser()?.displayName ?? 'User';
    return name.split(' ')[0];
  });

  private stats = computed(() =>
    this.firestoreService.getStats(this.auth.currentUser()?.uid ?? ''),
  );

  circumference = () => 2 * Math.PI * 42;
  storagePercent = computed(() => {
    const s = this.stats();
    return (s.storageUsed / s.storageLimit) * 100;
  });
  dashOffset = computed(() => {
    const c = this.circumference();
    return c - (this.storagePercent() / 100) * c;
  });

  statsCards = computed(() => {
    const s = this.stats();
    return [
      { label: 'Total Files', value: s.totalFiles, icon: 'folder', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
      { label: 'Photos', value: s.totalPhotos, icon: 'photo_library', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
      { label: 'Documents', value: s.totalDocuments + s.totalPdfs, icon: 'description', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
      { label: 'Storage Used', value: this.storageService.formatBytes(s.storageUsed), icon: 'cloud', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    ];
  });

  storageBreakdown = computed(() => {
    const s = this.stats();
    return [
      { label: 'Photos', value: this.storageService.formatBytes(s.storageUsed * 0.6), color: '#10b981' },
      { label: 'Documents', value: this.storageService.formatBytes(s.storageUsed * 0.3), color: '#6366f1' },
      { label: 'Other', value: this.storageService.formatBytes(s.storageUsed * 0.1), color: '#f59e0b' },
    ];
  });

  quickActions = [
    { label: 'Upload Files', icon: 'cloud_upload', route: '/upload', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
    { label: 'My Photos', icon: 'photo_library', route: '/gallery', color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    { label: 'Documents', icon: 'folder_open', route: '/documents', color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)' },
    { label: 'Security', icon: 'security', route: '/security', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  ];

  async ngOnInit() {
    const uid = this.auth.currentUser()?.uid;
    if (uid) {
      this.recentFiles.set(await this.firestoreService.getRecentFiles(uid, 5));
    }
    this.loading.set(false);
  }

  getFileIcon(type: string): string {
    switch (type) {
      case 'photo': return 'image';
      case 'pdf': return 'picture_as_pdf';
      case 'document': return 'description';
      default: return 'insert_drive_file';
    }
  }
}
