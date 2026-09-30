export type ScheduleType = 'daily' | 'weekly' | 'monthly' | 'custom';

export type Priority = 'low' | 'medium' | 'high';

export type RepeatRule = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly';

export type ScheduleStyle = 'minimal' | 'paper' | 'professional' | 'modern' | 'notebook';

export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';

export type BorderStyle = 'none' | 'thin' | 'medium' | 'rounded';

export type PaperSize = 'a4' | 'a5' | 'letter';

export type Orientation = 'portrait' | 'landscape';

export type ExportFormat = 'pdf' | 'jpg' | 'png' | 'json';

export type ExportQuality = 'standard' | 'high' | 'ultra';

export type CategoryId =
  | 'study'
  | 'work'
  | 'personal'
  | 'exercise'
  | 'meeting'
  | 'break'
  | 'travel'
  | 'project'
  | 'other'
  | 'custom';

export interface Category {
  id: CategoryId;
  name: string;
  color: string;
}

export interface ActivityIcon {
  name: string;
  emoji: string;
}

export interface Activity {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  start: number; // minutes from midnight
  end: number; // minutes from midnight
  category: string; // CategoryId or custom category id
  color: string;
  priority: Priority;
  icon: string;
  location?: string;
  notes?: string;
  repeat: RepeatRule;
  reminder?: number; // minutes before start, 0 = none
}

export interface ScheduleSettings {
  // Time configuration
  startTime: number;
  endTime: number;
  interval: number;
  manualSlots: number[] | null;
  // Days
  days: string[]; // dates YYYY-MM-DD actually shown (weekly: 7 days by default)
  weekStartsMonday: boolean;
  // Visual customization
  font: string;
  fontSize: 'small' | 'medium' | 'large';
  fontWeight: 'normal' | 'medium' | 'bold';
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  density: LayoutDensity;
  borderStyle: BorderStyle;
  style: ScheduleStyle;
  paperMode: boolean;
  showTimes: boolean;
  showLegend: boolean;
  showWeekends: boolean;
  orientation: Orientation;
  paperSize: PaperSize;
  // Clock
  use24Hour: boolean;
  showGrid: boolean;
}

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  type: ScheduleType;
  startDate: string;
  endDate: string;
  author: string;
  timezone: string;
  settings: ScheduleSettings;
  activities: Activity[];
  customCategories: Category[];
  favorite: boolean;
  starred?: boolean;
  createdAt: number;
  updatedAt: number;
  isTemplate?: boolean;
  templateId?: string;
}

export interface TemplateMeta {
  id: string;
  category: 'student' | 'professional' | 'personal' | 'custom';
  name: string;
  description: string;
  type: ScheduleType;
  preview?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor: string;
  defaultScheduleType: ScheduleType;
  defaultInterval: number;
  defaultExportFormat: ExportFormat;
  defaultPaperSize: PaperSize;
  use24Hour: boolean;
  weekStartsMonday: boolean;
  notificationsEnabled: boolean;
  reducedMotion: boolean;
  locale: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  sub?: string;
}

export interface SmartParseResult {
  activities: { title: string; duration: number; category: CategoryId; repeat: RepeatRule }[];
  matches: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'study', name: 'Study', color: '#5873f8' },
  { id: 'work', name: 'Work', color: '#0ea5e9' },
  { id: 'personal', name: 'Personal', color: '#10b981' },
  { id: 'exercise', name: 'Exercise', color: '#f59e0b' },
  { id: 'meeting', name: 'Meeting', color: '#8b5cf6' },
  { id: 'break', name: 'Break', color: '#ef4444' },
  { id: 'travel', name: 'Travel', color: '#14b8a6' },
  { id: 'project', name: 'Project', color: '#ec4899' },
  { id: 'other', name: 'Other', color: '#64748b' },
];

export const DEFAULT_SETTINGS: ScheduleSettings = {
  startTime: 8 * 60,
  endTime: 22 * 60,
  interval: 60,
  manualSlots: null,
  days: [],
  weekStartsMonday: true,
  font: 'sans',
  fontSize: 'medium',
  fontWeight: 'medium',
  backgroundColor: '#ffffff',
  primaryColor: '#303ccb',
  secondaryColor: '#eef1ff',
  density: 'comfortable',
  borderStyle: 'medium',
  style: 'modern',
  paperMode: false,
  showTimes: true,
  showLegend: true,
  showWeekends: true,
  orientation: 'portrait',
  paperSize: 'a4',
  use24Hour: false,
  showGrid: true,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'light',
  accentColor: '#5873f8',
  defaultScheduleType: 'weekly',
  defaultInterval: 60,
  defaultExportFormat: 'pdf',
  defaultPaperSize: 'a4',
  use24Hour: false,
  weekStartsMonday: true,
  notificationsEnabled: false,
  reducedMotion: false,
  locale: 'en',
};

export const ACTIVITY_ICONS: ActivityIcon[] = [
  { name: 'book', emoji: '📚' },
  { name: 'code', emoji: '💻' },
  { name: 'dumbbell', emoji: '💪' },
  { name: 'run', emoji: '🏃' },
  { name: 'meeting', emoji: '🤝' },
  { name: 'coffee', emoji: '☕' },
  { name: 'break', emoji: '⚡' },
  { name: 'travel', emoji: '🚌' },
  { name: 'music', emoji: '🎵' },
  { name: 'meditate', emoji: '🧘' },
  { name: 'sleep', emoji: '😴' },
  { name: 'work', emoji: '💼' },
  { name: 'study', emoji: '✏️' },
  { name: 'project', emoji: '📐' },
  { name: 'food', emoji: '🥗' },
  { name: 'chat', emoji: '💬' },
  { name: 'star', emoji: '⭐' },
  { name: 'home', emoji: '🏠' },
  { name: 'other', emoji: '📌' },
];