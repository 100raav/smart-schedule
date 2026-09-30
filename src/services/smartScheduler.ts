import type { Activity, CategoryId, RepeatRule } from '../types';
import { MIN, formatDateKey, parseDateKey, todayKey } from '../utils/time';
import { uid } from '../utils/id';

export interface SmartActivity {
  title: string;
  duration: number;
  category: CategoryId;
  repeat: RepeatRule;
}

export interface SmartBuildResult {
  activities: SmartActivity[];
  scheduleName: string;
  description: string;
  bestStart: number;
  bestEnd: number;
  interval: number;
  days: string[];
  type: 'daily' | 'weekly';
}

const CATEGORY_KEYWORDS: [CategoryId, string[]][] = [
  ['study', ['study', 'learn', 'revise', 'practic', 'ielts', 'exam', 'homework', 'assignment', 'tuition', 'ccna', 'java', 'python', 'course', 'lesson', 'class', 'prepare']],
  ['work', ['work', 'office', 'client', 'email', 'report', 'standup', 'job']],
  ['exercise', ['exercise', 'workout', 'gym', 'run', 'jog', 'yoga', 'fitness', 'swim', 'walk', 'stretch', 'meditat']],
  ['meeting', ['meeting', 'call', 'catch-up', 'stand-up', 'sync']],
  ['break', ['break', 'rest', 'lunch', 'recharge', 'nap']],
  ['travel', ['travel', 'commute', 'driv']],
  ['project', ['project', 'build', 'develop', 'cod', 'design project']],
  ['other', ['chore', 'errand', 'clean', 'shopping', 'groceri']],
];

const REPEAT_DETECTORS: [RepeatRule, RegExp][] = [
  ['weekdays', /week\s?days|every\s?weekday|mon[- ]?fri|monday through friday|m-f/i],
  ['weekends', /week\s?ends|weekend|sat(?:urday)?\s*(?:and|&)\s*sun(?:day)?/i],
  ['daily', /every\s?day|daily|each\s?day/i],
  ['weekly', /every\s?week|weekly|once\s?a\s?week/i],
];

const DURATION_RE =
  /(\d+(?:\.\d+)?|half|quarter|an|\ba)\s*(hours?|hrs?|h|minutes?|mins?|min)\b/gi;

const START_PREFERENCE_RE =
  /(?:start(?:ing)?|begin|after|from)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;

type DurationMatch = { minutes: number; value: number; unit: string };

function extractDurations(clause: string): { durations: DurationMatch[]; cleaned: string } {
  const durations: DurationMatch[] = [];
  const cleaned = clause.replace(DURATION_RE, (_, n, unit) => {
    let value: number | null = null;
    if (typeof n === 'string') {
      const norm = n.toLowerCase();
      if (norm === 'half') value = 0.5;
      else if (norm === 'quarter') value = 0.25;
      else if (norm === 'an' || norm === 'a') value = 1;
      else value = parseFloat(n);
    }
    const u = String(unit).toLowerCase();
    const mult = u.startsWith('h') ? 60 : 1;
    const minutes = Math.max(5, Math.round((value ?? 1) * mult));
    durations.push({ minutes, value: value ?? 1, unit: u });
    return ' ';
  });
  return { durations, cleaned: cleaned.replace(/\s{2,}/g, ' ').trim() };
}

function detectRepeat(text: string): RepeatRule {
  for (const [rule, re] of REPEAT_DETECTORS) {
    if (re.test(text)) return rule;
  }
  return 'none';
}

function detectCategory(title: string): CategoryId {
  const lower = title.toLowerCase();
  for (const [cat, keys] of CATEGORY_KEYWORDS) {
    if (keys.some((k) => lower.includes(k))) return cat;
  }
  return 'personal';
}

function detectDayMentions(text: string): string[] {
  const found: string[] = [];
  const regex = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text))) {
    const key = m[1].toLowerCase();
    if (!found.includes(key)) found.push(key);
  }
  return found;
}

