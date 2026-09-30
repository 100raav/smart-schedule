import type { Activity, Schedule, ScheduleSettings, ScheduleType, TemplateMeta } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { uid } from '../utils/id';
import { addDays, todayKey } from '../utils/time';
import { computeDaysForType } from '../utils/schedule';

export const TEMPLATE_META: TemplateMeta[] = [
  {
    id: 'daily-study',
    category: 'student',
    name: 'Daily Study Plan',
    description: 'A focused daily study timetable with deep-work blocks and review sessions.',
    type: 'daily',
  },
  {
    id: 'weekly-study',
    category: 'student',
    name: 'Weekly Study Timetable',
    description: 'A balanced week of study, assignments and revision sessions.',
    type: 'weekly',
  },
  {
    id: 'exam-prep',
    category: 'student',
    name: 'Exam Preparation',
    description: 'Intensive exam revision with mock tests, review and recovery.',
    type: 'weekly',
  },
  {
    id: 'assignment-planner',
    category: 'student',
    name: 'Assignment Planner',
    description: 'Step-by-step plan to complete assignments before the deadline.',
    type: 'weekly',
  },
  {
    id: 'workday',
    category: 'professional',
    name: 'Workday Schedule',
    description: 'A productive 9-to-6 workday with focus blocks and meetings.',
    type: 'daily',
  },
  {
    id: 'weekly-work',
    category: 'professional',
    name: 'Weekly Work Planner',
    description: 'Plan deep work, meetings and admin across the working week.',
    type: 'weekly',
  },
  {
    id: 'project-schedule',
    category: 'professional',
    name: 'Project Schedule',
    description: 'Ship a project with weekly milestones, reviews and buffers.',
    type: 'weekly',
  },
  {
    id: 'meeting-planner',
    category: 'professional',
    name: 'Meeting Planner',
    description: 'Structure your day around meetings with prep and follow-up.',
    type: 'daily',
  },
  {
    id: 'daily-routine',
    category: 'personal',
    name: 'Daily Routine',
    description: 'A calm personal routine: morning, work, and evening wind-down.',
    type: 'daily',
  },
  {
    id: 'habit-schedule',
    category: 'personal',
    name: 'Habit Schedule',
    description: 'Anchor daily habits and healthy routines into your week.',
    type: 'weekly',
  },
  {
    id: 'fitness-planner',
    category: 'personal',
    name: 'Fitness Planner',
    description: 'Weekly training split with rest, mobility and meal prep.',
    type: 'weekly',
  },
  {
    id: 'productivity-plan',
    category: 'personal',
    name: 'Personal Productivity',
    description: 'Time-blocking for deep work, learning and personal projects.',
    type: 'weekly',
  },
];

const CAT_COLORS: Record<string, string> = {
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

interface ActSeed {
  title: string;
  minutes: number;
  hour: number;
  minute?: number;
  category: string;
  day?: number;
  repeat?: Activity['repeat'];
  priority?: Activity['priority'];
  location?: string;
  description?: string;
}

function buildActivities(seeds: ActSeed[], start: string, type: ScheduleType): Activity[] {
  const days = type === 'weekly' ? 7 : 1;
  const dateKey = start;
  const result: Activity[] = [];
  for (const s of seeds) {
    const d = s.day !== undefined ? addDays(start, s.day) : dateKey;
    const minutesFrom = s.hour * 60 + (s.minute || 0);
    result.push({
      id: uid('act'),
      title: s.title,
      description: s.description,
      date: d,
      start: minutesFrom,
      end: minutesFrom + s.minutes,
      category: s.category,
      color: CAT_COLORS[s.category] || '#5873f8',
      priority: s.priority || 'medium',
      icon:
        s.category === 'exercise'
          ? 'dumbbell'
          : s.category === 'meeting'
            ? 'meeting'
            : s.category === 'break'
              ? 'break'
              : oaIcon(s.title),
      location: s.location,
      repeat: s.repeat || 'none',
      reminder: 0,
    });
  }
  void days;
  return result;
}

function oaIcon(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('java') || t.includes('code') || t.includes('program')) return 'code';
  if (t.includes('ielts') || t.includes('study') || t.includes('review') || t.includes('read')) return 'book';
  if (t.includes('project')) return 'project';
  if (t.includes('meeting') || t.includes('stand')) return 'meeting';
  if (t.includes('break') || t.includes('lunch') || t.includes('coffee') || t.includes('tea')) return 'coffee';
  if (t.includes('workout') || t.includes('gym') || t.includes('run') || t.includes('yoga')) return 'dumbbell';
  if (t.includes('commute') || t.includes('travel')) return 'travel';
  if (t.includes('meditat') || t.includes('mind')) return 'meditate';
  if (t.includes('sleep') || t.includes('wind')) return 'sleep';
  if (t.includes('email') || t.includes('admin')) return 'work';
  return 'star';
}

