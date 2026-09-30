import { create } from 'zustand';
import type { AppSettings } from '../types';
import { DEFAULT_APP_SETTINGS } from '../types';
import { loadAppSettings, saveAppSettings } from '../services/settings';

interface SettingsState {
  settings: AppSettings;
  applyTheme: () => void;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

function applyThemeClass(theme: AppSettings['theme']) {
  if (typeof document === 'undefined') return;
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  const meta = document.getElementById('theme-color-meta');
  if (meta) meta.setAttribute('content', dark ? '#1c1d24' : '#f7f7f8');
}

export function resolveTheme(theme: AppSettings['theme']): 'light' | 'dark' {
  if (theme === 'light') return 'light';
  if (theme === 'dark') return 'dark';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: loadAppSettings(),

  applyTheme: () => applyThemeClass(get().settings.theme),

  update: (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    saveAppSettings(next);
    if ('theme' in patch) applyThemeClass(next.theme);
    if ('accentColor' in patch || 'theme' in patch) {
      applyAccent(next.accentColor);
    }
  },

  reset: () => {
    set({ settings: DEFAULT_APP_SETTINGS });
    saveAppSettings(DEFAULT_APP_SETTINGS);
    applyThemeClass(DEFAULT_APP_SETTINGS.theme);
    applyAccent(DEFAULT_APP_SETTINGS.accentColor);
  },
}));

export function applyAccent(hex: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--accent', hex);
}