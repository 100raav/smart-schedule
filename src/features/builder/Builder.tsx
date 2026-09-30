import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Copy,
  ClipboardPaste,
  Plus,
  Sparkles,
  Palette,
  Eye,
  Keyboard,
  Trash2,
  Settings2,
  MoreVertical,
  Save,
  CalendarRange,
  Download,
  Upload,
} from 'lucide-react';
import type { Activity, Schedule } from '../../types';
import { useScheduleStore, type SaveState } from '../../store/scheduleStore';
import { useUIStore } from '../../store/uiStore';
import { useHistory } from '../../hooks/useHistory';
import { uid } from '../../utils/id';
import { Button } from '../../components/ui/Button';
import { ScheduleGrid } from '../scheduler/ScheduleGrid';
import { ActivityModal } from '../scheduler/ActivityModal';
import { SmartSchedulerPanel } from '../scheduler/SmartSchedulerPanel';
import { CustomizePanel } from '../scheduler/CustomizePanel';
import { ScheduleConfigPanel } from '../scheduler/ScheduleConfigPanel';
import { PreviewModal } from '../preview/PreviewModal';
import { EmptyState } from '../../components/ui/Misc';
import { exportScheduleJson, importScheduleJson } from '../../services/jsonService';

export default function Builder() {
  const { id } = useParams<{ id: string }>();
  const schedules = useScheduleStore((s) => s.schedules);
  const hydrated = useScheduleStore((s) => s.hydrated);
  const saveState = useScheduleStore((s) => s.saveState);
  const upsert = useScheduleStore((s) => s.upsert);
  const toast = useUIStore((s) => s.toast);

  const schedule = useMemo(
    () => schedules.find((s) => s.id === id),
    [schedules, id],
  );

  const history = useHistory<Activity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activityModal, setActivityModal] = useState<{
    open: boolean;
    preset: Partial<Activity> | null;
    day?: string;
    start?: number;
  }>({ open: false, preset: null });
  const [smartOpen, setSmartOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [clipboard, setClipboard] = useState<Activity | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (schedule) {
      history.reset(schedule.activities);
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule?.id]);

  const persist = useCallback(
    (next: Schedule) => {
      upsert(next);
    },
    [upsert],
  );

  const updateSchedule = useCallback(
    (next: Schedule) => {
      persist(next);
    },
    [persist],
  );

  if (!hydrated) {
    return (
      <div className="grid h-full place-items-center">
        <div className="skeleton h-8 w-48" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="grid h-full place-items-center p-6">
        <EmptyState
          icon={<CalendarRange size={26} />}
          title="Schedule not found"
          description="This schedule may have been deleted on another device or session."
          action={
            <Link to="/schedules">
              <Button variant="primary">Go to My Schedules</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const updateActivities = (updater: (acts: Activity[]) => Activity[]) => {
    const prev = history.state;
    const next = updater(prev);
    history.commit(next, prev);
    updateSchedule({ ...schedule, activities: next });
  };

  const handleMove = (actId: string, day: string, start: number, end: number) => {
    updateActivities((acts) =>
      acts.map((a) => (a.id === actId ? { ...a, date: day, start, end } : a)),
    );
  };

  const handleSaveActivity = (draft: Omit<Activity, 'id'> & { id?: string }, isNew: boolean) => {
    if (isNew) {
      const act: Activity = { ...draft, id: uid('act') };
      updateActivities((acts) => [...acts, act]);
      toast('success', 'Activity added', act.title);
    } else {
      updateActivities((acts) => acts.map((a) => (a.id === draft.id ? ({ ...a, ...draft } as Activity) : a)));
      toast('success', 'Activity updated', draft.title);
    }
  };

  const handleDuplicate = (actId: string) => {
    const src = schedule.activities.find((a) => a.id === actId);
    if (!src) return;
    updateActivities((acts) => [...acts, { ...src, id: uid('act'), start: src.start + 60, end: src.end + 60 }]);
    toast('success', 'Activity duplicated');
  };

  const handleDelete = (actId: string) => {
    const act = schedule.activities.find((a) => a.id === actId);
    updateActivities((acts) => acts.filter((a) => a.id !== actId));
    if (selectedId === actId) setSelectedId(null);
    if (act) toast('info', 'Activity deleted', act.title);
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    handleDelete(selectedId);
  };

  const handleCopy = () => {
    const act = schedule.activities.find((a) => a.id === selectedId);
    if (!act) {
      toast('info', 'Select an activity first', 'Click an activity, then copy.');
      return;
    }
    setClipboard(act);
    toast('success', 'Copied to clipboard', act.title);
  };

  const handlePaste = (day?: string, start?: number) => {
    if (!clipboard) {
      toast('info', 'Nothing to paste', 'Copy an activity first.');
      return;
    }
    const newAct: Activity = {
      ...clipboard,
      id: uid('act'),
      date: day || clipboard.date,
      start: start ?? clipboard.start,
      end: (start ?? clipboard.start) + (clipboard.end - clipboard.start),
    };
    updateActivities((acts) => [...acts, newAct]);
    toast('success', 'Activity pasted', newAct.title);
  };

  const handleSaveNow = () => {
    upsert({ ...schedule, activities: history.state, updatedAt: Date.now() });
    toast('success', 'Schedule saved locally', schedule.name);
  };

  const handleSmartApply = (
    activities: Omit<Activity, 'id'>[],
    name: string,
    patch: {
      startTime: number;
      endTime: number;
      interval: number;
      days: string[];
      type: Schedule['type'];
    },
  ) => {
    const next: Schedule = {
      ...schedule,
      name: schedule.name === 'Untitled Schedule' ? name : schedule.name,
      type: patch.type,
      startDate: schedule.startDate,
      settings: {
        ...schedule.settings,
        startTime: patch.startTime,
        endTime: patch.endTime,
        interval: patch.interval,
        days: patch.days,
      },
      activities: activities.map((a) => ({ ...a, id: uid('act') })),
    };
    history.commit(next.activities, []);
    updateSchedule(next);
    setSmartOpen(false);
    toast('success', 'Smart schedule applied', `${activities.length} activities generated`);
  };

  const handleImportFile = async (file: File) => {
    try {
      const imported = await importScheduleJson(file);
      upsert({ ...imported[0], id: schedule.id, name: imported[0].name });
      toast('success', 'Schedule imported', file.name);
    } catch (e) {
      toast('error', 'Import failed', (e as Error).message);
    }
  };

  const fileName = (schedule.name || 'schedule').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const Toolbar = () => {
    return (
      <header className="no-print z-30 flex items-center gap-2 border-b border-ink-100 dark:border-white/10 bg-white dark:bg-[#17181f] px-3 sm:px-4 py-2.5">
        <Link to="/schedules" className="btn-ghost h-9 w-9 p-0" aria-label="Back to schedules">
          <ArrowLeft size={17} />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            ref={nameRef}
            value={schedule.name}
            onChange={(e) => updateSchedule({ ...schedule, name: e.target.value })}
            aria-label="Schedule name"
            className="w-full max-w-[240px] truncate rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-ink-900 dark:text-white focus:border-ink-200 dark:focus:border-white/20 focus:bg-white dark:focus:bg-white/5"
          />
          <span className="chip hidden sm:inline-flex border-ink-200 dark:border-white/15 text-ink-500">
            {schedule.type}
          </span>
          <SaveIndicator state={saveState} />
        </div>
        <div className="flex items-center gap-1">
          <ToolBtn label="Undo (Ctrl+Z)" onClick={() => { const prev = history.undo(); if (prev) updateSchedule({ ...schedule, activities: prev }); }} disabled={!history.canUndo}>
            <RotateCcw size={16} />
          </ToolBtn>
          <ToolBtn label="Redo (Ctrl+Shift+Z)" onClick={() => { const next = history.redo(); if (next) updateSchedule({ ...schedule, activities: next }); }} disabled={!history.canRedo}>
            <RotateCw size={16} />
          </ToolBtn>
          <div className="mx-1 hidden h-5 w-px bg-ink-200 dark:bg-white/10 sm:block" />
          <ToolBtn label="Copy selected (Ctrl+C)" onClick={handleCopy}>
            <Copy size={16} />
          </ToolBtn>
          <ToolBtn label="Paste (Ctrl+V)" onClick={() => handlePaste()}>
            <ClipboardPaste size={16} />
          </ToolBtn>
          <div className="mx-1 hidden h-5 w-px bg-ink-200 dark:bg-white/10 sm:block" />
          <ToolBtn label="Schedule settings" onClick={() => setConfigOpen((v) => !v)} className="hidden sm:inline-flex">
            <Settings2 size={16} />
          </ToolBtn>
          <ToolBtn label="Customize design" onClick={() => setCustomizeOpen(true)}>
            <Palette size={16} />
          </ToolBtn>
          <ToolBtn label="Smart schedule" onClick={() => setSmartOpen(true)} className="hidden sm:inline-flex">
            <Sparkles size={16} />
          </ToolBtn>
          <Button size="md" className="hidden sm:inline-flex" onClick={() => setActivityModal({ open: true, preset: null, day: schedule.settings.days[0], start: schedule.settings.startTime + schedule.settings.interval })}>
            <Plus size={16} /> Add Activity
          </Button>
          <ToolBtn label="Preview & export" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} />
          </ToolBtn>
          <ToolBtn label="Keyboard shortcuts" onClick={() => useUIStore.getState().setShortcutsOpen(true)} className="hidden md:inline-flex">
            <Keyboard size={16} />
          </ToolBtn>
          <ToolBtn label="More actions" onClick={() => setMoreOpen((v) => !v)}>
            <MoreVertical size={16} />
          </ToolBtn>
        </div>
      </header>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <Toolbar />

      <div className="flex flex-1 min-h-0">
        <AnimatePresence>
          {configOpen && (
            <motion.aside
              key="config"
              aria-label="Schedule configuration"
              className="no-print hidden lg:block w-[300px] shrink-0 border-r border-ink-100 dark:border-white/10 bg-white dark:bg-[#17181f] overflow-y-auto"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
            >
              <ScheduleConfigPanel schedule={schedule} onUpdate={updateSchedule} onSmartOpen={() => setSmartOpen(true)} />
            </motion.aside>
          )}
        </AnimatePresence>

        <main className="relative flex-1 min-w-0 overflow-auto bg-ink-50/60 dark:bg-[#121318]">
          <div className="p-3 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm text-ink-500 dark:text-ink-400">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarRange size={14} />
                  {schedule.type} · {schedule.settings.days.length} day{daysPlural(schedule.settings.days.length)}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5">
                  {formatRange(schedule)}
                </span>
              </div>
              {schedule.activities.length === 0 ? (
                <span className="text-xs text-ink-400">Empty schedule — add your first activity below.</span>
              ) : (
                <span className="text-xs text-ink-400">{schedule.activities.length} activities</span>
              )}
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-ink-100 dark:border-white/10 bg-white dark:bg-white/[0.02]">
              {schedule.activities.length === 0 ? (
                <EmptySchedule
                  onAdd={() => setActivityModal({ open: true, preset: null, day: schedule.settings.days[0] })}
                  onSmart={() => setSmartOpen(true)}
                />
              ) : (
                <ScheduleGrid
                  schedule={schedule}
                  interactive
                  selectedId={selectedId}
                  onSelectActivity={setSelectedId}
                  onMoveActivity={handleMove}
                  onDuplicateActivity={handleDuplicate}
                  onDeleteActivity={handleDelete}
                  onEditActivity={(aid) => {
                    const act = schedule.activities.find((a) => a.id === aid);
                    if (act) setActivityModal({ open: true, preset: act });
                  }}
                  onAddActivity={(day, start) => setActivityModal({ open: true, preset: null, day, start })}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Action bar for thin screens */}
      <div className="no-print lg:hidden fixed bottom-20 inset-x-4 z-30 flex items-center justify-center gap-1 rounded-2xl bg-white/90 dark:bg-[#1b1c23]/90 backdrop-blur border border-ink-100 dark:border-white/10 shadow-lift p-1.5">
        <ActionIcon label="Add activity" onClick={() => setActivityModal({ open: true, preset: null, day: schedule.settings.days[0], start: schedule.settings.startTime + schedule.settings.interval })}>
          <Plus size={18} />
        </ActionIcon>
        <ActionIcon label="Smart schedule" onClick={() => setSmartOpen(true)}>
          <Sparkles size={18} />
        </ActionIcon>
        <ActionIcon label="Customize" onClick={() => setCustomizeOpen(true)}>
          <Palette size={18} />
        </ActionIcon>
        <ActionIcon label="Schedule settings" onClick={() => setConfigOpen((v) => !v)}>
          <Settings2 size={18} />
        </ActionIcon>
        <ActionIcon label="Preview & export" onClick={() => setPreviewOpen(true)}>
          <Eye size={18} />
        </ActionIcon>
      </div>

      {configOpen && (
        <MobileConfigSheet schedule={schedule} onUpdate={updateSchedule} onClose={() => setConfigOpen(false)} onSmartOpen={() => setSmartOpen(true)} />
      )}

      <ActivityModal
        open={activityModal.open}
        onClose={() => setActivityModal({ open: false, preset: null })}
        schedule={schedule}
        preset={activityModal.preset}
        defaultDay={activityModal.day}
        defaultStart={activityModal.start}
        onSave={handleSaveActivity}
      />

      <SmartSchedulerPanel
        open={smartOpen}
        onClose={() => setSmartOpen(false)}
        schedule={schedule}
        onApply={handleSmartApply}
      />

      <CustomizePanel
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        settings={schedule.settings}
        onUpdate={(patch) => updateSchedule({ ...schedule, settings: { ...schedule.settings, ...patch } })}
      />

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        schedule={schedule}
        onEdit={() => setPreviewOpen(false)}
      />

      {moreOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setMoreOpen(false)}>
          <div className="absolute right-3 top-16 z-10 w-56 overflow-hidden rounded-xl border border-ink-100 dark:border-white/10 bg-white dark:bg-[#1b1c23] shadow-lift p-1.5 no-print">
            <MenuBtn onClick={() => { setClipboard(schedule.activities.find((a) => a.id === selectedId) || null); toast('info', selectedId ? 'Copied' : 'Copy an activity first'); }}>
              <Copy size={14} /> Copy selected
            </MenuBtn>
            <MenuBtn onClick={() => handlePaste()}>
              <ClipboardPaste size={14} /> Paste
            </MenuBtn>
            <MenuBtn onClick={() => { exportScheduleJson(schedule, `${fileName}.json`); toast('success', 'Schedule exported as JSON'); }}>
              <Download size={14} /> Export data
            </MenuBtn>
            <MenuBtn onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Import data
            </MenuBtn>
            <MenuBtn onClick={handleDeleteSelected}>
              <Trash2 size={14} /> Delete selected
            </MenuBtn>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportFile(f);
          e.target.value = '';
        }}
      />

      <ShortcutListener
        onAdd={() => setActivityModal({ open: true, preset: null, day: schedule.settings.days[0], start: schedule.settings.startTime + schedule.settings.interval })}
        onSave={handleSaveNow}
        onPreview={() => setPreviewOpen(true)}
        onUndo={() => { const prev = history.undo(); if (prev) updateSchedule({ ...schedule, activities: prev }); }}
        onRedo={() => { const next = history.redo(); if (next) updateSchedule({ ...schedule, activities: next }); }}
        onDeleteSelected={handleDeleteSelected}
        onCopy={handleCopy}
        onPaste={() => handlePaste()}
        onOpenShortcuts={() => useUIStore.getState().setShortcutsOpen(true)}
      />
    </div>
  );
}

function daysPlural(n: number): string {
  return n === 1 ? '' : 's';
}

function formatRange(s: Schedule): string {
  const days = s.settings.days;
  if (days.length === 1) return days[0];
  return `${days[0]} → ${days[days.length - 1]}`;
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span className="ml-1 hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 dark:text-ink-500">
      {state === 'saving' && (
        <>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" /> Saving…
        </>
      )}
      {state === 'saved' && (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Saved locally
        </>
      )}
      {(state === 'idle' || state === 'error') && (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-ink-300 dark:bg-white/25" /> Auto-save on
          <Save size={12} />
        </>
      )}
    </span>
  );
}

