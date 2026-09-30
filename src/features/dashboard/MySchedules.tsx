import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Star,
  Copy,
  Pencil,
  Trash2,
  Download,
  Upload,
  CalendarDays,
  MoreVertical,
  Clock,
  FileJson,
} from 'lucide-react';
import { useScheduleStore } from '../../store/scheduleStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Misc';
import { Input } from '../../components/ui/Modal';
import { exportScheduleJson, importScheduleJson } from '../../services/jsonService';
import { shortDate } from '../../utils/time';
import { computeDaysForType } from '../../utils/schedule';

type Filter = 'all' | 'favorites' | 'daily' | 'weekly' | 'monthly' | 'custom';

export default function MySchedules() {
  const schedules = useScheduleStore((s) => s.schedules);
  const upsert = useScheduleStore((s) => s.upsert);
  const remove = useScheduleStore((s) => s.delete);
  const duplicate = useScheduleStore((s) => s.duplicate);
  const toast = useUIStore((s) => s.toast);
  const requestConfirm = useUIStore((s) => s.requestConfirm);
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [menu, setMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const mine = useMemo(
    () => schedules.filter((s) => !s.isTemplate).sort((a, b) => b.updatedAt - a.updatedAt),
    [schedules],
  );

  const filtered = mine.filter((s) => {
    const matchesQuery =
      !query ||
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(query.toLowerCase()) ||
      s.activities.some((a) => a.title.toLowerCase().includes(query.toLowerCase()));
    const matchesFilter =
      filter === 'all' || filter === 'favorites' ? (filter === 'favorites' ? s.favorite : true) : s.type === filter;
    return matchesQuery && matchesFilter;
  });

  const startRename = (id: string, name: string) => {
    setRenaming(id);
    setRenameValue(name);
  };

  const confirmRename = () => {
    if (!renaming || !renameValue.trim()) {
      setRenaming(null);
      return;
    }
    upsert({ ...(mine.find((s) => s.id === renaming) as NonNullable<typeof mine[0]>), name: renameValue.trim() });
    toast('success', 'Schedule renamed', renameValue.trim());
    setRenaming(null);
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await requestConfirm({
      title: 'Delete schedule?',
      message: `"${name}" and all of its activities will be permanently removed from this device.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) {
      remove(id);
      toast('info', 'Schedule deleted', name);
    }
  };

  const handleExport = (id: string) => {
    const s = mine.find((x) => x.id === id);
    if (!s) return;
    const name = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    exportScheduleJson(s, `${name}.json`);
    toast('success', 'Schedule exported as JSON', `${name}.json`);
  };

  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      for (const file of Array.from(files)) {
        const imported = await importScheduleJson(file);
        imported.forEach((s) => {
          const merged = { ...s };
          merged.settings = { ...merged.settings, days: computeDaysForType(merged.type, merged.startDate, merged.settings, merged.endDate) };
          merged.isTemplate = undefined;
          merged.favorite = false;
          upsert(merged);
        });
        toast('success', 'Imported', file.name);
      }
    } catch (e) {
      toast('error', 'Import failed', (e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-medium uppercase tracking-widest text-ink-400">Library</div>
          <h1 className="text-2xl font-extrabold tracking-tight">My Schedules</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {mine.length} schedule{mine.length === 1 ? '' : 's'} · stored locally
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} /> Import JSON
          </Button>
          <Link to="/dashboard">
            <Button>
              <CalendarDays size={15} /> New Schedule
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search schedules or activities… (e.g. IELTS)"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'favorites', 'daily', 'weekly', 'monthly', 'custom'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
              style={{
                background: filter === f ? 'var(--accent)' : 'var(--accent)0d',
                color: filter === f ? '#fff' : 'var(--accent)',
              }}
            >
              {f === 'favorites' ? '★ Favorites' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={26} />}
            title={query || filter !== 'all' ? 'No matches' : 'No schedules yet'}
            description={
              query || filter !== 'all'
                ? 'Try a different search or filter.'
                : 'Your perfect schedule is just a few clicks away.'
            }
            action={
              !query && filter === 'all' ? (
                <Link to="/dashboard">
                  <Button variant="primary">Create Your First Schedule</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card group relative flex flex-col overflow-hidden p-4"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: s.settings.primaryColor }}
                />
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => {
                      upsert({ ...s, favorite: !s.favorite });
                      toast('success', s.favorite ? 'Removed from favorites' : 'Added to favorites', s.name);
                    }}
                    aria-label={s.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={`btn-ghost h-8 w-8 p-0 ${s.favorite ? 'text-amber-500' : 'text-ink-300 dark:text-ink-500'}`}
                  >
                    <Star size={16} fill={s.favorite ? 'currentColor' : 'none'} />
                  </button>
                  <div className="relative">
                    <button className="btn-ghost h-8 w-8 p-0" aria-label="More actions" onClick={() => setMenu(menu === s.id ? null : s.id)}>
                      <MoreVertical size={16} />
                    </button>
                    <AnimatePresence>
                      {menu === s.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-ink-100 dark:border-white/10 bg-white dark:bg-[#1b1c23] p-1.5 shadow-lift"
                        >
                          <MenuRow
                            onClick={() => {
                              if (duplicate(s.id)) toast('success', 'Schedule duplicated');
                              setMenu(null);
                            }}
                          >
                            <Copy size={13} /> Duplicate
                          </MenuRow>
                          <MenuRow
                            onClick={() => {
                              startRename(s.id, s.name);
                              setMenu(null);
                            }}
                          >
                            <Pencil size={13} /> Rename
                          </MenuRow>
                          <MenuRow onClick={() => { handleExport(s.id); setMenu(null); }}>
                            <FileJson size={13} /> Export JSON
                          </MenuRow>
                          <MenuRow
                            danger
                            onClick={() => {
                              handleDelete(s.id, s.name);
                              setMenu(null);
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </MenuRow>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <Link to={`/builder/${s.id}`} className="mt-1 block min-w-0">
                  <h3 className="truncate text-base font-bold">{s.name}</h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-400 min-h-[32px]">
                    {s.description || 'No description'}
                  </p>
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-400">
                  <span className="chip" style={{ backgroundColor: s.settings.primaryColor + '14', color: s.settings.primaryColor, borderColor: s.settings.primaryColor + '30' }}>
                    {s.type}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={11} /> {s.activities.length} activities
                  </span>
                  <span className="ml-auto">{timeAgo(s.updatedAt)}</span>
                </div>

                {renaming === s.id && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmRename();
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                      className="!py-1.5 text-sm"
                    />
                    <Button size="sm" onClick={confirmRename}>OK</Button>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <Link to={`/builder/${s.id}`} className="flex-1">
                    <Button size="sm" className="w-full">Open</Button>
                  </Link>
                  <Button size="sm" variant="secondary" onClick={() => handleExport(s.id)} aria-label="Export JSON">
                    <Download size={13} />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        multiple
        className="hidden"
        onChange={(e) => {
          handleImportFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function MenuRow({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${
        danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return shortDate(new Date(ts).toISOString().slice(0, 10));
}