import { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Schedule, ScheduleType } from '../../types';
import { Field, Input, Toggle } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { formatMinutes, minutesToTimeInput, timeInputToMinutes, addDays } from '../../utils/time';
import { computeDaysForType } from '../../utils/schedule';

const INTERVALS = [15, 20, 30, 45, 60, 90, 120];

interface Props {
  schedule: Schedule;
  onUpdate: (schedule: Schedule) => void;
  onSmartOpen: () => void;
}

export function ScheduleConfigPanel({ schedule, onUpdate, onSmartOpen }: Props) {
  const [customInterval, setCustomInterval] = useState('');
  const settings = schedule.settings;

  const set = (patch: Partial<Schedule>) => onUpdate({ ...schedule, ...patch });
  const setSettings = (patch: Partial<typeof settings>) => {
    const merged = { ...settings, ...patch };
    merged.days = computeDaysForType(schedule.type, schedule.startDate, merged, schedule.endDate);
    onUpdate({ ...schedule, settings: merged });
  };

  const changeType = (type: ScheduleType) => {
    const merged = { ...settings };
    merged.days = computeDaysForType(type, schedule.startDate, merged, schedule.endDate);
    onUpdate({
      ...schedule,
      type,
      settings: merged,
      endDate: type === 'monthly' ? schedule.startDate : schedule.endDate,
    });
  };

  const addManualSlot = () => {
    const slots = settings.manualSlots ? [...settings.manualSlots] : [];
    const last = slots[slots.length - 1] ?? settings.endTime;
    const next = Math.min(23.5 * 60, last + settings.interval);
    slots.push(next);
    setSettings({ manualSlots: slots });
  };

  const removeManualSlot = (i: number) => {
    const slots = settings.manualSlots ? [...settings.manualSlots] : [];
    slots.splice(i, 1);
    setSettings({ manualSlots: slots.length ? slots : null });
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
        <CalendarDays size={14} /> Schedule
      </div>

      <div className="space-y-4">
        <Field label="Schedule name">
          <Input value={schedule.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Description">
          <Input value={schedule.description || ''} onChange={(e) => set({ description: e.target.value })} />
        </Field>

        <div>
          <label className="label">Schedule type</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['daily', 'weekly', 'monthly', 'custom'] as ScheduleType[]).map((t) => (
              <button
                key={t}
                onClick={() => changeType(t)}
                className="rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors"
                style={{
                  borderColor: schedule.type === t ? 'var(--accent)' : 'rgba(0,0,0,0.1)',
                  background: schedule.type === t ? 'var(--accent)14' : 'transparent',
                  color: schedule.type === t ? 'var(--accent)' : 'inherit',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <Input
              type="date"
              value={schedule.startDate}
              onChange={(e) => {
                if (!e.target.value) return;
                const merged = { ...settings };
                merged.days = computeDaysForType(schedule.type, e.target.value, merged, schedule.endDate);
                onUpdate({ ...schedule, startDate: e.target.value, settings: merged });
              }}
            />
          </Field>
          {schedule.type !== 'daily' && (
            <Field label={schedule.type === 'monthly' ? 'Month' : 'End date'} hint={schedule.type === 'weekly' ? 'Weeks map to full weeks' : undefined}>
               <Input
                type={schedule.type === 'weekly' ? 'date' : 'month'}
                value={schedule.type === 'weekly' ? schedule.startDate : schedule.startDate.slice(0, 7)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  if (schedule.type === 'weekly') {
                    const merged = { ...settings };
                    merged.days = computeDaysForType('weekly', e.target.value, merged, addDays(e.target.value, 6));
                    onUpdate({ ...schedule, startDate: e.target.value, settings: merged });
                  } else {
                    const start = e.target.value + '-01';
                    const merged = { ...settings };
                    merged.days = computeDaysForType('monthly', start, merged);
                    onUpdate({ ...schedule, startDate: start, settings: merged });
                  }
                }}
              />
            </Field>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time">
            <Input type="time" value={minutesToTimeInput(settings.startTime)} onChange={(e) => {
              const m = timeInputToMinutes(e.target.value);
              if (m !== null) setSettings({ startTime: m });
            }} />
          </Field>
          <Field label="End time">
            <Input type="time" value={minutesToTimeInput(settings.endTime)} onChange={(e) => {
              const m = timeInputToMinutes(e.target.value);
              if (m !== null && m > settings.startTime) setSettings({ endTime: m });
            }} />
          </Field>
        </div>

        <div>
          <label className="label">Time interval</label>
          <div className="flex flex-wrap gap-1.5">
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                onClick={() => setSettings({ interval: iv, manualSlots: null })}
                className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  borderColor: settings.interval === iv && !settings.manualSlots ? 'var(--accent)' : 'rgba(0,0,0,0.1)',
                  background: settings.interval === iv && !settings.manualSlots ? 'var(--accent)14' : 'transparent',
                  color: settings.interval === iv && !settings.manualSlots ? 'var(--accent)' : 'inherit',
                }}
              >
                {iv < 60 ? `${iv}m` : `${iv / 60}h`}
              </button>
            ))}
            <input
              type="number"
              min={5}
              max={240}
              placeholder="custom"
              value={customInterval}
              onChange={(e) => {
                setCustomInterval(e.target.value);
                const v = parseInt(e.target.value, 10);
                if (v >= 5 && v <= 240) setSettings({ interval: v, manualSlots: null });
              }}
              className="input w-24 !py-1.5 text-xs"
              aria-label="Custom interval minutes"
            />
          </div>
        </div>

        <div>
          <label className="label">Manual time slots</label>
          <div className="rounded-xl border border-ink-200 dark:border-white/15 p-3">
            {settings.manualSlots ? (
              <ul className="space-y-1.5">
                {settings.manualSlots.map((s, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span>{formatMinutes(s, settings.use24Hour)}</span>
                    {i > 0 && (
                      <button
                        className="btn-ghost h-6 w-6 p-0 text-red-500"
                        aria-label="Remove slot"
                        onClick={() => removeManualSlot(i)}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-ink-400">Auto-generated from interval. Switch to manual to customize.</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                if (!settings.manualSlots) {
                  const slots: number[] = [];
                  for (let t = settings.startTime; t < settings.endTime; t += settings.interval) {
                    slots.push(t);
                  }
                  setSettings({ manualSlots: slots });
                } else {
                  addManualSlot();
                }
              }}
            >
              <Plus size={12} /> {settings.manualSlots ? 'Add slot' : 'Create manual slots'}
            </Button>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-ink-100 dark:border-white/10 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span>Week starts Monday</span>
            <Toggle checked={settings.weekStartsMonday} onChange={(v) => setSettings({ weekStartsMonday: v })} />
          </div>
          {schedule.type !== 'daily' && schedule.type !== 'monthly' && (
            <div className="flex items-center justify-between text-sm">
              <span>Show weekends</span>
              <Toggle checked={settings.showWeekends} onChange={(v) => setSettings({ showWeekends: v })} />
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span>24-hour clock</span>
            <Toggle checked={settings.use24Hour} onChange={(v) => setSettings({ use24Hour: v })} />
          </div>
        </div>

        <Button className="w-full" variant="secondary" onClick={onSmartOpen}>
          <Sparkles size={15} /> Smart Schedule (AI)
        </Button>

        <div className="flex items-start gap-2 rounded-xl bg-ink-50 dark:bg-white/5 p-3 text-xs text-ink-500 dark:text-ink-400">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            Tip: drag activities to move them, drag the bottom edge to resize. Double-click an empty slot to add instantly.
          </span>
        </div>
      </div>
    </div>
  );
}