function ToolBtn({
  label,
  onClick,
  children,
  disabled,
  className = '',
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`btn-ghost h-9 w-9 p-0 ${className}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function ActionIcon({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="btn-ghost h-11 flex-1 flex-col gap-0.5 !text-[10px] font-medium" aria-label={label} onClick={onClick}>
      {children}
      <span className="opacity-80">{label}</span>
    </button>
  );
}

function EmptySchedule({ onAdd, onSmart }: { onAdd: () => void; onSmart: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]"
      >
        <CalendarRange size={28} />
      </motion.div>
      <h3 className="text-lg font-semibold">Your schedule is ready to fill</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500 dark:text-ink-400">
        Add activities, drag them to new days or times, and resize them by their edges. Everything saves automatically.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onAdd}>
          <Plus size={15} /> Add first activity
        </Button>
        <Button variant="secondary" onClick={onSmart}>
          <Sparkles size={15} /> Generate with Smart Scheduler
        </Button>
      </div>
    </div>
  );
}

function MenuBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function MobileConfigSheet({
  schedule,
  onUpdate,
  onClose,
  onSmartOpen,
}: {
  schedule: Schedule;
  onUpdate: (s: Schedule) => void;
  onClose: () => void;
  onSmartOpen: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="no-print md:hidden fixed inset-0 z-[80] bg-ink-950/40 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="no-print md:hidden fixed inset-x-0 bottom-0 z-[85] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-[#17181f] border-t border-ink-100 dark:border-white/10"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 330 }}
        role="dialog"
        aria-label="Schedule settings"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100 dark:border-white/10">
          <div className="text-sm font-semibold">Schedule settings</div>
          <button className="btn-ghost h-8 w-8 p-0" onClick={onClose} aria-label="Close">
            <ArrowLeft size={16} />
          </button>
        </div>
        <ScheduleConfigPanel schedule={schedule} onUpdate={onUpdate} onSmartOpen={onSmartOpen} />
      </motion.div>
    </AnimatePresence>
  );
}

function ShortcutListener({
  onAdd,
  onSave,
  onPreview,
  onUndo,
  onRedo,
  onDeleteSelected,
  onCopy,
  onPaste,
  onOpenShortcuts,
}: {
  onAdd: () => void;
  onSave: () => void;
  onPreview: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onOpenShortcuts: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) onRedo();
        else onUndo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        onRedo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        if (typing) return;
        onCopy();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        if (typing) return;
        onPaste();
        return;
      }
      if (typing) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onAdd();
      } else if (e.key === 's' || e.key === 'S') {
        onSave();
      } else if (e.key === 'e' || e.key === 'E') {
        onPreview();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        onDeleteSelected();
      } else if (e.key === '?') {
        onOpenShortcuts();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onAdd, onSave, onPreview, onUndo, onRedo, onDeleteSelected, onCopy, onPaste, onOpenShortcuts]);

  return null;
}