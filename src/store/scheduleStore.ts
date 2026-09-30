import { create } from 'zustand';
import type { Schedule } from '../types';
import {
  deleteSchedule as dbDelete,
  getAllSchedules,
  putSchedule,
} from '../services/db';
import { scheduleDuplicate } from '../utils/schedule';
import { uid } from '../utils/id';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ScheduleStore {
  schedules: Schedule[];
  hydrated: boolean;
  saveState: SaveState;
  lastSavedAt: number | null;
  storageEstimate: number | null;
  loadAll: () => Promise<number>;
  upsert: (schedule: Schedule) => void;
  delete: (id: string) => void;
  clearAll: () => void;
  toggleFavorite: (id: string) => void;
  duplicate: (id: string) => Schedule | null;
  rename: (id: string, name: string) => void;
  importSchedules: (schedules: Schedule[]) => void;
  getById: (id: string) => Schedule | undefined;
}

const dirtyIds = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let saving = false;

async function flush(writeToStorage: (fn: () => Promise<unknown>) => void) {
  if (saving) return;
  saving = true;
  writeToStorage?.(() => Promise.resolve());
  const ids = Array.from(dirtyIds);
  dirtyIds.clear();
  for (const id of ids) {
    const latest = useScheduleStore.getState().schedules.find((s) => s.id === id);
    if (latest) {
      try {
        await putSchedule(latest);
      } catch {
        dirtyIds.add(id);
      }
    }
  }
  saving = false;
  const remaining = dirtyIds.size;
  useScheduleStore.setState({
    saveState: remaining > 0 ? 'error' : 'saved',
    lastSavedAt: remaining > 0 ? useScheduleStore.getState().lastSavedAt : Date.now(),
  });
  setTimeout(() => {
    if (useScheduleStore.getState().saveState === 'saved') {
      useScheduleStore.setState({ saveState: 'idle' });
    }
  }, 2500);
}

function scheduleFlush() {
  useScheduleStore.setState({ saveState: 'saving' });
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => flush(() => {}), 350);
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  schedules: [],
  hydrated: false,
  saveState: 'idle',
  lastSavedAt: null,
  storageEstimate: null,

  loadAll: async () => {
    if (!get().hydrated) {
      const all = await getAllSchedules().catch(() => [] as Schedule[]);
      all.sort((a, b) => b.updatedAt - a.updatedAt);
      set({ schedules: all, hydrated: true });
      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        navigator.storage.estimate().then((e) => {
          if (typeof e.usage === 'number') set({ storageEstimate: e.usage });
        }).catch(() => {});
      }
    }
    return get().schedules.length;
  },

  upsert: (schedule) => {
    const existing = get().schedules.some((s) => s.id === schedule.id);
    const updated: Schedule = { ...schedule, updatedAt: Date.now() };
    set({
      schedules: existing
        ? get().schedules.map((s) => (s.id === schedule.id ? updated : s))
        : [updated, ...get().schedules],
      saveState: 'saving',
    });
    dirtyIds.add(updated.id);
    scheduleFlush();
  },

  delete: (id) => {
    set({ schedules: get().schedules.filter((s) => s.id !== id) });
    dbDelete(id).catch(() => {});
  },

  clearAll: () => {
    set({ schedules: [] });
    dirtyIds.clear();
  },

  toggleFavorite: (id) => {
    set({
      schedules: get().schedules.map((s) =>
        s.id === id ? { ...s, favorite: !s.favorite, updatedAt: Date.now() } : s,
      ),
    });
    const s = get().schedules.find((x) => x.id === id);
    if (s) {
      dirtyIds.add(s.id);
      scheduleFlush();
    }
  },

  duplicate: (id) => {
    const src = get().schedules.find((s) => s.id === id);
    if (!src) return null;
    const copy = scheduleDuplicate(src);
    set({ schedules: [copy, ...get().schedules] });
    dirtyIds.add(copy.id);
    scheduleFlush();
    return copy;
  },

  rename: (id, name) => {
    const s = get().schedules.find((x) => x.id === id);
    if (!s) return;
    const updated = { ...s, name, updatedAt: Date.now() };
    set({ schedules: get().schedules.map((x) => (x.id === id ? updated : x)) });
    dirtyIds.add(id);
    scheduleFlush();
  },

  importSchedules: (schedules) => {
    const existingIds = new Set(get().schedules.map((s) => s.id));
    const fresh = schedules.map((s) =>
      existingIds.has(s.id) ? { ...s, id: uid('sched') } : s,
    );
    set({ schedules: [...fresh, ...get().schedules] });
    fresh.forEach((s) => dirtyIds.add(s.id));
    scheduleFlush();
  },

  getById: (id) => {
    return get().schedules.find((s) => s.id === id);
  },
}));