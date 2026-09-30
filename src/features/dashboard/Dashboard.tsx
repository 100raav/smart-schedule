import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  CalendarDays,
  LayoutTemplate,
  Sparkles,
  Clock,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Heart,
} from 'lucide-react';
import { useScheduleStore } from '../../store/scheduleStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Button } from '../../components/ui/Button';
import { createBlankSchedule } from '../../utils/schedule';
import { useUIStore } from '../../store/uiStore';
import { TEMPLATE_META } from '../../services/templateService';
import { shortDate } from '../../utils/time';

const CREATE_OPTIONS = [
  { type: 'blank', label: 'Blank Schedule', desc: 'Start from scratch', icon: PlusCircle },
  { type: 'daily', label: 'Daily', desc: 'One day, full detail', icon: Clock },
  { type: 'weekly', label: 'Weekly', desc: 'Mon–Sun or custom', icon: CalendarDays },
  { type: 'monthly', label: 'Monthly', desc: 'Month overview', icon: CalendarDays },
  { type: 'study', label: 'Study', desc: 'Classes & revision', icon: GraduationCap },
  { type: 'workout', label: 'Workout', desc: 'Training split', icon: Heart },
  { type: 'work', label: 'Work', desc: 'Meetings & focus', icon: Briefcase },
  { type: 'exam', label: 'Exam Prep', desc: 'Revision plan', icon: Sparkles },
  { type: 'project', label: 'Project', desc: 'Milestones', icon: Briefcase },
  { type: 'custom', label: 'Custom', desc: 'Total control', icon: LayoutTemplate },
] as const;

type CreateKey = (typeof CREATE_OPTIONS)[number]['type'];

export default function Dashboard() {
  const navigate = useNavigate();
  const schedules = useScheduleStore((s) => s.schedules);
  const upsert = useScheduleStore((s) => s.upsert);
  const settings = useSettingsStore((s) => s.settings);
  const toast = useUIStore((s) => s.toast);

  const mine = useMemo(
    () => schedules.filter((s) => !s.isTemplate).sort((a, b) => b.updatedAt - a.updatedAt),
    [schedules],
  );
  const favorites = mine.filter((s) => s.favorite);
  const recent = mine.slice(0, 4);

  const createFromTemplate = (type: CreateKey) => {
    const scheduleType = type as 'daily' | 'weekly' | 'monthly' | 'custom';
    const valid: string[] = ['daily', 'weekly', 'monthly', 'custom'];
    const s = createBlankSchedule(valid.includes(scheduleType) ? scheduleType : 'custom');

    if (type === 'study' || type === 'exam' || type === 'project' || type === 'workout' || type === 'work') {
      const templateKey =
        type === 'exam' ? 'exam-prep' : type === 'workout' ? 'fitness-planner' : type === 'work' ? 'weekly-work' : type === 'project' ? 'project-schedule' : 'weekly-study';
      navigate(`/templates?use=${templateKey}`);
      return;
    }
    upsert(s);
    toast('success', 'Schedule created', s.name);
    navigate(`/builder/${s.id}`);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 text-xs font-medium uppercase tracking-widest text-ink-400">Dashboard</div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Welcome back{settings.locale === 'en' && ', planner'}
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Create a schedule in seconds, or pick up where you left off.
        </p>
      </motion.div>

      <motion.section
        className="mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Create New Schedule</h2>
          <Link to="/templates" className="-my-1.5 flex items-center gap-1 py-1.5 text-xs font-medium text-[var(--accent)]">
            Explore templates <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CREATE_OPTIONS.map((o) => (
            <button
              key={o.type}
              onClick={() => createFromTemplate(o.type)}
              className="group flex flex-col items-start gap-3 rounded-2xl border border-ink-100 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] transition-transform group-hover:scale-110">
                <o.icon size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{o.label}</span>
                <span className="block text-xs text-ink-400">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </motion.section>

      {favorites.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-ink-500">Favorites</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((s) => (
              <ScheduleMiniCard key={s.id} id={s.id} name={s.name} type={s.type} updated={s.updatedAt} color={s.settings.primaryColor} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Recent Schedules</h2>
          <Link to="/schedules" className="-my-1.5 flex items-center gap-1 py-1.5 text-xs font-medium text-[var(--accent)]">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-200 dark:border-white/15 p-8 text-center">
            <p className="text-sm font-medium text-ink-600 dark:text-ink-300">No schedules yet</p>
            <p className="mt-1 text-sm text-ink-400">Your perfect schedule is just a few clicks away.</p>
            <Button
              className="mt-4"
              onClick={() => {
                const s = createBlankSchedule(settings.defaultScheduleType);
                upsert(s);
                navigate(`/builder/${s.id}`);
              }}
            >
              <PlusCircle size={16} /> Create Your First Schedule
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((s) => (
              <ScheduleMiniCard key={s.id} id={s.id} name={s.name} type={s.type} updated={s.updatedAt} color={s.settings.primaryColor} activities={s.activities.length} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Start from a Template</h2>
          <Link to="/templates" className="-my-1.5 flex items-center gap-1 py-1.5 text-xs font-medium text-[var(--accent)]">
            All templates <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TEMPLATE_META.slice(0, 4).map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/templates?use=${t.id}`)}
              className="rounded-2xl border border-ink-100 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <LayoutTemplate size={16} />
                </span>
              </div>
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-ink-400">{t.description}</div>
            </button>
          ))}
        </div>
      </section>

      <p className="mt-8 text-center text-[11px] text-ink-400 dark:text-ink-500">
        Your schedules are stored locally on this device.
      </p>
    </div>
  );
}

function ScheduleMiniCard({
  id,
  name,
  type,
  updated,
  color,
  activities,
}: {
  id: string;
  name: string;
  type: string;
  updated: number;
  color: string;
  activities?: number;
}) {
  return (
    <Link
      to={`/builder/${id}`}
      className="rounded-2xl border border-ink-100 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-center gap-2.5">
        <span className="h-9 w-9 shrink-0 rounded-xl" style={{ backgroundColor: color + '22' }}>
          <CalendarDays size={17} className="mx-auto mt-2" style={{ color }} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{name}</div>
          <div className="text-xs capitalize text-ink-400">
            {type} · {shortDate(new Date(updated).toISOString().slice(0, 10))}
            {activities !== undefined && ` · ${activities} activities`}
          </div>
        </div>
      </div>
    </Link>
  );
}