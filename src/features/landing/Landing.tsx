import { lazy, Suspense, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, LayoutTemplate, Sparkles, CloudOff, PenLine, Star } from 'lucide-react';
import { detectWebGL } from '../../services/exportService';
import { TEMPLATE_META } from '../../services/templateService';
import { createBlankSchedule } from '../../utils/schedule';
import { useSettingsStore } from '../../store/settingsStore';
import { useScheduleStore } from '../../store/scheduleStore';
import { useUIStore } from '../../store/uiStore';
import { useNavigate } from 'react-router-dom';

const HeroScene = lazy(() => import('./HeroScene'));

export default function Landing() {
  const webgl = useMemo(() => detectWebGL(), []);
  const settings = useSettingsStore((s) => s.settings);
  const upsert = useScheduleStore((s) => s.upsert);
  const toast = useUIStore((s) => s.toast);
  const navigate = useNavigate();

  const quickCreate = () => {
    const s = createBlankSchedule(settings.defaultScheduleType);
    upsert(s);
    toast('success', 'Schedule created', s.name);
    navigate(`/builder/${s.id}`);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,var(--accent)_0%,var(--accent)_3%,transparent_3%),linear-gradient(180deg,#fff,transparent)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background: 'radial-gradient(1200px 500px at 50% -100px, color-mix(in srgb, var(--accent) 28%, transparent), transparent 70%)',
        }}
      />

      <section className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:pb-24 lg:pt-24">
        <div>
          <motion.div
            className="inline-flex items-center gap-2 rounded-full border border-ink-200/70 dark:border-white/10 bg-white/70 dark:bg-white/5 px-3 py-1 text-xs font-semibold text-ink-600 dark:text-ink-300 backdrop-blur"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Sparkles size={13} className="text-[var(--accent)]" />
            Smart scheduler · exports to PDF & images · works offline
          </motion.div>

          <motion.h1
            className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            Plan your time.
            <br />
            <span className="font-handwritten text-[1.15em] text-[var(--accent)]">Your way.</span>
          </motion.h1>

          <motion.p
            className="mt-5 max-w-lg text-base text-ink-500 dark:text-ink-400 sm:text-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            A beautiful, lightning-fast schedule builder that lives in your browser. Drag, type or whisper your plan — then export a
            clean PDF or wallpaper-ready image.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Link to="/dashboard" className="btn-primary group h-12 px-6 text-sm">
              <Plus size={17} className="transition-transform group-hover:rotate-90" />
              Create a Schedule
            </Link>
            <button onClick={quickCreate} className="btn-secondary h-12 px-6 font-mono text-sm">
              Quick start → Blank
            </button>
            <Link to="/templates" className="btn-ghost h-12 px-5 text-sm">
              <LayoutTemplate size={16} /> Templates
            </Link>
          </motion.div>

          <motion.div
            className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {[
              { icon: <Sparkles size={14} className="text-[var(--accent)]" />, t: 'Smart input', d: 'Line → Schedule' },
              { icon: <CloudOff size={14} className="text-[var(--accent)]" />, t: '100% offline', d: 'PWA, no server' },
              { icon: <PenLine size={14} className="text-[var(--accent)]" />, t: 'PDF & images', d: 'Print-ready' },
            ].map((f) => (
              <div key={f.t}>
                <div className="font-bold">{f.t}</div>
                <div className="font-mono text-xs text-ink-400">{f.d}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <Suspense
          fallback={
            <div className="relative hidden aspect-square w-full max-w-md lg:block">
              <FallbackScene />
            </div>
          }
        >
          <div className="relative hidden aspect-square w-full max-w-lg lg:block">
            {webgl ? <HeroScene /> : <FallbackScene />}
          </div>
        </Suspense>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-xl font-extrabold tracking-tight">Popular templates</h2>
          <Link to="/templates" className="-my-1 inline-block py-1 text-sm font-semibold text-[var(--accent)]">
            See all →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATE_META.slice(0, 4).map((t, i) => (
            <motion.div
              key={t.id}
              className="card flex flex-col justify-between p-4"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.04 }}
            >
              <div>
                <Star size={15} className="mb-2 text-[var(--accent)]" />
                <div className="text-sm font-bold">{t.name}</div>
                <div className="mt-1 line-clamp-2 text-xs text-ink-400">{t.description}</div>
              </div>
              <Link
                to={`/templates?use=${t.id}`}
                className="-mb-1.5 mt-3 inline-block py-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                Use template →
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FallbackScene() {
  return (
    <div className="relative mx-auto flex aspect-square w-full items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-[var(--accent)]/10" />
      <div className="relative h-[78%] w-[70%] -rotate-6 rounded-md bg-gradient-to-br from-white to-ink-50 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.35)] dark:from-white/10 dark:to-white/5">
        <div className="absolute inset-3 space-y-2.5 opacity-70">
          {[8, 12, 6, 10, 5].map((w, i) => (
            <div key={i} className="h-2 rounded" style={{ width: `${w * 8}%`, backgroundColor: 'var(--accent)', opacity: 0.15 + i * 0.12 }} />
          ))}
        </div>
        <div className="absolute left-0 right-0 top-0 flex justify-center">
          <div className="-mt-1 h-3 w-16 -rotate-1 rounded-sm bg-[var(--accent)]" />
        </div>
      </div>
      <div className="absolute top-[12%] right-[14%] font-handwritten text-4xl text-[var(--accent)]">"étudi"</div>
      <div className="absolute -bottom-2 left-1/2 h-16 w-2.5 -translate-x-1/2 rotate-45 rounded-full bg-gradient-to-b from-[#56638f] via-[#3f4a6e] to-[#2b3350] shadow-lg" />
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{ rotate: [0, 6, 0, -4, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}