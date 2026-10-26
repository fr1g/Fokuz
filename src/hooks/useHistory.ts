import { useCallback, useState } from 'react';

const LIMIT = 100;

function sameValue<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Snapshot-based undo/redo.
 * - set: replace present without touching history (live gesture preview)
 * - commit: push present to past and adopt value (discrete changes)
 * - commitBaseline: for finished gestures — present already holds the final
 *   value, push the gesture-start snapshot onto past instead
 */
export function useHistory<T>(initial: T) {
  const [record, setRecord] = useState({
    past: [] as T[],
    present: initial,
    future: [] as T[],
  });

  const set = useCallback((value: T) => {
    setRecord((r) => (sameValue(r.present, value) ? r : { ...r, present: value }));
  }, []);

  const commit = useCallback((value: T) => {
    setRecord((r) =>
      sameValue(r.present, value)
        ? r
        : { past: [...r.past, r.present].slice(-LIMIT), present: value, future: [] },
    );
  }, []);

  const commitBaseline = useCallback((baseline: T) => {
    setRecord((r) =>
      sameValue(baseline, r.present)
        ? r
        : { past: [...r.past, baseline].slice(-LIMIT), present: r.present, future: [] },
    );
  }, []);

  const undo = useCallback(() => {
    setRecord((r) => {
      if (r.past.length === 0) return r;
      const past = [...r.past];
      const present = past.pop()!;
      return { past, present, future: [r.present, ...r.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setRecord((r) => {
      if (r.future.length === 0) return r;
      const [present, ...future] = r.future;
      return { past: [...r.past, r.present], present, future };
    });
  }, []);

  const reset = useCallback((value: T) => {
    setRecord({ past: [], present: value, future: [] });
  }, []);

  return {
    state: record.present,
    set,
    commit,
    commitBaseline,
    undo,
    redo,
    reset,
    canUndo: record.past.length > 0,
    canRedo: record.future.length > 0,
  };
}
