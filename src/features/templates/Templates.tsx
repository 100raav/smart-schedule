import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Briefcase, Heart, LayoutTemplate } from 'lucide-react';
import { TEMPLATE_META, buildTemplate } from '../../services/templateService';
import { useUIStore } from '../../store/uiStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { Button } from '../../components/ui/Button';
import { todayKey } from '../../utils/time';

type Cat = 'student' | 'professional' | 'personal' | 'custom';

const CATS: { id: Cat; label: string; icon: typeof GraduationCap }[] = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'personal', label: 'Personal', icon: Heart },
  { id: 'custom', label: 'Custom', icon: LayoutTemplate },
];

const CAT_COLORS: Record<Cat, string> = {
  student: '#5873f8',
  professional: '#0ea5e9',
  personal: '#10b981',
  custom: '#8b5cf6',
};

export default function Templates() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const upsert = useScheduleStore((s) => s.upsert);
  const [active, setActive] = useState<Cat>('student');

  const useId = params.get('use');

  useEffect(() => {
    if (useId) {
      const s = buildTemplate(useId, todayKey());
      if (s) {
        s.isTemplate = false;
        upsert(s);
        navigate(`/builder/${s.id}`);
        toast('success', 'Template loaded', s.name);
      } else {
        toast('error', 'Template not found');
        navigate('/templates');
      }
    }
  }, [useId, navigate, toast, upsert]);

  const shown = useMemo(() => TEMPLATE_META.filter((t) => t.category === active), [active]);

  const openTemplate = (id: string) => {
    setParams({ use: id });
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="mb-1 text-xs font-medium uppercase tracking-widest text-ink-400">Inspiration</div>
        <h1 className="text-2xl font-extrabold tracking-tight">Templates</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Professionally designed starting points — fully customizable in the builder.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
            style={{
              backgroundColor: active === c.id ? CAT_COLORS[c.id] : 'transparent',
              color: active === c.id ? '#fff' : 'inherit',
              border: `1px solid ${active === c.id ? CAT_COLORS[c.id] : 'rgba(0,0,0,0.12)'}`,
            }}
          >
            <c.icon size={15} />
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="card group overflow-hidden"
          >
            <div className="relative h-40 overflow-hidden border-b border-ink-100 dark:border-white/10 bg-gradient-to-br from-white to-ink-50 dark:from-white/5 dark:to-white/[0.02]">
              <MiniPreview meta={t} />
              <span className="absolute left-3 top-3 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: CAT_COLORS[t.category] }}>
                {t.category}
              </span>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-bold">{t.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-ink-400">{t.description}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => openTemplate(t.id)}>
                  Use Template
                </Button>
                <Button size="sm" variant="secondary" onClick={() => openTemplate(t.id)}>
                  Preview
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-ink-200 dark:border-white/15 p-8 text-center">
        <h3 className="text-sm font-semibold">Made your own thing?</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">
          Save any schedule as your own template — duplicate it from My Schedules and keep it in your library.
        </p>
      </div>
    </div>
  );
}

function MiniPreview({ meta }: { meta: (typeof TEMPLATE_META)[number] }) {
  const palette: Record<string, string[]> = {
    'daily-study': ['#5873f8', '#8b5cf6', '#f59e0b'],
    'weekly-study': ['#5873f8', '#8b5cf6', '#ec4899'],
    'exam-prep': ['#8b5cf6', '#f59e0b', '#ef4444'],
    'assignment-planner': ['#0ea5e9', '#10b981'],
    workday: ['#0ea5e9', '#8b5cf6', '#64748b'],
    'weekly-work': ['#0ea5e9', '#5873f8'],
    'project-schedule': ['#ec4899', '#8b5cf6', '#f59e0b'],
    'meeting-planner': ['#8b5cf6', '#5873f8'],
    'daily-routine': ['#10b981', '#f59e0b', '#5873f8'],
    'habit-schedule': ['#f59e0b', '#10b981', '#14b8a6'],
    'fitness-planner': ['#f59e0b', '#ef4444', '#10b981'],
    'productivity-plan': ['#5873f8', '#10b981', '#f59e0b'],
  };
  const colors = palette[meta.id] || ['#5873f8', '#8b5cf6', '#10b981'];

  const rows = meta.type === 'daily' ? 4 : 3;
  const cols = meta.type === 'daily' ? 2 : 7;

  return (
    <div className="absolute inset-x-0 bottom-0 top-8 overflow-hidden p-3">
      <div className="grid h-full w-full" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: 4 }}>
        {Array.from({ length: cols * rows }).map((_, i) => {
          const rand = (i * 7 + meta.id.length * 13) % 10;
          const filled = rand < 7;
          const color = colors[i % colors.length];
          const height = 55 + ((i * 29) % 40);
          return (
            <div key={`c-${i}`} className="relative overflow-hidden rounded-sm" style={{ backgroundColor: filled ? color + '1a' : 'rgba(0,0,0,0.02)' }}>
              {filled && (
                <div
                  className="absolute bottom-0 left-0 rounded-sm"
                  style={{ height: `${height}%`, width: 4, backgroundColor: color }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}