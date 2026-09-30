import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Layout, Type, Grid3x3, NotebookPen, X, Accessibility } from 'lucide-react';
import type { ScheduleSettings, BorderStyle, LayoutDensity, ScheduleStyle } from '../../types';
import { Segmented, Toggle } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

const FONTS = [
  { value: 'sans', label: 'Inter' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
  { value: 'handwritten', label: 'Handwritten' },
];

const STYLES: { value: ScheduleStyle; label: string; desc: string }[] = [
  { value: 'minimal', label: 'Minimal', desc: 'Clean, quiet, spacious' },
  { value: 'paper', label: 'Paper', desc: 'Warm planner paper' },
  { value: 'professional', label: 'Professional', desc: 'Structured & corporate' },
  { value: 'modern', label: 'Modern', desc: 'Soft cards & fill' },
  { value: 'notebook', label: 'Notebook', desc: 'Lined notes feel' },
];

const DENSITIES: { value: LayoutDensity; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
];

const BORDERS: { value: BorderStyle; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'thin', label: 'Thin' },
  { value: 'medium', label: 'Medium' },
  { value: 'rounded', label: 'Rounded' },
];

const PRESET_BG = ['#ffffff', '#fdfaf3', '#f6f8ff', '#fafafa', '#1c1d24', '#23242e'];

interface Props {
  open: boolean;
  onClose: () => void;
  settings: ScheduleSettings;
  onUpdate: (patch: Partial<ScheduleSettings>) => void;
}

export function CustomizePanel({ open, onClose, settings, onUpdate }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="no-print fixed inset-y-0 right-0 z-40 w-full max-w-sm bg-white dark:bg-[#191a21] border-l border-ink-100 dark:border-white/10 shadow-lift"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          aria-label="Customization panel"
        >
          <header className="flex items-center justify-between border-b border-ink-100 dark:border-white/10 px-5 py-4">
            <div className="flex items-center gap-2 font-semibold">
              <Palette size={16} className="text-[var(--accent)]" />
              Customize
            </div>
            <button className="btn-ghost h-8 w-8 p-0" aria-label="Close panel" onClick={onClose}>
              <X size={16} />
            </button>
          </header>

          <div className="h-full overflow-y-auto px-5 py-5 pb-24" style={{ height: 'calc(100% - 57px)' }}>
            <Section icon={<Type size={14} />} title="Typography">
              <Segmented
                value={settings.font}
                onChange={(v) => onUpdate({ font: v })}
                options={FONTS}
              />
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Segmented
                  value={settings.fontSize}
                  onChange={(v) => onUpdate({ fontSize: v })}
                  options={[
                    { value: 'small', label: 'S' },
                    { value: 'medium', label: 'M' },
                    { value: 'large', label: 'L' },
                  ]}
                />
                <Segmented
                  value={settings.fontWeight}
                  onChange={(v) => onUpdate({ fontWeight: v })}
                  options={[
                    { value: 'normal', label: 'Regular' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'bold', label: 'Bold' },
                  ]}
                  className="col-span-2"
                />
              </div>
            </Section>

            <Section icon={<Palette size={14} />} title="Colors">
              <div className="space-y-3">
                <ColorRow
                  label="Background"
                  value={settings.backgroundColor}
                  presets={PRESET_BG}
                  onChange={(v) => onUpdate({ backgroundColor: v })}
                />
                <ColorRow
                  label="Primary"
                  value={settings.primaryColor}
                  presets={['#303ccb', '#5873f8', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#ef4444']}
                  onChange={(v) => onUpdate({ primaryColor: v })}
                />
                <ColorRow
                  label="Secondary"
                  value={settings.secondaryColor}
                  presets={['#eef1ff', '#fdfaf3', '#eef6ff', '#f0fdf4', '#fff7ed', '#faf5ff', '#1c1d24']}
                  onChange={(v) => onUpdate({ secondaryColor: v })}
                />
              </div>
            </Section>

            <Section icon={<Layout size={14} />} title="Layout">
              <Segmented
                value={settings.density}
                onChange={(v) => onUpdate({ density: v })}
                options={DENSITIES}
              />
              <div className="mt-3 space-y-2.5">
                <Row label="Show time labels">
                  <Toggle checked={settings.showTimes} onChange={(v) => onUpdate({ showTimes: v })} />
                </Row>
                <Row label="Show grid lines">
                  <Toggle checked={settings.showGrid} onChange={(v) => onUpdate({ showGrid: v })} />
                </Row>
                <Row label="Show legend">
                  <Toggle checked={settings.showLegend} onChange={(v) => onUpdate({ showLegend: v })} />
                </Row>
                <Row label="Show weekends">
                  <Toggle checked={settings.showWeekends} onChange={(v) => onUpdate({ showWeekends: v })} />
                </Row>
                <Row label="24-hour clock">
                  <Toggle checked={settings.use24Hour} onChange={(v) => onUpdate({ use24Hour: v })} />
                </Row>
              </div>
            </Section>

            <Section icon={<Grid3x3 size={14} />} title="Borders & Style">
              <div className="mb-3">
                <Segmented
                  value={settings.borderStyle}
                  onChange={(v) => onUpdate({ borderStyle: v })}
                  options={BORDERS}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => onUpdate({ style: s.value })}
                    className="rounded-xl border-2 p-3 text-left text-xs transition-colors"
                    style={{
                      borderColor: settings.style === s.value ? 'var(--accent)' : 'rgba(0,0,0,0.08)',
                      background: settings.style === s.value ? 'var(--accent)14' : 'transparent',
                    }}
                  >
                    <div className="font-semibold">{s.label}</div>
                    <div className="mt-0.5 text-[10.5px] text-ink-500 dark:text-ink-400">{s.desc}</div>
                  </button>
                ))}
              </div>
              <Button
                className="mt-4 w-full"
                variant={settings.paperMode ? 'primary' : 'secondary'}
                onClick={() => onUpdate({ paperMode: !settings.paperMode, style: settings.paperMode ? settings.style : 'paper' })}
              >
                <NotebookPen size={15} />
                {settings.paperMode ? 'Disable Paper Mode' : 'Enable Paper Mode'}
              </Button>
              <p className="mt-2 text-[11px] text-ink-400 dark:text-ink-500">
                Paper mode adds paper texture, notebook lines and a pen cursor.
              </p>
            </Section>

            <Section icon={<Accessibility size={14} />} title="Accessibility">
              <Row label="Reduce animations site-wide">
                <Toggle checked={reduceMotionEnabled()} onChange={() => toggleReduceMotion()} />
              </Row>
            </Section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

