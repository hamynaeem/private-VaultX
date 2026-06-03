import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="security-page animate-fadeIn">
      <div class="page-header">
        <h1>Security Center</h1>
        <p>Manage your account security and access controls</p>
      </div>

      <div class="security-grid">
        <!-- Change Password -->
        <div class="security-card glass-card">
          <div class="card-header">
            <div class="card-icon"><mat-icon>lock_reset</mat-icon></div>
            <div>
              <h3>Change Password</h3>
              <p>Update your account password</p>
            </div>
          </div>
          <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="security-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>New Password</mat-label>
              <input matInput [type]="showPass() ? 'text' : 'password'" formControlName="password" />
              <mat-icon matPrefix>lock</mat-icon>
              <button type="button" mat-icon-button matSuffix (click)="showPass.update(v => !v)">
                <mat-icon>{{ showPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Confirm Password</mat-label>
              <input matInput [type]="showPass() ? 'text' : 'password'" formControlName="confirm" />
              <mat-icon matPrefix>lock_outline</mat-icon>
            </mat-form-field>
            <button mat-raised-button type="submit" class="btn-gradient action-btn" [disabled]="changingPass()">
              @if (changingPass()) {
                <mat-spinner diameter="18"></mat-spinner>
              } @else {
                <ng-container><mat-icon>save</mat-icon> Update Password</ng-container>
              }
            </button>
          </form>
        </div>

        <!-- Security Options -->
        <div class="security-card glass-card">
          <div class="card-header">
            <div class="card-icon teal"><mat-icon>security</mat-icon></div>
            <div>
              <h3>Security Settings</h3>
              <p>Configure additional security layers</p>
            </div>
          </div>
          <div class="toggle-list">
            @for (opt of securityOptions; track opt.label) {
              <div class="toggle-item">
                <div class="toggle-info">
                  <mat-icon [style.color]="opt.color">{{ opt.icon }}</mat-icon>
                  <div>
                    <span class="toggle-label">{{ opt.label }}</span>
                    <span class="toggle-desc">{{ opt.desc }}</span>
                  </div>
                </div>
                <mat-slide-toggle [(ngModel)]="opt.enabled" color="primary"></mat-slide-toggle>
              </div>
            }
          </div>
        </div>

        <!-- Login Activity -->
        <div class="security-card glass-card activity-card">
          <div class="card-header">
            <div class="card-icon orange"><mat-icon>history</mat-icon></div>
            <div>
              <h3>Login Activity</h3>
              <p>Recent sign-in sessions</p>
            </div>
          </div>
          <div class="activity-list">
            @for (session of sessions; track session.id) {
              <div class="activity-item">
                <div class="activity-icon" [class.success]="session.success" [class.fail]="!session.success">
                  <mat-icon>{{ session.success ? 'check_circle' : 'cancel' }}</mat-icon>
                </div>
                <div class="activity-info">
                  <span class="activity-device">{{ session.device }}</span>
                  <span class="activity-meta">{{ session.location }} · {{ session.time }}</span>
                </div>
                <span class="activity-status" [class.success]="session.success" [class.fail]="!session.success">
                  {{ session.success ? 'Success' : 'Failed' }}
                </span>
              </div>
            }
          </div>
        </div>

        <!-- 2FA Card -->
        <div class="security-card glass-card">
          <div class="card-header">
            <div class="card-icon purple"><mat-icon>phonelink_lock</mat-icon></div>
            <div>
              <h3>Two-Factor Authentication</h3>
              <p>Add an extra layer of security</p>
            </div>
          </div>
          <div class="tfa-content">
            <div class="tfa-status">
              <div class="status-dot disabled"></div>
              <span>2FA is currently <strong>disabled</strong></span>
            </div>
            <p class="tfa-desc">Enable 2FA to require a verification code in addition to your password when signing in.</p>
            <button class="btn-gradient action-btn">
              <mat-icon>qr_code</mat-icon>
              Enable 2FA
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .security-page { display: flex; flex-direction: column; gap: 20px; }
    .page-header h1 { font-size: 24px; font-weight: 800; margin-bottom: 4px; }
    .page-header p { color: var(--text-secondary); font-size: 14px; }

    .security-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .security-card { padding: 24px; }
    .activity-card { grid-column: span 2; }

    .card-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px; }
    .card-icon { width: 44px; height: 44px; border-radius: 12px; background: rgba(99,102,241,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .card-icon mat-icon { font-size: 22px; width: 22px; height: 22px; color: #818cf8; }
    .card-icon.teal { background: rgba(16,185,129,0.15); }
    .card-icon.teal mat-icon { color: #10b981; }
    .card-icon.orange { background: rgba(245,158,11,0.15); }
    .card-icon.orange mat-icon { color: #f59e0b; }
    .card-icon.purple { background: rgba(139,92,246,0.15); }
    .card-icon.purple mat-icon { color: #a78bfa; }
    .card-header h3 { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
    .card-header p { font-size: 13px; color: var(--text-secondary); margin: 0; }

    .security-form { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .action-btn { height: 42px; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; font-weight: 600; border-radius: 10px; }

    .toggle-list { display: flex; flex-direction: column; gap: 0; }
    .toggle-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--glass-border); }
    .toggle-item:last-child { border-bottom: none; }
    .toggle-info { display: flex; align-items: center; gap: 12px; }
    .toggle-info mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .toggle-label { font-size: 14px; font-weight: 500; display: block; }
    .toggle-desc { font-size: 12px; color: var(--text-muted); display: block; }

    .activity-list { display: flex; flex-direction: column; gap: 4px; }
    .activity-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; transition: background 0.2s; }
    .activity-item:hover { background: var(--bg-card-hover); }
    .activity-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .activity-icon.success { background: rgba(16,185,129,0.15); color: #10b981; }
    .activity-icon.fail { background: rgba(239,68,68,0.15); color: #ef4444; }
    .activity-icon mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .activity-info { flex: 1; }
    .activity-device { font-size: 14px; font-weight: 500; display: block; }
    .activity-meta { font-size: 12px; color: var(--text-muted); }
    .activity-status { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 99px; }
    .activity-status.success { background: rgba(16,185,129,0.15); color: #10b981; }
    .activity-status.fail { background: rgba(239,68,68,0.15); color: #ef4444; }

    .tfa-content { display: flex; flex-direction: column; gap: 14px; }
    .tfa-status { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; }
    .status-dot.disabled { background: #ef4444; }
    .status-dot.enabled { background: #10b981; }
    .tfa-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

    @media (max-width: 768px) {
      .security-grid { grid-template-columns: 1fr; }
      .activity-card { grid-column: span 1; }
    }
    ::ng-deep .mat-mdc-text-field-wrapper { background: rgba(255,255,255,0.03) !important; }
  `],
})
export class SecurityComponent {
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  showPass = signal(false);
  changingPass = signal(false);

  passwordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
  });

  securityOptions = [
    { label: 'Login Alerts', desc: 'Get notified on new sign-ins', icon: 'notifications', color: '#6366f1', enabled: true },
    { label: 'Session Timeout', desc: 'Auto sign-out after inactivity', icon: 'timer', color: '#10b981', enabled: false },
    { label: 'PIN Lock', desc: 'Require PIN to access vault', icon: 'pin', color: '#f59e0b', enabled: false },
    { label: 'Encrypted Vault', desc: 'All files are encrypted at rest', icon: 'enhanced_encryption', color: '#8b5cf6', enabled: true },
  ];

  sessions = [
    { id: 1, device: 'Chrome on Windows', location: 'Lahore, PK', time: 'Just now', success: true },
    { id: 2, device: 'Safari on iPhone', location: 'Karachi, PK', time: '2 hours ago', success: true },
    { id: 3, device: 'Unknown Browser', location: 'Dubai, AE', time: 'Yesterday', success: false },
    { id: 4, device: 'Firefox on Mac', location: 'Islamabad, PK', time: '3 days ago', success: true },
  ];

  async changePassword() {
    const { password, confirm } = this.passwordForm.value;
    if (!password || password !== confirm) {
      this.snackBar.open('Passwords do not match', 'Dismiss', { duration: 3000 });
      return;
    }
    this.changingPass.set(true);
    try {
      await this.auth.changePassword(password);
      this.passwordForm.reset();
      this.snackBar.open('Password updated successfully', 'OK', { duration: 3000 });
    } catch (e: any) {
      this.snackBar.open(e?.message ?? 'Failed to update password', 'Dismiss', { duration: 4000 });
    } finally {
      this.changingPass.set(false);
    }
  }
}
