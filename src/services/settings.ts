import { safeParse } from '../utils/id';
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../types';

const KEY = 'smartschedule:appsettings';

export function isStorageAvailable(): boolean {
  try {
    const t = '__ss_test__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
}

export function loadAppSettings(): AppSettings {
  if (!isStorageAvailable()) return DEFAULT_APP_SETTINGS;
  const raw = window.localStorage.getItem(KEY);
  const parsed = safeParse<Partial<AppSettings>>(raw, {});
  return { ...DEFAULT_APP_SETTINGS, ...parsed };
}

export function saveAppSettings(settings: AppSettings): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = loadAppSettings();
  if (stored.theme === 'dark') return 'dark';
  if (stored.theme === 'light') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}