import type { Schedule } from '../types';
import { downloadFile } from '../utils/id';
import { sanitizeSchedule } from '../utils/schedule';

export function exportScheduleJson(schedule: Schedule, filename = 'schedule.json'): void {
  const payload = {
    app: 'SmartSchedule',
    version: 1,
    exportedAt: new Date().toISOString(),
    schedule,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadFile(filename, blob);
}

export function importScheduleJson(file: File): Promise<Schedule[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        const arr: unknown[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { schedules?: unknown[] }).schedules)
            ? (raw as { schedules: unknown[] }).schedules
            : [raw];
        const schedules = arr
          .map((item) => {
            const maybe = typeof item === 'object' && item !== null && 'schedule' in item ? (item as { schedule: unknown }).schedule : item;
            return sanitizeSchedule(maybe);
          })
          .filter((s): s is Schedule => s !== null);
        if (schedules.length === 0) {
          reject(new Error('No valid schedules found in this file.'));
          return;
        }
        resolve(schedules);
      } catch {
        reject(new Error('Invalid JSON file.'));
      }
    };
    reader.readAsText(file);
  });
}