import { useEffect, useMemo, useState } from 'react';
import type { Activity, Priority, RepeatRule, Schedule } from '../../types';
import { ACTIVITY_ICONS, DEFAULT_CATEGORIES } from '../../types';
import { Field, Input, Modal, Select, Textarea } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { minutesToTimeInput, timeInputToMinutes, snapToInterval } from '../../utils/time';
import { allCategories } from '../../utils/schedule';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const REPEATS: { value: RepeatRule; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'weekly', label: 'Weekly' },
];

const PRESET_COLORS = [
  '#5873f8', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
  '#10b981', '#14b8a6', '#0ea5e9', '#f97316', '#64748b', '#6b7280', '#1c1d24',
];

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
];

interface Draft {
  title: string;
  description: string;
  date: string;
  start: number;
  end: number;
  category: string;
  color: string;
  priority: Priority;
  icon: string;
  location: string;
  notes: string;
  repeat: RepeatRule;
  reminder: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  schedule: Schedule;
  preset?: Partial<Activity> | null;
  defaultDay?: string;
  defaultStart?: number;
  onSave: (draft: Omit<Activity, 'id'> & { id?: string }, isNew: boolean) => void;
}

export function ActivityModal({ open, onClose, schedule, preset, defaultDay, defaultStart, onSave }: Props) {
  const categories = useMemo(() => allCategories(schedule), [schedule]);
  const [draft, setDraft] = useState<Draft>(() => makeDraft());
  const [error, setError] = useState('');

  function makeDraft(): Draft {
    const interval = schedule.settings.interval || 60;
    const start = defaultStart ?? snapToInterval(schedule.settings.startTime + interval, interval);
    const cat = categories.find((c) => c.id === 'study') || categories[0];
    return {
      title: '',
      description: '',
      date: preset?.date || defaultDay || schedule.settings.days[0] || schedule.startDate,
      start: preset?.start ?? start,
      end: preset ? preset.end ?? start + interval : start + interval,
      category: preset?.category || cat?.id || 'other',
      color: preset?.color || presetCategoryColor(preset?.category) || cat?.color || '#5873f8',
      priority: preset?.priority || 'medium',
      icon: preset?.icon || 'star',
      location: preset?.location || '',
      notes: preset?.notes || '',
      repeat: preset?.repeat || 'none',
      reminder: preset?.reminder || 0,
    };
  }

  useEffect(() => {
    if (open) {
      setDraft(makeDraft());
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset, defaultDay, defaultStart, schedule.id]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const handleSubmit = () => {
    const title = draft.title.trim();
    if (!title) {
      setError('Give your activity a name.');
      return;
    }
    if (draft.end <= draft.start) {
      setError('End time must be after the start time.');
      return;
    }
    if (!draft.date) {
      setError('Pick a date for this activity.');
      return;
    }
    const { id } = preset || {};
    onSave(
      {
        id,
        title,
        description: draft.description,
        date: draft.date,
        start: draft.start,
        end: draft.end,
        category: draft.category,
        color: draft.color,
        priority: draft.priority,
        icon: draft.icon,
        location: draft.location,
        notes: draft.notes,
        repeat: draft.repeat,
        reminder: draft.reminder,
      },
      !id,
    );
    onClose();
  };

  const cat = categories.find((c) => c.id === draft.category);
  const catColor = cat?.color || draft.color;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={preset?.id ? 'Edit Activity' : 'Add Activity'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{preset?.id ? 'Save Changes' : 'Add to Schedule'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        <Field label="Activity name" className="sm:col-span-2">
          <Input
            autoFocus
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="e.g. Java Development"
            invalid={!!error}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </Field>

        <Field label="Date">
          <Input type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>

        <Field label="Category">
          <Select
            value={draft.category}
            onChange={(e) => {
              const id = e.target.value;
              set({ category: id, color: categories.find((c) => c.id === id)?.color || draft.color });
            }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>

        <Field label="Start time">
          <Input
            type="time"
            value={minutesToTimeInput(draft.start)}
            onChange={(e) => {
              const m = timeInputToMinutes(e.target.value);
              if (m !== null) set({ start: m, end: Math.max(draft.end, m + 15) });
            }}
          />
        </Field>

        <Field label="End time">
          <Input
            type="time"
            value={minutesToTimeInput(draft.end)}
            onChange={(e) => {
              const m = timeInputToMinutes(e.target.value);
              if (m !== null) set({ end: m });
            }}
          />
        </Field>

        <Field label="Duration">
          <Select
            value={String(draft.end - draft.start)}
            onChange={(e) => set({ end: draft.start + parseInt(e.target.value, 10) })}
            options={DURATION_OPTIONS.map((o) => ({
              ...o,
              value: String(o.value),
            }))}
          />
        </Field>

        <Field label="Priority">
          <Select
            value={draft.priority}
            onChange={(e) => set({ priority: e.target.value as Priority })}
            options={PRIORITIES.map((p) => ({
              value: p,
              label: p.charAt(0).toUpperCase() + p.slice(1),
            }))}
          />
        </Field>

        <Field label="Color" className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => set({ color: c })}
                className="h-7 w-7 rounded-full border border-ink-200/60 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  outline: draft.color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
            <input
              type="color"
              value={draft.color}
              onChange={(e) => set({ color: e.target.value })}
              aria-label="Custom color"
              className="h-7 w-9 rounded-md border border-ink-200 bg-transparent"
            />
            <span className="ml-1 text-xs text-ink-500">{draft.color}</span>
          </div>
        </Field>

        <Field label="Icon" className="sm:col-span-2">
          <div className="grid grid-cols-9 gap-1.5 sm:grid-cols-13">
            {ACTIVITY_ICONS.map((ic) => (
              <button
                key={ic.name}
                type="button"
                onClick={() => set({ icon: ic.name })}
                aria-label={`Icon ${ic.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg border text-base transition-all hover:scale-105"
                style={{
                  borderColor: draft.icon === ic.name ? draft.color : 'transparent',
                  background: draft.icon === ic.name ? catColor + '22' : 'rgba(0,0,0,0.03)',
                }}
              >
                {ic.emoji}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Location">
          <Input value={draft.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Library, Home, Gym" />
        </Field>

        <Field label="Reminder">
          <Select
            value={String(draft.reminder)}
            onChange={(e) => set({ reminder: parseInt(e.target.value, 10) })}
            options={[
              { value: '0', label: 'No reminder' },
              { value: '5', label: '5 minutes before' },
              { value: '15', label: '15 minutes before' },
              { value: '30', label: '30 minutes before' },
              { value: '60', label: '1 hour before' },
            ]}
          />
        </Field>

        <Field label="Repeat" className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[180px]">
              <Select
                value={draft.repeat}
                onChange={(e) => set({ repeat: e.target.value as RepeatRule })}
                options={REPEATS}
              />
            </div>
          </div>
        </Field>

        <Field label="Notes" className="sm:col-span-2">
          <Textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Extra context for this activity…" />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>}
    </Modal>
  );
}

function presetCategoryColor(cat: string | undefined): string | undefined {
  return DEFAULT_CATEGORIES.find((c) => c.id === cat)?.color;
}