interface TemplateFactory {
  id: string;
  name: string;
  description: string;
  type: ScheduleType;
  build: (start: string) => Schedule;
}

function makeSchedule(
  meta: TemplateMeta,
  start: string,
  seeds: ActSeed[],
  settingsPatch: Partial<ScheduleSettings>,
): Schedule {
  const settings: ScheduleSettings = {
    ...DEFAULT_SETTINGS,
    ...settingsPatch,
  };
  settings.days = computeDaysForType(meta.type, start, settings);
  const now = Date.now();
  return {
    id: uid('sched'),
    name: meta.name,
    description: meta.description,
    type: meta.type,
    startDate: start,
    endDate: start,
    author: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
    settings,
    activities: buildActivities(seeds, start, meta.type),
    customCategories: [],
    favorite: false,
    createdAt: now,
    updatedAt: now,
    isTemplate: true,
    templateId: meta.id,
  };
}

const TEMPLATE_FACTORIES: TemplateFactory[] = [
  {
    id: 'daily-study',
    name: 'Daily Study Plan',
    description: 'A focused daily study timetable with deep-work blocks and review sessions.',
    type: 'daily',
    build: (start) =>
      makeSchedule(
        { id: 'daily-study', category: 'student', name: 'Daily Study Plan', description: 'Daily study', type: 'daily' },
        start,
        [
          { title: 'Morning Review', minutes: 30, hour: 7, minute: 30, category: 'study', priority: 'high' },
          { title: 'Deep Work — Subject 1', minutes: 120, hour: 8, category: 'study', priority: 'high', location: 'Library' },
          { title: 'Break', minutes: 15, hour: 10, category: 'break' },
          { title: 'Practice Problems', minutes: 60, hour: 10, minute: 30, category: 'study', location: 'Desk' },
          { title: 'Lunch', minutes: 45, hour: 12, category: 'break' },
          { title: 'Reading Session', minutes: 90, hour: 13, category: 'study' },
          { title: 'Study Group', minutes: 60, hour: 16, category: 'meeting' },
          { title: 'Active Recall Revision', minutes: 45, hour: 19, category: 'study' },
          { title: 'Journal & Plan Tomorrow', minutes: 20, hour: 21, category: 'personal' },
        ],
        { startTime: 7 * 60, endTime: 21.5 * 60, interval: 60, style: 'paper' },
      ),
  },
  {
    id: 'weekly-study',
    name: 'Weekly Study Timetable',
    description: 'A balanced week of study, assignments and revision sessions.',
    type: 'weekly',
    build: (start) =>
      makeSchedule(
        { id: 'weekly-study', category: 'student', name: 'Weekly Study Timetable', description: 'weekly study', type: 'weekly' },
        start,
        [
          { title: 'Java Development', minutes: 120, hour: 9, category: 'study', day: 0, repeat: 'weekdays', priority: 'high' },
          { title: 'Break', minutes: 30, hour: 11, category: 'break', day: 0, repeat: 'weekdays' },
          { title: 'IELTS Practice', minutes: 60, hour: 14, category: 'study', day: 0, repeat: 'weekdays' },
          { title: 'Project Work', minutes: 90, hour: 11, minute: 30, category: 'project', day: 0, repeat: 'weekdays' },
          { title: 'Exercise', minutes: 60, hour: 17, category: 'exercise', day: 0, repeat: 'weekdays' },
          { title: 'Mathematics', minutes: 90, hour: 9, category: 'study', day: 1, priority: 'high' },
          { title: 'Physics Lab Prep', minutes: 60, hour: 13, category: 'study', day: 1 },
          { title: 'Essay Writing', minutes: 120, hour: 10, category: 'study', day: 2 },
          { title: 'Study Group Meeting', minutes: 60, hour: 16, category: 'meeting', day: 2 },
          { title: 'Algorithms Practice', minutes: 90, hour: 9, category: 'study', day: 3 },
          { title: 'Online Course', minutes: 60, hour: 18, category: 'study', day: 3 },
          { title: 'Research Paper Reading', minutes: 90, hour: 10, category: 'study', day: 4 },
          { title: 'Weekly Review', minutes: 60, hour: 11, category: 'study', day: 5 },
          { title: 'Friends & Rest', minutes: 240, hour: 14, category: 'personal', day: 5 },
          { title: 'Light Revision', minutes: 60, hour: 10, category: 'study', day: 6 },
          { title: 'Meal Prep & Rest', minutes: 120, hour: 16, category: 'personal', day: 6 },
        ],
        { startTime: 8 * 60, endTime: 20 * 60, interval: 60, style: 'modern' },
      ),
  },
  {
    id: 'exam-prep',
    name: 'Exam Preparation',
    description: 'Intensive exam revision with mock tests, review and recovery.',
    type: 'weekly',
    build: (start) =>
      makeSchedule(
        { id: 'exam-prep', category: 'student', name: 'Exam Preparation', description: 'exam prep', type: 'weekly' },
        start,
        [
          { title: 'Mock Test — Paper A', minutes: 120, hour: 9, category: 'study', day: 0, priority: 'high' },
          { title: 'Review Mistakes', minutes: 45, hour: 11, minute: 30, category: 'study', day: 0 },
          { title: 'Topic Revision — Core', minutes: 90, hour: 14, category: 'study', day: 0 },
          { title: 'Flashcard Recall', minutes: 30, hour: 18, category: 'study', day: 0, repeat: 'weekdays' },
          { title: 'Weak Areas Focus', minutes: 120, hour: 9, category: 'study', day: 1 },
          { title: 'Practice Essay', minutes: 60, hour: 14, category: 'study', day: 2 },
          { title: 'Quick Quiz Sessions', minutes: 30, hour: 10, category: 'study', day: 3 },
          { title: 'Mock Test — Paper B', minutes: 120, hour: 9, category: 'study', day: 4, priority: 'high' },
          { title: 'Error Diary Update', minutes: 30, hour: 11, minute: 30, category: 'study', day: 4 },
          { title: 'Group Revision', minutes: 90, hour: 15, category: 'meeting', day: 4 },
          { title: 'Rest & Recharge', minutes: 180, hour: 13, category: 'personal', day: 5 },
          { title: 'Light Overview', minutes: 45, hour: 10, category: 'study', day: 6 },
        ],
        { startTime: 8 * 60, endTime: 20 * 60, interval: 30, style: 'professional', primaryColor: '#8b5cf6' },
      ),
  },
  {
    id: 'assignment-planner',
    name: 'Assignment Planner',
    description: 'Step-by-step plan to complete assignments before the deadline.',
    type: 'weekly',
    build: (start) =>
      makeSchedule(
        { id: 'assignment-planner', category: 'student', name: 'Assignment Planner', description: 'assignment planner', type: 'weekly' },
        start,
        [
          { title: 'Outline & Research', minutes: 90, hour: 10, category: 'study', day: 0 },
          { title: 'Draft Introduction', minutes: 60, hour: 14, category: 'study', day: 1 },
          { title: 'Body Paragraphs', minutes: 120, hour: 10, category: 'study', day: 2, priority: 'high' },
          { title: 'Consult Professor', minutes: 30, hour: 15, category: 'meeting', day: 2 },
          { title: 'Data & Evidence', minutes: 90, hour: 10, category: 'study', day: 3 },
          { title: 'Conclusion & References', minutes: 60, hour: 14, category: 'study', day: 4 },
          { title: 'Peer Review', minutes: 45, hour: 16, category: 'meeting', day: 4 },
          { title: 'Final Polish & Submit', minutes: 90, hour: 10, category: 'study', day: 5, priority: 'high' },
        ],
        { startTime: 9 * 60, endTime: 18 * 60, interval: 60, style: 'paper', primaryColor: '#0ea5e9' },
      ),
  },
  {
    id: 'workday',
    name: 'Workday Schedule',
    description: 'A productive 9-to-6 workday with focus blocks and meetings.',
    type: 'daily',
    build: (start) =>
      makeSchedule(
        { id: 'workday', category: 'professional', name: 'Workday Schedule', description: 'workday', type: 'daily' },
        start,
        [
          { title: 'Plan & Prioritize', minutes: 15, hour: 9, category: 'work', priority: 'high' },
          { title: 'Deep Work Block', minutes: 90, hour: 9, minute: 30, category: 'work', priority: 'high', location: 'Office' },
          { title: 'Team Stand-up', minutes: 15, hour: 11, category: 'meeting' },
          { title: 'Code Review', minutes: 45, hour: 11, minute: 30, category: 'work', location: 'Meeting room' },
          { title: 'Lunch', minutes: 60, hour: 12, minute: 30, category: 'break' },
          { title: 'Client Call', minutes: 45, hour: 13, minute: 30, category: 'meeting', priority: 'high' },
          { title: 'Feature Development', minutes: 120, hour: 14, minute: 30, category: 'work' },
          { title: 'Email & Admin', minutes: 30, hour: 16, minute: 45, category: 'work' },
          { title: 'Learn / Upskilling', minutes: 45, hour: 17, minute: 15, category: 'study' },
        ],
        { startTime: 8.5 * 60, endTime: 18.5 * 60, interval: 30, style: 'minimal' },
      ),
  },
  {
    id: 'weekly-work',
    name: 'Weekly Work Planner',
    description: 'Plan deep work, meetings and admin across the working week.',
    type: 'weekly',
    build: (start) =>
      makeSchedule(
        { id: 'weekly-work', category: 'professional', name: 'Weekly Work Planner', description: 'weekly work', type: 'weekly' },
        start,
        [
          { title: 'Deep Work — Core Task', minutes: 120, hour: 9, category: 'work', day: 0, priority: 'high', repeat: 'weekdays' },
          { title: 'Stand-up', minutes: 15, hour: 11, category: 'meeting', day: 0, repeat: 'weekdays' },
          { title: 'Inbox Zero', minutes: 30, hour: 11, minute: 30, category: 'work', day: 0, repeat: 'weekdays' },
          { title: 'Client Meeting', minutes: 60, hour: 14, category: 'meeting', day: 0 },
          { title: 'Sprint Planning', minutes: 60, hour: 15, category: 'meeting', day: 0 },
          { title: 'Writing / Documentation', minutes: 90, hour: 13, category: 'work', day: 1 },
          { title: 'Design Review', minutes: 60, hour: 15, category: 'meeting', day: 1 },
          { title: 'Product Sync', minutes: 45, hour: 14, category: 'meeting', day: 2 },
          { title: 'Admin & Reporting', minutes: 60, hour: 16, category: 'work', day: 3 },
          { title: 'Friday Retrospective', minutes: 45, hour: 15, category: 'meeting', day: 4 },
          { title: 'Personal Development', minutes: 60, hour: 11, category: 'personal', day: 4 },
        ],
        { startTime: 9 * 60, endTime: 17.5 * 60, interval: 30, style: 'modern' },
      ),
  },
  {
    id: 'project-schedule',
    name: 'Project Schedule',
    description: 'Ship a project with weekly milestones, reviews and buffers.',
    type: 'weekly',
    build: (start) =>
      makeSchedule(
        { id: 'project-schedule', category: 'professional', name: 'Project Schedule', description: 'project schedule', type: 'weekly' },
        start,
        [
          { title: 'Milestone Planning', minutes: 60, hour: 9, category: 'project', day: 0, priority: 'high' },
          { title: 'Scoping & Requirements', minutes: 120, hour: 10, category: 'project', day: 0 },
          { title: 'Architecture Design', minutes: 120, hour: 10, category: 'project', day: 1, priority: 'high' },
          { title: 'Implementation Sprint', minutes: 180, hour: 9, category: 'project', day: 2, priority: 'high' },
          { title: 'Code Review', minutes: 60, hour: 14, category: 'project', day: 2 },
          { title: 'Implementation Sprint', minutes: 180, hour: 9, category: 'project', day: 3, priority: 'high' },
          { title: 'Testing & Bug Fixing', minutes: 120, hour: 10, category: 'project', day: 4 },
          { title: 'Weekly Demo Prep', minutes: 60, hour: 15, category: 'project', day: 4 },
          { title: 'Buffer / Overflow', minutes: 120, hour: 10, category: 'project', day: 5 },
          { title: 'Rest Week', minutes: 300, hour: 13, category: 'personal', day: 5 },
        ],
        { startTime: 9 * 60, endTime: 18 * 60, interval: 30, style: 'professional', primaryColor: '#ec4899' },
      ),
  },
  {
    id: 'meeting-planner',
    name: 'Meeting Planner',
    description: 'Structure your day around meetings with prep and follow-up.',
    type: 'daily',
    build: (start) =>
      makeSchedule(
        { id: 'meeting-planner', category: 'professional', name: 'Meeting Planner', description: 'meeting planner', type: 'daily' },
        start,
        [
          { title: 'Meeting Prep Block', minutes: 45, hour: 8, minute: 45, category: 'work', priority: 'high' },
          { title: 'Morning Sync', minutes: 30, hour: 9, minute: 30, category: 'meeting' },
          { title: 'Client Presentation', minutes: 90, hour: 10, category: 'meeting', priority: 'high' },
          { title: 'Follow-up Actions', minutes: 30, hour: 11, minute: 45, category: 'work' },
          { title: 'Lunch', minutes: 60, hour: 12, minute: 30, category: 'break' },
          { title: '1:1 with Manager', minutes: 30, hour: 13, minute: 30, category: 'meeting' },
          { title: 'Cross-team Workshop', minutes: 90, hour: 14, category: 'meeting' },
          { title: 'Deep Work — No Meetings', minutes: 90, hour: 16, category: 'work', priority: 'high' },
        ],
        { startTime: 8 * 60, endTime: 18 * 60, interval: 30, style: 'minimal', primaryColor: '#8b5cf6' },
      ),
  },
  {
    id: 'daily-routine',
    name: 'Daily Routine',
    description: 'A calm personal routine: morning, work, and evening wind-down.',
    type: 'daily',
    build: (start) =>
      makeSchedule(
        { id: 'daily-routine', category: 'personal', name: 'Daily Routine', description: 'daily routine', type: 'daily' },
        start,
        [
          { title: 'Wake Up & Stretch', minutes: 20, hour: 6, minute: 45, category: 'personal' },
          { title: 'Morning Journal', minutes: 15, hour: 7, minute: 15, category: 'personal' },
          { title: 'Breakfast', minutes: 30, hour: 7, minute: 30, category: 'break' },
          { title: 'Focus Work', minutes: 120, hour: 9, category: 'work', priority: 'high' },
          { title: 'Coffee Break', minutes: 15, hour: 11, category: 'break' },
          { title: 'Deep Work Session 2', minutes: 90, hour: 11, minute: 15, category: 'work' },
          { title: 'Lunch & Walk', minutes: 60, hour: 13, category: 'break' },
          { title: 'Learning Hour', minutes: 60, hour: 15, category: 'study' },
          { title: 'Household Tasks', minutes: 45, hour: 16, category: 'personal' },
          { title: 'Dinner', minutes: 60, hour: 19, category: 'break' },
          { title: 'Reading', minutes: 45, hour: 20, category: 'study' },
          { title: 'Wind Down & Sleep', minutes: 60, hour: 21, minute: 30, category: 'personal' },
        ],
        { startTime: 6.5 * 60, endTime: 23 * 60, interval: 60, style: 'paper', primaryColor: '#10b981' },
      ),
  },
  {
    id: 'habit-schedule',
    name: 'Habit Schedule',
    description: 'Anchor daily habits and healthy routines into your week.',
    type: 'weekly',
    build: (start) =>
      makeSchedule(
        { id: 'habit-schedule', category: 'personal', name: 'Habit Schedule', description: 'habit schedule', type: 'weekly' },
        start,
        [
          { title: 'Meditation', minutes: 15, hour: 7, category: 'personal', day: 0, repeat: 'weekdays' },
          { title: 'Hydration & Stretch', minutes: 10, hour: 8, category: 'personal', day: 0, repeat: 'daily' },
          { title: 'Read 20 Pages', minutes: 25, hour: 21, category: 'study', day: 0, repeat: 'daily' },
          { title: 'Journal', minutes: 15, hour: 21, minute: 30, category: 'personal', day: 0, repeat: 'daily' },
          { title: 'Run', minutes: 45, hour: 18, category: 'exercise', day: 1 },
          { title: 'Strength Training', minutes: 60, hour: 18, category: 'exercise', day: 3 },
          { title: 'Yoga', minutes: 45, hour: 9, category: 'exercise', day: 5 },
          { title: 'Hiking / Outdoor', minutes: 120, hour: 10, category: 'exercise', day: 6 },
          { title: 'Meal Prep', minutes: 90, hour: 15, category: 'personal', day: 6 },
        ],
        { startTime: 6.5 * 60, endTime: 22 * 60, interval: 60, style: 'notebook', primaryColor: '#f59e0b' },
      ),
  },
  {
    id: 'fitness-planner',
    name: 'Fitness Planner',
    description: 'Weekly training split with rest, mobility and meal prep.',
    type: 'weekly',
    build: (start) =>
      makeSchedule(
        { id: 'fitness-planner', category: 'personal', name: 'Fitness Planner', description: 'fitness planner', type: 'weekly' },
        start,
        [
          { title: 'Upper Body Strength', minutes: 60, hour: 7, category: 'exercise', day: 0, priority: 'high' },
          { title: 'Protein Meal Prep', minutes: 45, hour: 18, category: 'personal', day: 0 },
          { title: 'Cardio Intervals', minutes: 45, hour: 7, category: 'exercise', day: 1 },
          { title: 'Lower Body Strength', minutes: 60, hour: 7, category: 'exercise', day: 2, priority: 'high' },
          { title: 'Core & Mobility', minutes: 30, hour: 18, category: 'exercise', day: 2 },
          { title: 'Active Recovery Walk', minutes: 60, hour: 12, category: 'exercise', day: 3 },
          { title: 'Full Body Workout', minutes: 75, hour: 7, category: 'exercise', day: 4 },
          { title: 'Rest & Stretch', minutes: 60, hour: 10, category: 'personal', day: 5 },
          { title: 'Long Run / Hike', minutes: 120, hour: 7, category: 'exercise', day: 6 },
          { title: 'Grocery & Meal Prep', minutes: 90, hour: 17, category: 'personal', day: 6 },
        ],
        { startTime: 6.5 * 60, endTime: 19.5 * 60, interval: 60, style: 'modern', primaryColor: '#f59e0b' },
      ),
  },
  {
    id: 'productivity-plan',
    name: 'Personal Productivity',
    description: 'Time-blocking for deep work, learning and personal projects.',
    type: 'weekly',
    build: (start) =>
      makeSchedule(
        { id: 'productivity-plan', category: 'personal', name: 'Personal Productivity', description: 'personal productivity', type: 'weekly' },
        start,
        [
          { title: 'Deep Work Block', minutes: 90, hour: 9, category: 'project', day: 0, priority: 'high', repeat: 'weekdays' },
          { title: 'Break', minutes: 15, hour: 10, minute: 30, category: 'break', day: 0, repeat: 'weekdays' },
          { title: 'Learn New Skill', minutes: 60, hour: 11, category: 'study', day: 0, repeat: 'weekdays' },
          { title: 'Admin & Emails', minutes: 30, hour: 13, category: 'work', day: 0, repeat: 'weekdays' },
          { title: 'Side Project', minutes: 90, hour: 16, category: 'project', day: 0, repeat: 'weekdays' },
          { title: 'Weekly Review', minutes: 45, hour: 10, category: 'personal', day: 5 },
          { title: 'Plan Next Week', minutes: 30, hour: 11, category: 'personal', day: 6 },
        ],
        { startTime: 9 * 60, endTime: 18 * 60, interval: 30, style: 'minimal' },
      ),
  },
];

