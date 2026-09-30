import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, SlidersHorizontal, Check, ListChecks } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal, Textarea, Field, Input } from '../../components/ui/Modal';
import type { Schedule } from '../../types';
import { demoSmartPrompt, smartParseInput } from '../../services/smartScheduler';
import { formatMinutes } from '../../utils/time';
import { categoryName, allCategories } from '../../utils/schedule';

interface Props {
  open: boolean;
  onClose: () => void;
  schedule: Schedule;
  onApply: (activities: Omit<import('../../types').Activity, 'id'>[], name: string, patch: { startTime: number; endTime: number; interval: number; days: string[]; type: Schedule['type'] }) => void;
}

export function SmartSchedulerPanel({ open, onClose, schedule, onApply }: Props) {
  const [prompt, setPrompt] = useState(demoSmartPrompt());
  const [parsed, setParsed] = useState<null | {
    build: ReturnType<typeof smartParseInput>;
  }>(null);
  const [error, setError] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setError('');
    setGenerating(true);
    setTimeout(() => {
      try {
        const build = smartParseInput(prompt);
        setParsed({ build });
      } catch (e) {
        setError((e as Error).message || 'Could not understand that. Try describing times and activities.');
        setParsed(null);
      }
      setGenerating(false);
    }, 450);
  };

  const apply = () => {
    if (!parsed) return;
    const activities = importActivitiesFromBuild(parsed.build, schedule);
    onApply(
      activities,
      parsed.build.scheduleName,
      {
        startTime: parsed.build.bestStart,
        endTime: parsed.build.bestEnd,
        interval: parsed.build.interval,
        days: parsed.build.days,
        type: parsed.build.days.length > 1 ? 'weekly' : 'daily',
      },
    );
    onClose();
  };

  const totalShown = parsed ? parsed.build.activities.reduce((s, a) => s + a.duration, 0) : 0;

  return (
    <Modal open={open} onClose={onClose} title="Smart Scheduler" size="lg">
      <div className="space-y-4">
        <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent)]">
            <Sparkles size={16} />
            Describe your ideal schedule
          </div>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
            SmartSchedule interprets your words and builds a structured plan you can edit afterwards. It runs entirely on your device.
          </p>
        </div>

        <Field label="Your requirements">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. I want to study Java for 2 hours, prepare IELTS for 1 hour, exercise for 30 minutes every weekday…"
            className="min-h-[104px]"
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" size="sm" onClick={() => setPrompt(demoSmartPrompt())}>
            <RefreshCw size={13} /> Use example
          </Button>
          <Button onClick={generate} loading={generating}>
            {generating ? 'Analyzing…' : <><Sparkles size={15} /> Generate Schedule</>}
          </Button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <AnimatePresence>
          {parsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden rounded-xl border border-ink-200 dark:border-white/15"
            >
              <div className="flex items-center justify-between border-b border-ink-100 dark:border-white/10 bg-ink-50 dark:bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ListChecks size={15} className="text-emerald-500" />
                  {parsed.build.activities.length} activities · {Math.round(totalShown / 60)}h planned
                </div>
                {adjusting ? (
                  <button className="btn-ghost text-xs" onClick={() => setAdjusting(false)}>
                    <SlidersHorizontal size={12} /> Done
                  </button>
                ) : (
                  <button className="btn-ghost text-xs text-[var(--accent)]" onClick={() => setAdjusting(true)}>
                    <SlidersHorizontal size={12} /> Adjust start time
                  </button>
                )}
              </div>

              <ul className="divide-y divide-ink-100 dark:divide-white/5 max-h-56 overflow-y-auto">
                {parsed.build.activities.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="w-16 shrink-0 text-xs font-semibold text-ink-500">
                      {formatMinutes(estimatedStart(parsed.build.activities, i, parsed.build.bestStart), schedule.settings.use24Hour)}
                    </span>
                    <span className="flex-1 truncate font-medium">{a.title}</span>
                    <span className="text-xs text-ink-500">{Math.round(a.duration / 60 * 10) / 10}h</span>
                    <span className="chip" style={{ backgroundColor: '#64748b18', color: '#64748b', borderColor: '#64748b30' }}>
                      {categoryName(a.category, schedule.customCategories) || a.category}
                    </span>
                  </li>
                ))}
              </ul>

              {adjusting && (
                <div className="border-t border-ink-100 dark:border-white/10 px-4 py-3">
                  <Field label="Start time">
                    <Input
                      type="time"
                      value={formatMinutes(parsed.build.bestStart, true).slice(0, 5)}
                      onChange={(e) => {
                        const m = e.target.value.split(':');
                        const mm = parseInt(m[0], 10) * 60 + parseInt(m[1], 10);
                        if (!isNaN(mm)) {
                          setParsed({
                            build: { ...parsed.build, bestStart: mm },
                          });
                        }
                      }}
                    />
                  </Field>
                </div>
              )}

              <div className="border-t border-ink-100 dark:border-white/10 bg-ink-50/50 dark:bg-white/5 px-4 py-3 flex justify-end gap-3">
                <Button variant="secondary" size="sm" onClick={generate}>
                  <RefreshCw size={13} /> Regenerate
                </Button>
                <Button size="sm" onClick={apply}>
                  <Check size={14} /> Apply to Schedule
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-[11px] text-ink-400 dark:text-ink-500">
          No internet needed — SmartSchedule parses your text locally on your device.
        </p>
      </div>
    </Modal>
  );
}

function estimatedStart(acts: { duration: number }[], idx: number, base: number): number {
  let cursor = base;
  for (let i = 0; i < idx; i++) cursor += acts[i].duration + 15;
  return cursor;
}

function importActivitiesFromBuild(
  build: ReturnType<typeof smartParseInput>,
  schedule: Schedule,
): Omit<import('../../types').Activity, 'id'>[] {
  const colors: Record<string, string> = {};
  const cats = allCategories(schedule);
  cats.forEach((c) => (colors[c.id] = c.color));
  const result: Omit<import('../../types').Activity, 'id'>[] = [];
  let cursor = build.bestStart;
  build.activities.forEach((sa, i) => {
    const start = cursor;
    const end = start + sa.duration;
    cursor = end + (i < build.activities.length - 1 ? 15 : 0);
    result.push({
      title: sa.title,
      date: build.days[0] || schedule.startDate,
      start,
      end,
      category: sa.category,
      color: colors[sa.category] || '#5873f8',
      priority: 'medium',
      icon: 'star',
      repeat: build.days.length > 1 ? sa.repeat : sa.repeat === 'none' ? 'none' : sa.repeat,
      reminder: 0,
    });
    if (build.days.length > 1) {
      for (let di = 1; di < build.days.length; di++) {
        const dayDow = (new Date(build.days[di] + 'T00:00:00').getDay() + 6) % 7;
        if (sa.repeat === 'weekdays' && dayDow >= 5) continue;
        if (sa.repeat === 'weekends' && dayDow < 5) continue;
        if (sa.repeat === 'daily' || sa.repeat === 'weekdays' || sa.repeat === 'weekends') {
          result.push({ ...result[result.length - 1], date: build.days[di] });
        }
      }
    }
  });
  return result;
}