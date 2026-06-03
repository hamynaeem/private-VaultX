import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="auth-wrapper">
      <div class="auth-bg">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
      </div>
      <div class="auth-card glass-card animate-fadeIn">
        <div class="auth-logo">
          <div class="logo-icon"><mat-icon>shield</mat-icon></div>
          <h1 class="gradient-text">VaultX</h1>
        </div>

        @if (!sent()) {
          <h2>Reset Password</h2>
          <p class="subtitle">Enter your email and we'll send a reset link</p>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email Address</mat-label>
              <input matInput type="email" formControlName="email" />
              <mat-icon matPrefix>email</mat-icon>
            </mat-form-field>

            <button mat-raised-button type="submit" class="btn-gradient submit-btn" [disabled]="loading()">
              @if (loading()) { <mat-spinner diameter="20"></mat-spinner> }
              @else { <mat-icon>send</mat-icon> Send Reset Link }
            </button>
          </form>
        } @else {
          <div class="success-state">
            <div class="success-icon"><mat-icon>mark_email_read</mat-icon></div>
            <h2>Email Sent!</h2>
            <p>Check your inbox for the password reset link.</p>
          </div>
        }

        <p class="auth-switch">
          <a routerLink="/auth/login">
            <mat-icon>arrow_back</mat-icon> Back to Sign In
          </a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; position: relative; background: var(--bg-primary); }
    .auth-bg { position: fixed; inset: 0; z-index: 0; }
    .blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.15; }
    .blob-1 { width: 350px; height: 350px; background: #6366f1; top: -100px; left: -100px; }
    .blob-2 { width: 300px; height: 300px; background: #0ea5e9; bottom: -80px; right: -80px; }
    .auth-card { position: relative; z-index: 1; width: 100%; max-width: 420px; padding: 40px; }
    .auth-logo { text-align: center; margin-bottom: 20px; }
    .logo-icon { width: 64px; height: 64px; border-radius: 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
    .logo-icon mat-icon { color: white; font-size: 32px; width: 32px; height: 32px; }
    h1 { font-size: 28px; font-weight: 800; margin: 0; }
    h2 { font-size: 20px; font-weight: 700; text-align: center; margin-bottom: 4px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; text-align: center; margin-bottom: 24px; }
    .auth-form { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .submit-btn { width: 100%; height: 48px; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .success-state { text-align: center; padding: 16px 0; }
    .success-icon { width: 72px; height: 72px; border-radius: 50%; background: rgba(16,185,129,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
    .success-icon mat-icon { color: #10b981; font-size: 36px; width: 36px; height: 36px; }
    .auth-switch { text-align: center; margin-top: 20px; }
    .auth-switch a { color: var(--primary-light); text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 14px; }
    ::ng-deep .mat-mdc-text-field-wrapper { background: rgba(255,255,255,0.03) !important; }
  `],
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  loading = signal(false);
  sent = signal(false);

  async onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    try {
      await this.auth.forgotPassword(this.form.value.email!);
      this.sent.set(true);
    } catch (e: any) {
      this.snackBar.open(e?.message ?? 'Failed to send email', 'Dismiss', { duration: 4000 });
    } finally {
      this.loading.set(false);
    }
  }
}