export function getTemplateMeta(id: string): TemplateMeta | undefined {
  return TEMPLATE_META.find((t) => t.id === id);
}

export function buildTemplate(id: string, startDate = todayKey()): Schedule | null {
  const factory = TEMPLATE_FACTORIES.find((t) => t.id === id);
  if (!factory) return null;
  return factory.build(startDate);
}

export function buildDemoWeekly(startDate = todayKey()): Schedule {
  const monday = startDate;
  return makeSchedule(
    {
      id: 'demo-weekly',
      category: 'personal',
      name: 'Weekly Productivity Plan',
      description: 'A sample week to help you explore SmartSchedule. Delete it any time.',
      type: 'weekly',
    },
    monday,
    [
      { title: 'Morning Routine', minutes: 60, hour: 8, category: 'personal', day: 0, repeat: 'weekdays' },
      { title: 'Java Development', minutes: 120, hour: 9, category: 'project', day: 0, repeat: 'weekdays', priority: 'high', description: 'Build the scheduling engine module' },
      { title: 'Break', minutes: 30, hour: 11, category: 'break', day: 0, repeat: 'weekdays' },
      { title: 'Project Work', minutes: 60, hour: 11, minute: 30, category: 'project', day: 0, repeat: 'weekdays' },
      { title: 'IELTS Practice', minutes: 60, hour: 14, category: 'study', day: 0, repeat: 'weekdays', priority: 'high' },
      { title: 'Exercise', minutes: 60, hour: 16, category: 'exercise', day: 0, repeat: 'weekdays' },
      { title: 'Personal Time', minutes: 120, hour: 18, category: 'personal', day: 0, repeat: 'weekdays' },
    ],
    { startTime: 8 * 60, endTime: 20 * 60, interval: 60, style: 'modern', showLegend: true },
  );
}