import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { FirestoreService } from '../services/firestore.service';
import { StorageService } from '../services/storage.service';
import { effect } from '@angular/core';
import { GoogleAuthService } from '../services/google-auth.service';
import { LocalStorageService } from '../services/local-storage.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
  ],
  template: `
    <div class="shell" [class.sidebar-open]="sidebarOpen()">
      <!-- Sidebar -->
      <aside class="sidebar glass-card">
        <!-- Logo -->
        <div class="sidebar-logo">
          <div class="logo-icon">
            <mat-icon>shield</mat-icon>
          </div>
          <span class="gradient-text logo-text">VaultX</span>
        </div>

        <!-- User Info -->
        <div class="sidebar-user glass-card">
          <div class="user-avatar">
            @if (auth.vaultUser()?.photoURL) {
              <img [src]="auth.vaultUser()!.photoURL" [alt]="auth.vaultUser()!.fullName" />
            } @else {
              <mat-icon>person</mat-icon>
            }
          </div>
          <div class="user-info">
            <span class="user-name">{{ auth.vaultUser()?.fullName ?? 'User' }}</span>
            <span class="user-email">{{ auth.vaultUser()?.email ?? '' }}</span>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          @for (item of navItems; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="nav-item-active"
              class="nav-item"
              (click)="closeSidebarMobile()"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <!-- Storage Usage -->
        <div class="storage-widget glass-card">
          <div class="storage-header">
            <mat-icon>cloud</mat-icon>
            <span>Storage</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="storagePercent()"></div>
          </div>
          <div class="storage-labels">
            <span>{{ storage.formatBytes(stats().storageUsed) }}</span>
            <span>{{ storage.formatBytes(stats().storageLimit) }}</span>
          </div>
        </div>

        <!-- Logout -->
        <button class="logout-btn" (click)="auth.logout()">
          <mat-icon>logout</mat-icon>
          <span>Sign Out</span>
        </button>
      </aside>

      <!-- Overlay (mobile) -->
      @if (sidebarOpen()) {
        <div class="sidebar-overlay" (click)="sidebarOpen.set(false)"></div>
      }

      <!-- Main Content -->
      <div class="main-content">
        <!-- Header -->
        <header class="app-header glass-card">
          <button class="menu-btn" (click)="sidebarOpen.update(v => !v)">
            <mat-icon>{{ sidebarOpen() ? 'close' : 'menu' }}</mat-icon>
          </button>

          <div class="header-title">
            <h2>{{ getPageTitle() }}</h2>
          </div>

          <div class="header-actions">
            <!-- Theme Toggle -->
            <button
              class="icon-btn"
              [matTooltip]="theme.theme() === 'dark' ? 'Light Mode' : 'Dark Mode'"
              (click)="theme.toggle()"
            >
              <mat-icon>{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>

            <!-- Connect Google Drive -->
            <button class="icon-btn" (click)="toggleDrive()" [matTooltip]="googleAuth.isConnected() ? 'Connected to Google Drive' : 'Connect Google Drive'">
              <mat-icon>{{ googleAuth.isConnected() ? 'cloud_done' : 'cloud' }}</mat-icon>
            </button>

            <!-- User Menu -->
            <button class="avatar-btn" [matMenuTriggerFor]="userMenu">
              @if (auth.vaultUser()?.photoURL) {
                <img [src]="auth.vaultUser()!.photoURL" [alt]="auth.vaultUser()!.fullName" class="header-avatar" />
              } @else {
                <mat-icon>account_circle</mat-icon>
              }
            </button>
            <mat-menu #userMenu="matMenu">
              <button mat-menu-item routerLink="/settings">
                <mat-icon>settings</mat-icon> Settings
              </button>
              <button mat-menu-item routerLink="/security">
                <mat-icon>security</mat-icon> Security
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="auth.logout()">
                <mat-icon>logout</mat-icon> Sign Out
              </button>
            </mat-menu>
          </div>
        </header>

        <!-- Page Content -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-primary);
    }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px 16px;
      border-radius: 0;
      border-right: 1px solid var(--glass-border);
      overflow-y: auto;
      transition: transform 0.3s ease;
      z-index: 100;
      flex-shrink: 0;
    }
    .sidebar-logo {
      display: flex; align-items: center; gap: 10px;
      padding: 4px 8px;
    }
    .logo-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(99,102,241,0.4);
    }
    .logo-icon mat-icon { color: white; font-size: 22px; width: 22px; height: 22px; }
    .logo-text { font-size: 22px; font-weight: 800; }

    .sidebar-user {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 12px;
    }
    .user-avatar {
      width: 38px; height: 38px; border-radius: 50%; overflow: hidden;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .user-avatar img { width: 100%; height: 100%; object-fit: cover; }
    .user-avatar mat-icon { color: white; font-size: 20px; }
    .user-info { overflow: hidden; }
    .user-name { font-size: 13px; font-weight: 600; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .user-email { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }

    .sidebar-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; border-radius: 10px;
      color: var(--text-secondary); text-decoration: none;
      font-size: 14px; font-weight: 500;
      transition: all 0.2s ease;
      border-left: 3px solid transparent;
    }
    .nav-item:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .nav-item mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .storage-widget {
      padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px;
    }
    .storage-header { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text-secondary); }
    .storage-header mat-icon { font-size: 16px; width: 16px; height: 16px; color: var(--primary-light); }
    .storage-labels { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); }

    .logout-btn {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 10px; width: 100%;
      background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
      color: #ef4444; cursor: pointer; font-size: 14px; font-weight: 500;
      transition: all 0.2s;
    }
    .logout-btn:hover { background: rgba(239,68,68,0.15); }
    .logout-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* Main Content */
    .main-content {
      flex: 1; display: flex; flex-direction: column; overflow: hidden;
    }

    /* Header */
    .app-header {
      height: var(--header-height); min-height: var(--header-height);
      display: flex; align-items: center; gap: 16px;
      padding: 0 24px; border-radius: 0;
      border-bottom: 1px solid var(--glass-border);
    }
    .menu-btn {
      display: none; background: none; border: none;
      color: var(--text-secondary); cursor: pointer; padding: 6px; border-radius: 8px;
    }
    .header-title { flex: 1; }
    .header-title h2 { font-size: 18px; font-weight: 700; margin: 0; }
    .header-actions { display: flex; align-items: center; gap: 8px; }
    .icon-btn {
      width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--glass-border);
      background: var(--bg-card); color: var(--text-secondary); cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }
    .icon-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
    .avatar-btn {
      width: 38px; height: 38px; border-radius: 50%; border: 2px solid var(--primary);
      background: linear-gradient(135deg, #6366f1, #8b5cf6); cursor: pointer;
      display: flex; align-items: center; justify-content: center; color: white; overflow: hidden;
    }
    .header-avatar { width: 100%; height: 100%; object-fit: cover; }

    /* Page */
    .page-content { flex: 1; overflow-y: auto; padding: 24px; }

    /* Overlay */
    .sidebar-overlay {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      z-index: 99;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar {
        position: fixed; left: 0; top: 0;
        transform: translateX(-100%);
        width: 260px !important;
      }
      .shell.sidebar-open .sidebar { transform: translateX(0); }
      .shell.sidebar-open .sidebar-overlay { display: block; }
      .menu-btn { display: flex; }
      .page-content { padding: 16px; }
    }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private firestoreService = inject(FirestoreService);
  storage = inject(StorageService);
  googleAuth = inject(GoogleAuthService);
  localStorage = inject(LocalStorageService);

  sidebarOpen = signal(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Upload Files', icon: 'cloud_upload', route: '/upload' },
    { label: 'Photos', icon: 'photo_library', route: '/gallery' },
    { label: 'Documents', icon: 'folder_open', route: '/documents' },
    { label: 'Folders', icon: 'create_new_folder', route: '/folders' },
    { label: 'Security', icon: 'security', route: '/security' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
  ];

  storagePercent() {
    const s = this.firestoreService.getStats(this.auth.currentUser()?.uid ?? '');
    return Math.min((s.storageUsed / s.storageLimit) * 100, 100);
  }

  stats() {
    return this.firestoreService.getStats(this.auth.currentUser()?.uid ?? '');
  }

  constructor() {
    effect(() => {
      const uid = this.auth.currentUser()?.uid;
      if (uid) {
        this.firestoreService.subscribeToFiles(uid as string);
        this.firestoreService.subscribeToFolders(uid as string);
      }
    });
  }

  async toggleDrive() {
    try {
      if (this.googleAuth.isConnected()) {
        await this.googleAuth.revokeToken();
        return;
      }
      await this.googleAuth.connect('consent');
      // ensure local vault exists
      await this.localStorage.ensureVaultFolder();
    } catch (e: any) {
      console.error(e);
      alert('Google Drive connect failed: ' + (e.message || e));
    }
  }

  getPageTitle(): string {
    const path = window.location.pathname;
    const item = this.navItems.find((n) => n.route === path);
    return item?.label ?? 'VaultX';
  }

  closeSidebarMobile() {
    if (window.innerWidth < 768) this.sidebarOpen.set(false);
  }
}
