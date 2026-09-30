import { motion } from 'framer-motion';
import { Palette, Clock, BellRing, Trash2, Fingerprint, RotateCcw } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useUIStore } from '../../store/uiStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { Toggle, Select, Segmented } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { ACCENT_COLORS } from '../../utils/color';

const THEMES: { value: 'light' | 'dark' | 'system'; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function Settings() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const reset = useSettingsStore((s) => s.reset);
  const toast = useUIStore((s) => s.toast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const clearAll = useScheduleStore((s) => s.clearAll);
  const storageEstimate = useScheduleStore((s) => s.storageEstimate);
  const mine = useScheduleStore((s) => s.schedules.filter((sch) => !sch.isTemplate).length);

  const patch = (p: Partial<typeof settings>) => update(p);

  const handleClear = async () => {
    const ok = await requestConfirm({
      title: 'Delete all schedules?',
      message: `All ${mine} schedule(s) and every activity will be permanently erased from this device. This cannot be undone.`,
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (ok) {
      clearAll();
      toast('info', 'All schedules deleted');
    }
  };

  const handleReset = async () => {
    const ok = await requestConfirm({
      title: 'Reset app settings?',
      message: 'Appearance, defaults and preferences return to factory values. Your schedules are unaffected.',
      confirmLabel: 'Reset settings',
      danger: true,
    });
    if (ok) {
      reset();
      toast('info', 'Settings reset');
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6 lg:p-8">
      <div className="mb-1 text-xs font-medium uppercase tracking-widest text-ink-400">Preferences</div>
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Everything is saved locally on this device.</p>

      <motion.section className="card mt-6 p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="flex items-center gap-2 text-sm font-bold"><Palette size={15} /> Appearance</h2>
        <div className="mt-4 space-y-4">
          <div>
            <div className="text-sm font-medium">Theme</div>
            <Segmented
              value={settings.theme as 'light' | 'dark' | 'system'}
              onChange={(v) => patch({ theme: v as typeof settings.theme })}
              options={THEMES.map((t) => ({ value: t.value, label: t.label }))}
              className="mt-2"
            />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium">Accent color</div>
            <div className="flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => patch({ accentColor: c })}
                  className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                  aria-label={c}
                  title={c}
                >
                  {settings.accentColor.toLowerCase() === c.toLowerCase() && (
                    <span className="text-xs font-black text-white">✓</span>
                  )}
                </button>
              ))}
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => patch({ accentColor: e.target.value })}
                className="h-9 w-9 cursor-pointer rounded-xl border border-ink-200 dark:border-white/15 bg-transparent p-0.5"
                title="Custom color"
              />
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="card mt-4 p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h2 className="flex items-center gap-2 text-sm font-bold"><Clock size={15} /> Schedule defaults</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Default type</span>
            <Select
              value={settings.defaultScheduleType}
              onChange={(e) => patch({ defaultScheduleType: e.target.value as typeof settings.defaultScheduleType })}
              className="mt-1.5 w-full"
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Time granularity</span>
            <Select value={String(settings.defaultInterval)} onChange={(e) => patch({ defaultInterval: Number(e.target.value) })} className="mt-1.5 w-full" options={[
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
              { value: '60', label: '60 min' },
              { value: '120', label: '2 hours' },
            ]} />
          </label>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">24-hour clock</div>
              <div className="text-xs text-ink-400">Show 14:30 instead of 2:30 PM</div>
            </div>
            <Toggle label="24h" checked={settings.use24Hour} onChange={(v) => patch({ use24Hour: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Week starts Monday</div>
              <div className="text-xs text-ink-400">Otherwise it starts Sunday</div>
            </div>
            <Toggle label="Monday" checked={settings.weekStartsMonday} onChange={(v) => patch({ weekStartsMonday: v })} />
          </div>
        </div>
      </motion.section>

      <motion.section className="card mt-4 p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="flex items-center gap-2 text-sm font-bold"><BellRing size={15} /> Reminders & motion</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Enable reminders</div>
              <div className="text-xs text-ink-400">A small popup fires when an activity is due</div>
            </div>
            <Toggle label="Reminders" checked={settings.notificationsEnabled} onChange={(v) => patch({ notificationsEnabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Reduced motion</div>
              <div className="text-xs text-ink-400">Minimize animations for focus and battery</div>
            </div>
            <Toggle label="Reduced motion" checked={settings.reducedMotion} onChange={(v) => patch({ reducedMotion: v })} />
          </div>
        </div>
      </motion.section>

      <motion.section className="card mt-4 p-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <h2 className="flex items-center gap-2 text-sm font-bold"><Fingerprint size={15} /> Privacy & data</h2>
        <p className="mt-3 text-sm text-ink-500 dark:text-ink-400">
          Your schedules live in this browser's local storage. Nothing is ever uploaded to the internet.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button size="sm" variant="secondary" onClick={handleReset}>
            <RotateCcw size={13} /> Reset default settings
          </Button>
          <Button size="sm" variant="danger" onClick={handleClear}>
            <Trash2 size={13} /> Delete all my schedules ({mine})
          </Button>
        </div>
        {storageEstimate !== null && (
          <p className="mt-4 text-[11px] text-ink-400">Local storage in use: {fmtBytes(storageEstimate)}</p>
        )}
        <div className="mt-4 rounded-xl bg-ink-100/60 dark:bg-white/5 p-4 text-xs text-ink-500 dark:text-ink-400">
          <div className="mb-1 font-semibold text-ink-600 dark:text-ink-300">Why not a cloud account?</div>
          Your schedule is private by design. No sign-up, no servers, no tracking. Add a manual JSON backup under My Schedules if you want one.
        </div>
      </motion.section>

      <p className="mt-6 text-center text-[11px] text-ink-400 dark:text-ink-500">
        SmartSchedule v1.0.0 · Open source · Built with React, TypeScript &amp; Vite
      </p>
    </div>
  );
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}