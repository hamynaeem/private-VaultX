import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<Theme>((localStorage.getItem('vaultx-theme') as Theme) ?? 'dark');

  constructor() {
    effect(() => {
      const t = this.theme();
      document.body.classList.toggle('light-mode', t === 'light');
      localStorage.setItem('vaultx-theme', t);
    });
  }

  toggle() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }
}
