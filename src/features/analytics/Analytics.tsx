import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Clock, CalendarDays, Briefcase, Dumbbell, Zap } from 'lucide-react';
import { useScheduleStore } from '../../store/scheduleStore';
import { allCategories } from '../../utils/schedule';
import { formatMinutes, parseDateKey } from '../../utils/time';
import { EmptyState } from '../../components/ui/Misc';
import { Button } from '../../components/ui/Button';

const CAT_ICONS: Record<string, string> = {
  study: '✏️',
  work: '💼',
  personal: '🏠',
  exercise: '💪',
  meeting: '🤝',
  break: '⚡',
  travel: '🚌',
  project: '📐',
  other: '📌',
};

export default function Analytics() {
  const schedules = useScheduleStore((s) => s.schedules);
  const mine = useMemo(
    () => schedules.filter((s) => !s.isTemplate).sort((a, b) => b.updatedAt - a.updatedAt),
    [schedules],
  );

  const data = useMemo(() => {
    let totalMinutes = 0;
    let study = 0;
    let work = 0;
    let exercise = 0;
    let breaks = 0;
    let count = 0;
    const byDay: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const s of mine) {
      const cats = allCategories(s);
      const catIdOf = (id: string) => cats.find((c) => c.id === id)?.id || id;
      for (const a of s.activities) {
        const minutes = Math.max(0, a.end - a.start);
        totalMinutes += minutes;
        count += 1;
        const cat = catIdOf(a.category);
        byCategory[cat] = (byCategory[cat] || 0) + minutes;
        if (cat === 'study') study += minutes;
        if (cat === 'work') work += minutes;
        if (cat === 'exercise') exercise += minutes;
        if (cat === 'break') breaks += minutes;
        byDay[a.date] = (byDay[a.date] || 0) + minutes;
      }
    }
    return { totalMinutes, study, work, exercise, breaks, count, byDay, byCategory };
  }, [mine]);

  const hours = Math.round((data.totalMinutes / 60) * 10) / 10;
  const avgDay = data.totalMinutes / Math.max(1, Object.keys(data.byDay).length);

  const catEntries = Object.entries(data.byCategory).sort((a, b) => b[1] - a[1]);
  const topCategories = catEntries.slice(0, 6);

  const dayEntries = useMemo(() => {
    const monday = new Date();
    const dow = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dow);
    const days: { label: string; minutes: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 86400000);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      days.push({ label: d.toLocaleDateString(undefined, { weekday: 'short' }), minutes: data.byDay[key] || 0 });
    }
    return days;
  }, [data.byDay]);

  const weeks = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [key, minutes] of Object.entries(data.byDay)) {
      const d = parseDateKey(key);
      const dow = (d.getDay() + 6) % 7;
      const monday = new Date(d);
      monday.setDate(monday.getDate() - dow);
      const mk = monday.toISOString().slice(0, 10);
      map[mk] = (map[mk] || 0) + minutes;
    }
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-8)
      .map(([k, v]) => ({ key: k, minutes: v }));
  }, [data.byDay]);

  const maxDay = Math.max(1, ...dayEntries.map((d) => d.minutes));
  const colors = ['#5873f8', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#ef4444', '#64748b', '#14b8a6'];
  const totalCat = Math.max(1, catEntries.reduce((s, [, v]) => s + v, 0));

  if (mine.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6 lg:p-10">
        <EmptyState
          icon={<BarChart3 size={26} />}
          title="No data yet"
          description="Analytics appear once you have activities in your schedules."
          action={
            <Link to="/dashboard">
              <Button variant="primary">Create a Schedule</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-1 text-xs font-medium uppercase tracking-widest text-ink-400">Insights</div>
      <h1 className="text-2xl font-extrabold tracking-tight">Analytics</h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">All statistics are computed locally on your device.</p>

      <motion.div
        className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <StatCard icon={<Clock size={16} />} label="Total time" value={`${hours}h`} sub={`${data.count} activities`} />
        <StatCard icon={<Zap size={16} />} label="Study" value={`${Math.round(data.study / 60 * 10) / 10}h`} color="#5873f8" />
        <StatCard icon={<Briefcase size={16} />} label="Work" value={`${Math.round(data.work / 60 * 10) / 10}h`} color="#0ea5e9" />
        <StatCard icon={<Dumbbell size={16} />} label="Exercise" value={`${Math.round(data.exercise / 60 * 10) / 10}h`} color="#f59e0b" />
        <StatCard icon={<Zap size={16} />} label="Break time" value={`${Math.round(data.breaks / 60 * 10) / 10}h`} color="#ef4444" />
        <StatCard icon={<CalendarDays size={16} />} label="Avg / day" value={formatMinutes(avgDay)} color="#10b981" />
      </motion.div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <motion.section className="card p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h2 className="text-sm font-bold">This week</h2>
          <div className="mt-4 flex items-end gap-2" style={{ height: 130 }}>
            {dayEntries.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] text-ink-400">{Math.round(d.minutes / 60 * 10) / 10}h</span>
                <div className="w-full rounded-t-lg transition-all hover:opacity-80" style={{ height: Math.max(4, (d.minutes / maxDay) * 96), backgroundColor: i >= 5 ? '#94a3b8' : 'var(--accent)', opacity: d.minutes === 0 ? 0.25 : 1 }} />
                <span className="text-[10px] font-semibold text-ink-400">{d.label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section className="card p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h2 className="text-sm font-bold">By category</h2>
          <div className="mt-4 flex items-center gap-5">
            <Donut data={catEntries.map(([id, v]) => ({ id, value: v }))} total={totalCat} colors={colors} />
            <ul className="flex-1 space-y-2">
              {topCategories.map(([id, v], i) => {
                const pct = Math.round((v / totalCat) * 100);
                const name = catName(id);
                return (
                  <li key={id} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-center">{CAT_ICONS[id] || '•'}</span>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="flex-1">{name}</span>
                    <span className="font-semibold">{pct}%</span>
                    <span className="text-ink-400">{Math.round(v / 60 * 10) / 10}h</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.section>
      </div>

      <motion.section className="card mt-4 p-5" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <h2 className="text-sm font-bold">Weekly distribution <span className="font-normal text-ink-400">(last 8 weeks)</span></h2>
        <div className="mt-4 space-y-2.5">
          {weeks.map((w) => (
            <div key={w.key} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-[11px] text-ink-400">{fmtWeek(w.key)}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (w.minutes / Math.max(1, ...weeks.map((x) => x.minutes))) * 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-[11px] font-semibold">{Math.round(w.minutes / 60 * 10) / 10}h</span>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}

function catName(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
}

function fmtWeek(key: string): string {
  const d = parseDateKey(key);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card flex flex-col p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: (color || 'var(--accent)') + '1c', color: color || 'var(--accent)' }}>
        {icon}
      </span>
      <span className="mt-3 text-xl font-extrabold tracking-tight">{value}</span>
      <span className="text-xs font-medium text-ink-500 dark:text-ink-400">{label}</span>
      {sub && <span className="mt-0.5 text-[10px] text-ink-400">{sub}</span>}
    </div>
  );
}

function Donut({ data, total, colors }: { data: { id: string; value: number }[]; total: number; colors: string[] }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--accent)" strokeOpacity={0.08} strokeWidth="14" />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const offset = -acc * c;
          acc += frac;
          return (
            <circle
              key={d.id}
              cx="48"
              cy="48"
              r={r}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="14"
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(0, dash - 1.5)} ${c - Math.max(0, dash - 1.5)}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-extrabold">{data.length}</span>
        <span className="text-[10px] text-ink-400">categories</span>
      </div>
    </div>
  );
}