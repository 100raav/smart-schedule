import type { Schedule } from '../types';

const DB_NAME = 'smartschedule';
const DB_VERSION = 1;
const STORE_SCHEDULES = 'schedules';
const STORE_KV = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  }
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SCHEDULES)) {
        db.createObjectStore(STORE_SCHEDULES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_KV)) {
        db.createObjectStore(STORE_KV, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open database.'));
    req.onblocked = () => reject(new Error('Database upgrade is blocked.'));
  });
  return dbPromise;
}

function withStore<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error(`Transaction on ${store} failed.`));
      }),
  );
}

export async function getAllSchedules(): Promise<Schedule[]> {
  return withStore(STORE_SCHEDULES, 'readonly', (s) =>
    s.getAll(),
  ) as Promise<Schedule[]>;
}

export async function getSchedule(id: string): Promise<Schedule | undefined> {
  const result = await withStore(STORE_SCHEDULES, 'readonly', (s) =>
    s.get(id),
  );
  return result as Schedule | undefined;
}

export async function putSchedule(schedule: Schedule): Promise<void> {
  await withStore(STORE_SCHEDULES, 'readwrite', (s) =>
    s.put(structuredClone(schedule)),
  );
}

export async function putSchedulesBatch(schedules: Schedule[]): Promise<void> {
  if (schedules.length === 0) return;
  await withStore(STORE_SCHEDULES, 'readwrite', (s) => {
    schedules.forEach((sch) => s.put(structuredClone(sch)));
    return s.put(structuredClone(schedules[0]));
  });
}

export async function deleteSchedule(id: string): Promise<void> {
  await withStore(STORE_SCHEDULES, 'readwrite', (s) => s.delete(id));
}

export async function clearSchedules(): Promise<void> {
  await withStore(STORE_SCHEDULES, 'readwrite', (s) => s.clear());
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const row = await withStore(STORE_KV, 'readonly', (s) => s.get(key));
  return row ? (row as { key: string; value: T }).value : undefined;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await withStore(STORE_KV, 'readwrite', (s) => s.put({ key, value }));
}

export async function kvDel(key: string): Promise<void> {
  await withStore(STORE_KV, 'readwrite', (s) => s.delete(key));
}