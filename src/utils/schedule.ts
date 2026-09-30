import { uid } from './id';
import { addDays, formatDateKey, parseDateKey, diffDays, todayKey } from './time';
import type {
  Activity,
  Category,
  Schedule,
  ScheduleSettings,
  ScheduleType,
  RepeatRule,
} from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from '../types';

function startOfWeek(key: string, monday: boolean): string {
  const d = parseDateKey(key);
  const dow = d.getDay(); // 0=Sun
  const offset = monday ? (dow + 6) % 7 : dow;
  d.setDate(d.getDate() - offset);
  return formatDateKey(d);
}

export function computeDaysForType(
  type: ScheduleType,
  startDate: string,
  settings: ScheduleSettings,
  endDate?: string,
): string[] {
  if (type === 'daily') return [startDate];
  if (type === 'weekly') {
    const monday = settings.weekStartsMonday;
    const start = startOfWeek(startDate, monday);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter((d) => {
      if (settings.showWeekends) return true;
      const dow = (parseDateKey(d).getDay() + (monday ? 6 : 0)) % 7;
      return dow < 5;
    });
  }
  if (type === 'monthly') {
    const d = parseDateKey(startDate);
    const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const dt = new Date(d.getFullYear(), d.getMonth(), i + 1);
      return formatDateKey(dt);
    });
  }
  const diff = Math.min(60, Math.max(1, diffDays(endDate || startDate, startDate) + 1));
  return Array.from({ length: diff }, (_, i) => addDays(startDate, i));
}

export function scheduleDaySpan(schedule: Schedule): string[] {
  if (schedule.settings.days && schedule.settings.days.length > 0) {
    return schedule.settings.days;
  }
  return computeDaysForType(schedule.type, schedule.startDate, schedule.settings);
}

export function isActivityOnDate(act: Activity, dateKey: string, isRepeat: boolean): boolean {
  if (!isRepeat) return act.date === dateKey;
  const dayIndex = (parseDateKey(dateKey).getDay() + 6) % 7; // 0=Mon
  const baseIndex = (parseDateKey(act.date).getDay() + 6) % 7;
  switch (act.repeat) {
    case 'daily':
      return dateKey >= act.date;
    case 'weekdays':
      return dayIndex < 5;
    case 'weekends':
      return dayIndex >= 5;
    case 'weekly':
      return baseIndex === dayIndex && dateKey >= act.date;
    default:
      return act.date === dateKey;
  }
}

export function expandActivity(act: Activity, days: string[]): { activity: Activity; date: string; repeated: boolean }[] {
  const repeated = act.repeat !== 'none';
  return days
    .filter((d) => isActivityOnDate(act, d, repeated))
    .map((d) => ({ activity: act, date: d, repeated: repeated && d !== act.date }));
}

export function createBlankSchedule(type: ScheduleType = 'weekly', startDate?: string): Schedule {
  const start = startDate || todayKey();
  const end = type === 'custom' ? start : type === 'monthly' ? start : start;
  const settings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    days: [],
    startTime: 8 * 60,
    endTime: 22 * 60,
    interval: 60,
    use24Hour: false,
  };
  settings.days = computeDaysForType(type, start, settings);
  return {
    id: uid('sched'),
    name: 'Untitled Schedule',
    description: '',
    type,
    startDate: start,
    endDate: end,
    author: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
    settings,
    activities: [],
    customCategories: [],
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function activityDurationMinutes(act: Activity): number {
  return Math.max(15, act.end - act.start);
}

export function totalScheduledMinutes(activities: Activity[]): number {
  return activities.reduce((sum, a) => sum + Math.max(0, a.end - a.start), 0);
}

export function activitiesByCategory(activities: Activity[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const a of activities) {
    map[a.category] = (map[a.category] || 0) + Math.max(0, a.end - a.start);
  }
  return map;
}

export function minutesForCategory(activities: Activity[], categoryId: string): number {
  return activities
    .filter((a) => a.category === categoryId)
    .reduce((sum, a) => sum + Math.max(0, a.end - a.start), 0);
}

export function categoryName(id: string, categories: Category[]): string {
  const match = categories.find((c) => c.id === id);
  if (match) return match.name;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

export function allCategories(schedule: Schedule): Category[] {
  const merged = [...DEFAULT_CATEGORIES];
  for (const c of schedule.customCategories) {
    if (!merged.some((m) => m.id === c.id)) merged.push(c);
  }
  return merged;
}

export function sanitizeSchedule(raw: unknown): Schedule | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<Schedule>;
  if (!s.id || typeof s.name !== 'string') return null;
  const settings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    ...(s.settings || {}),
  };
  const activities: Activity[] = Array.isArray(s.activities)
    ? (s.activities as Activity[]).filter(
        (a) => a && typeof a.id === 'string' && typeof a.title === 'string',
      )
    : [];
  return {
    id: s.id,
    name: s.name,
    description: s.description || '',
    type: (s.type as ScheduleType) || 'custom',
    startDate: s.startDate || todayKey(),
    endDate: s.endDate || s.startDate || todayKey(),
    author: s.author || '',
    timezone: s.timezone || 'local',
    settings,
    activities,
    customCategories: Array.isArray(s.customCategories) ? s.customCategories : [],
    favorite: !!s.favorite,
    createdAt: s.createdAt || Date.now(),
    updatedAt: s.updatedAt || Date.now(),
  };
}

export function scheduleDuplicate(schedule: Schedule): Schedule {
  const copy: Schedule = {
    ...structuredClone(schedule),
    id: uid('sched'),
    name: `${schedule.name} (copy)`,
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isTemplate: undefined,
    templateId: undefined,
  };
  return copy;
}

export function overlaps(a: Activity, b: Activity): boolean {
  return !(a.end <= b.start || b.end <= a.start);
}

export function sortActivities(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => a.start - b.start || a.end - b.end);
}

export function repeatLabel(rule: RepeatRule): string {
  switch (rule) {
    case 'daily':
      return 'Daily';
    case 'weekdays':
      return 'Weekdays';
    case 'weekends':
      return 'Weekends';
    case 'weekly':
      return 'Weekly';
    default:
      return 'Does not repeat';
  }
}

export function scheduleForExport(schedule: Schedule): Schedule {
  return { ...schedule, settings: { ...schedule.settings, days: scheduleDaySpan(schedule) } };
}