import { useCallback, useRef, useState } from 'react';

export function useHistory<T>(initial: T, limit = 100) {
  const [state, setState] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);

  const commit = useCallback((next: T, prev: T) => {
    past.current = [...past.current.slice(-(limit - 1)), prev];
    future.current = [];
    setState(next);
  }, [limit]);

  const undo = useCallback((): T | null => {
    const prev = past.current.pop();
    if (prev === undefined) return null;
    future.current = [...future.current, state];
    setState(prev);
    return prev;
  }, [state]);

  const redo = useCallback((): T | null => {
    const next = future.current.pop();
    if (next === undefined) return null;
    past.current = [...past.current, state];
    setState(next);
    return next;
  }, [state]);

  const reset = useCallback((next: T) => {
    past.current = [];
    future.current = [];
    setState(next);
  }, []);

  return {
    state,
    setState,
    commit,
    undo,
    redo,
    reset,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    historyLength: past.current.length,
    futureLength: future.current.length,
  };
}