function cleanTitle(raw: string): string {
  return (
    raw
      .replace(/^[,.\s]+|[,.\s]+$/g, '')
      .replace(/^(i want to|i need to|i would like to|i have to|i'd like to|let me|i will|i'll|please|plan me|schedule)\s+/gi, '')
      .replace(/^(study|learn|do|have|take|fit in|add)\s+/gi, '')
      .replace(/\b(please|also|and then)\b/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

function capitalizeTitle(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();
}

function parseStartPreference(text: string): number | null {
  const m = START_PREFERENCE_RE.exec(text);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const suffix = (m[3] || '').toLowerCase();
  if (suffix.startsWith('p') && h < 12) h += 12;
  if (suffix.startsWith('a') && h === 12) h = 0;
  if (h > 23 || mm > 59) return null;
  return h * MIN + mm;
}

function isFillerClause(clause: string): boolean {
  return /^(i want|i need|i would|i'll|i will|create|make|build|generate|plan|schedule|my|a |an |the )/i.test(clause);
}

export function smartParseInput(rawInput: string): SmartBuildResult {
  const text = rawInput.trim().replace(/\s*\n+/g, ' ');
  if (!text) {
    throw new Error('Describe your schedule first. Example: "Study Java for 2 hours, IELTS for 1 hour, and exercise for 30 minutes every weekday."');
  }

  const globalRepeat = detectRepeat(text);
  const mentionsStart = parseStartPreference(text);
  const dayMentions = detectDayMentions(text);
  const forceDaily = /daily|every\s?day|each\s?day/.test(text);

  const clauses = text
    .split(/,|;|\band\b|\bthen\b|\./)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const activities: SmartActivity[] = [];
  for (const clause of clauses) {
    if (isFillerClause(clause)) continue;
    const { durations, cleaned } = extractDurations(clause);
    const cleanedNoStart = cleaned
      .replace(/^[^a-z]+/gi, ' ')
      .replace(/start(?:ing)?|begin|after|from/gi, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const titleRaw = cleanTitle(cleanedNoStart || cleaned);
    if (!titleRaw || titleRaw.length < 2) continue;
    const title = capitalizeTitle(titleRaw);
    let repeat = detectRepeat(clause);
    if (repeat === 'none') repeat = globalRepeat;
    const total = durations.reduce((s, d) => s + d.minutes, 0);
    const duration = total > 0 ? total : 60;
    activities.push({
      title,
      duration,
      category: detectCategory(titleRaw),
      repeat,
    });
  }

  if (activities.length === 0) {
    throw new Error(
      "I couldn't find any activities to schedule. Try something like: \"Study Java for 2 hours, IELTS for 1 hour, and exercise for 30 minutes every weekday.\"",
    );
  }

  const interval = 15;
  const bestStart = mentionsStart ?? 9 * MIN;

  const totalMinutes = activities.reduce((s, a) => s + a.duration, 0);

  let cursor = bestStart;
  for (const a of activities) {
    cursor += a.duration;
    if (a !== activities[activities.length - 1]) cursor += 15;
  }
  const bestEnd = Math.min(24 * MIN - 1, Math.ceil(cursor / 60) * 60 + 60);

  const days: string[] = [];
  let type: SmartBuildResult['type'] = 'daily';

  const startKey = todayKey();
  const startDate = parseDateKey(startKey);

  if (dayMentions.length > 0) {
    type = 'weekly';
    const firstDow = (startDate.getDay() + 6) % 7;
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() - firstDow);
    for (let i = 0; i < 7; i++) {
      days.push(formatDateKey(new Date(weekStart.getTime() + i * 86400000)));
    }
  } else {
    type = forceDaily || totalMinutes <= 12 * MIN ? 'daily' : 'weekly';
    if (type === 'daily') {
      days.push(startKey);
    } else {
      const firstDow = (startDate.getDay() + 6) % 7;
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() - firstDow);
      for (let i = 0; i < 7; i++) {
        days.push(formatDateKey(new Date(weekStart.getTime() + i * 86400000)));
      }
    }
  }

  return {
    activities,
    scheduleName:
      type === 'weekly' ? 'My Smart Weekly Plan' : 'My Smart Daily Plan',
    description: text,
    bestStart,
    bestEnd,
    interval,
    days,
    type,
  };
}

export interface SmartGeneratedActivity extends Activity {
  _smartSlot: number;
}

export function buildScheduleFromSmart(rawInput: string): {
  build: SmartBuildResult;
  activities: Omit<Activity, 'id'>[];
} {
  const build = smartParseInput(rawInput);
  const categoryColors: Record<string, string> = {
    study: '#5873f8',
    work: '#0ea5e9',
    personal: '#10b981',
    exercise: '#f59e0b',
    meeting: '#8b5cf6',
    break: '#ef4444',
    travel: '#14b8a6',
    project: '#ec4899',
    other: '#64748b',
  };

  const primaryDay = build.days[0];
  const monWeek = build.days.length > 1 && build.type === 'weekly';

  let cursor = build.bestStart;
  const activities: Omit<Activity, 'id'>[] = [];

  build.activities.forEach((sa, idx) => {
    const dow = idx % Math.max(1, build.days.length);
    let targetDate = primaryDay;
    if (build.days.length > 1) {
      targetDate = build.days[dow];
    }
    const start = cursor;
    const end = start + sa.duration;
    cursor = end + (idx < build.activities.length - 1 ? 15 : 0);

    const base: Omit<Activity, 'id'> = {
      title: sa.title,
      date: targetDate,
      start,
      end,
      category: sa.category,
      color: categoryColors[sa.category] || '#5873f8',
      priority: 'medium',
      icon: 'star',
      repeat: sa.repeat,
      reminder: 0,
    };
    activities.push(base);

    if (monWeek) {
      for (let di = 0; di < build.days.length; di++) {
        if (di === dow) continue;
        const date = build.days[di];
        const dayDow = (parseDateKey(date).getDay() + 6) % 7;
        if (sa.repeat === 'weekdays' && dayDow >= 5) continue;
        if (sa.repeat === 'weekends' && dayDow < 5) continue;
        if (sa.repeat === 'none' && build.days.length > 1) continue;
        if (sa.repeat === 'daily') {
          activities.push({ ...base, date });
        } else if (sa.repeat === 'weekly') {
          continue;
        } else if (sa.repeat === 'weekdays' || sa.repeat === 'weekends') {
          activities.push({ ...base, date });
        } else {
          continue;
        }
      }
    }
  });

  return { build, activities };
}

export function smartToActivities(input: string): Activity[] {
  const { activities } = buildScheduleFromSmart(input);
  return activities.map((a) => ({ ...a, id: uid('act') }));
}

export function demoSmartPrompt(): string {
  return (
    'I want to study Java for 2 hours, prepare for IELTS for 1 hour, ' +
    'work on my portfolio project for 1.5 hours, exercise for 30 minutes, ' +
    'and take a short break for 30 minutes every weekday, starting at 9 am.'
  );
}