const REDUCED_KEY = 'smartschedule:reduced-motion';

function reduceMotionEnabled(): boolean {
  if (typeof document === 'undefined') return false;
  let stored = false;
  try {
    stored = localStorage.getItem(REDUCED_KEY) === '1';
  } catch {
    /* ignore */
  }
  return stored || document.documentElement.classList.contains('reduce-motion');
}

function toggleReduceMotion() {
  if (typeof document === 'undefined') return;
  const next = !reduceMotionEnabled();
  document.documentElement.classList.toggle('reduce-motion', next);
  if (next) {
    document.documentElement.style.setProperty('--forced-reduced-motion', '1');
  } else {
    document.documentElement.style.removeProperty('--forced-reduced-motion');
  }
  try {
    localStorage.setItem(REDUCED_KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  // Give the control an accessible name when the caller did not set one,
  // otherwise these switches are announced as unnamed "switch" elements.
  const control =
    isValidElement(children) && !(children.props as { 'aria-label'?: string })['aria-label']
      ? cloneElement(children as ReactElement<{ 'aria-label'?: string }>, { 'aria-label': label })
      : children;
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-sm text-ink-700 dark:text-ink-300">{label}</span>
      {control}
    </div>
  );
}

function ColorRow({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: string;
  presets: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm text-ink-700 dark:text-ink-300">{label}</span>
        <span className="text-[11px] text-ink-400">{value}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((c) => (
          <button
            key={c}
            aria-label={`${label} ${c}`}
            onClick={() => onChange(c)}
            className="h-6 w-6 rounded-full border transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              borderColor: 'rgba(0,0,0,0.12)',
              outline: value === c ? `2px solid ${c}` : 'none',
              outlineOffset: 2,
            }}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} custom`}
          className="h-6 w-8 rounded border border-ink-200 bg-transparent"
        />
      </div>
    </div>
  );
}