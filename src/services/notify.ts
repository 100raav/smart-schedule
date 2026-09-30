import type { Activity, Schedule } from '../types';
import { scheduleDaySpan } from '../utils/schedule';
import { formatMinutes, formatDateKey } from '../utils/time';
import { isStorageAvailable } from './settings';

const NOTIFIED_KEY = 'smartschedule:notified';

function loadNotified(): string[] {
  if (!isStorageAvailable()) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let notifiedCache: string[] | null = null;

function isNotified(key: string): boolean {
  if (notifiedCache === null) notifiedCache = loadNotified();
  const recent = notifiedCache.filter((k) => {
    const ts = parseInt(k.split(':')[0] || '0', 10);
    return Date.now() - ts < 24 * 60 * 60 * 1000;
  });
  notifiedCache = recent;
  return recent.includes(key);
}

function markNotified(key: string) {
  notifiedCache = [...(notifiedCache || loadNotified()), key].slice(-200);
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notifiedCache));
  } catch {
    /* ignore */
  }
}

export function supportsNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function isPermissionGranted(): boolean {
  if (!supportsNotifications()) return false;
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

function addMinutes(dateKey: string, minutes: number): number {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setMinutes(d.getMinutes() + minutes);
  return d.getTime();
}

export function activityOccurrencesOnDays(
  act: Activity,
  days: string[],
): { day: string; isRepeat: boolean }[] {
  const repeated = act.repeat !== 'none';
  const dayIndex = (d: string) => {
    const dt = new Date(`${d}T00:00:00`);
    return (dt.getDay() + 6) % 7;
  };
  if (!repeated) return days.filter((d) => d === act.date).map((day) => ({ day, isRepeat: false }));
  return days
    .filter((d) => {
      const di = dayIndex(d);
      if (d < act.date) return false;
      switch (act.repeat) {
        case 'daily':
          return true;
        case 'weekdays':
          return di < 5;
        case 'weekends':
          return di >= 5;
        case 'weekly':
          return di === dayIndex(act.date);
        default:
          return false;
      }
    })
    .map((day) => ({ day, isRepeat: day !== act.date }));
}

export function checkAndFireReminders(schedules: Schedule[]) {
  if (!isPermissionGranted()) return;
  const now = Date.now();
  const today = new Date();
  const days: string[] = [];
  for (let i = 0; i < 2; i++) {
    days.push(formatDateKey(new Date(today.getTime() + i * 86400000)));
  }

  for (const schedule of schedules) {
    const span = scheduleDaySpan(schedule);
    for (const act of schedule.activities) {
      const occurrences = activityOccurrencesOnDays(act, span);
      for (const occ of occurrences) {
        if (!days.includes(occ.day)) continue;
        if (!act.reminder || act.reminder <= 0) continue;
        const fireAt = addMinutes(occ.day, act.start) - act.reminder * 60000;
        if (fireAt > now && fireAt - now < 60000) {
          const key = `${schedule.id}:${act.id}:${occ.day}:${act.start}:${act.reminder}`;
          if (isNotified(key)) continue;
          try {
            const n = new Notification(act.title, {
              body: `${formatMinutes(act.start, schedule.settings.use24Hour)} — ${schedule.name}`,
            });
            n.onclick = () => window.focus();
          } catch {
            /* ignore */
          }
          markNotified(key);
        }
      }
    }
  }
}

export function scheduleReminderLoop(
  schedules: () => Schedule[],
  enabled: () => boolean,
): () => void {
  if (typeof window === 'undefined') return () => {};
  const check = () => {
    if (enabled() && isPermissionGranted()) checkAndFireReminders(schedules());
  };
  check();
  const interval = setInterval(check, 30000);
  return () => clearInterval(interval);
}