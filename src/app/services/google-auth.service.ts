import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    google?: any;
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private clientId = environment.google?.clientId ?? '';
  private tokenClient: any = null;
  accessToken = signal<string | null>(null);
  expiresAt = 0;
  isConnected = signal(false);

  constructor() {}

  private async loadGsiScript(): Promise<void> {
    if (window.google) return;
    return new Promise((resolve, reject) => {
      const src = 'https://accounts.google.com/gsi/client';
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  private ensureTokenClient() {
    if (this.tokenClient) return;
    const scopes = ['https://www.googleapis.com/auth/drive.file', 'openid', 'profile', 'email'];
    const google = (window as any).google;
    if (!google) throw new Error('Google Identity Services not loaded');
    this.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: scopes.join(' '),
      callback: (resp: any) => {
        // callback is set dynamically in requestAccessToken
      },
    });
  }

  async connect(prompt = 'consent'): Promise<string> {
    if (!this.clientId) throw new Error('Google client ID not configured in environment.google.clientId');
    await this.loadGsiScript();
    this.ensureTokenClient();

    return new Promise((resolve, reject) => {
      this.tokenClient.callback = (resp: any) => {
        if (resp.error) return reject(new Error(resp.error));
        this.accessToken.set(resp.access_token ?? null);
        this.expiresAt = Date.now() + (resp.expires_in ?? 3600) * 1000;
        this.isConnected.set(true);
        resolve(resp.access_token);
      };
      try {
        this.tokenClient.requestAccessToken({ prompt });
      } catch (err) {
        reject(err);
      }
    });
  }

  async getAccessToken(): Promise<string> {
    const token = this.accessToken();
    const now = Date.now();
    if (token && now < this.expiresAt - 60000) return token;
    // try to request a silent token
    try {
      const t = await this.connect('none');
      return t;
    } catch (err) {
      // silent request failed; require interactive consent
      const t = await this.connect('consent');
      return t;
    }
  }

  async revokeToken() {
    const token = this.accessToken();
    if (!token) return;
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, { method: 'POST' });
    } catch (e) {
      // ignore
    }
    this.accessToken.set(null);
    this.expiresAt = 0;
    this.isConnected.set(false);
  }

  async getUserInfo(): Promise<any> {
    const token = await this.getAccessToken();
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch user info');
    return await res.json();
  }
}
