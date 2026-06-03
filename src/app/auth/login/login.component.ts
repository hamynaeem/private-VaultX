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
  selector: 'app-login',
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
        <div class="blob blob-3"></div>
      </div>

      <div class="auth-card glass-card animate-fadeIn">
        <!-- Logo -->
        <div class="auth-logo">
          <div class="logo-icon">
            <mat-icon>shield</mat-icon>
          </div>
          <h1 class="gradient-text">VaultX</h1>
          <p>Your Secure Private Cloud</p>
        </div>

        <h2>Welcome Back</h2>
        <p class="subtitle">Sign in to access your secure vault</p>

        <form [formGroup]="form" (ngSubmit)="onLogin()" class="auth-form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" placeholder="you@example.com" />
            <mat-icon matPrefix>email</mat-icon>
            @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
              <mat-error>Email is required</mat-error>
            }
            @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
              <mat-error>Invalid email format</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Password</mat-label>
            <input matInput [type]="showPass() ? 'text' : 'password'" formControlName="password" />
            <mat-icon matPrefix>lock</mat-icon>
            <button type="button" mat-icon-button matSuffix (click)="showPass.update(v => !v)">
              <mat-icon>{{ showPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
              <mat-error>Password is required</mat-error>
            }
          </mat-form-field>

          <div class="forgot-link">
            <a routerLink="/auth/forgot-password">Forgot Password?</a>
          </div>

          <button
            mat-raised-button
            type="submit"
            class="btn-gradient submit-btn"
            [disabled]="loading()"
          >
            @if (loading()) {
              <mat-spinner diameter="20"></mat-spinner>
            } @else {
              <mat-icon>login</mat-icon>
              Sign In
            }
          </button>
        </form>

        <div class="divider"><span>or</span></div>

        <button class="google-btn" (click)="onGoogleSignIn()" [disabled]="loading()">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" />
          Continue with Google
        </button>

        <p class="auth-switch">
          Don't have an account?
          <a routerLink="/auth/register">Create Account</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
      background: var(--bg-primary);
    }
    .auth-bg { position: fixed; inset: 0; z-index: 0; }
    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
    }
    .blob-1 { width: 400px; height: 400px; background: #6366f1; top: -100px; left: -100px; }
    .blob-2 { width: 300px; height: 300px; background: #8b5cf6; bottom: -80px; right: -80px; }
    .blob-3 { width: 250px; height: 250px; background: #0ea5e9; top: 50%; left: 60%; }
    .auth-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 440px;
      padding: 40px;
    }
    .auth-logo {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-icon {
      width: 64px; height: 64px;
      border-radius: 20px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 12px;
      box-shadow: 0 8px 32px rgba(99,102,241,0.4);
    }
    .logo-icon mat-icon { color: white; font-size: 32px; width: 32px; height: 32px; }
    h1 { font-size: 28px; font-weight: 800; margin: 0; }
    .auth-logo p { color: var(--text-secondary); font-size: 13px; margin-top: 4px; }
    h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); text-align: center; margin-bottom: 4px; }
    .subtitle { color: var(--text-secondary); font-size: 14px; text-align: center; margin-bottom: 24px; }
    .auth-form { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .forgot-link { text-align: right; margin-bottom: 4px; }
    .forgot-link a, .auth-switch a { color: var(--primary-light); text-decoration: none; font-size: 14px; font-weight: 500; }
    .forgot-link a:hover, .auth-switch a:hover { text-decoration: underline; }
    .submit-btn { width: 100%; height: 48px; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .divider { display: flex; align-items: center; gap: 12px; margin: 16px 0; color: var(--text-muted); font-size: 13px; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border-color); }
    .google-btn {
      width: 100%; height: 48px;
      background: var(--bg-card);
      border: 1px solid var(--glass-border);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      color: var(--text-primary); font-size: 14px; font-weight: 500; cursor: pointer;
      transition: all 0.2s;
    }
    .google-btn:hover { background: var(--bg-card-hover); transform: translateY(-1px); }
    .auth-switch { text-align: center; color: var(--text-secondary); font-size: 14px; margin-top: 20px; }
    ::ng-deep .mat-mdc-form-field { --mdc-outlined-text-field-container-shape: 10px; }
    ::ng-deep .mat-mdc-text-field-wrapper { background: rgba(255,255,255,0.03) !important; }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loading = signal(false);
  showPass = signal(false);

  async onLogin() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    try {
      await this.auth.login(this.form.value.email!, this.form.value.password!);
    } catch (e: any) {
      this.snackBar.open(this.getError(e), 'Dismiss', { duration: 4000 });
    } finally {
      this.loading.set(false);
    }
  }

  async onGoogleSignIn() {
    this.loading.set(true);
    try {
      await this.auth.googleSignIn();
    } catch (e: any) {
      this.snackBar.open(this.getError(e), 'Dismiss', { duration: 4000 });
    } finally {
      this.loading.set(false);
    }
  }

  private getError(e: any): string {
    const code = e?.code ?? '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password') return 'Invalid email or password';
    if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
    return e?.message ?? 'An error occurred';
  }
}
