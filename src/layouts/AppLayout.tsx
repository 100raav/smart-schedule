import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarDays,
  LayoutTemplate,
  PlusCircle,
  BarChart3,
  Settings,
  Menu,
  X,
  Clock2,
  HardDrive,
  ChevronRight,
} from 'lucide-react';
import { useScheduleStore } from '../store/scheduleStore';
import { useSettingsStore } from '../store/settingsStore';
import { createBlankSchedule } from '../utils/schedule';
import { useUIStore } from '../store/uiStore';
import { Button } from '../components/ui/Button';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/schedules', label: 'My Schedules', icon: CalendarDays },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const schedules = useScheduleStore((s) => s.schedules);
  const upsert = useScheduleStore((s) => s.upsert);
  const settings = useSettingsStore((s) => s.settings);
  const toast = useUIStore((s) => s.toast);
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);

  const recent = schedules
    .filter((s) => !s.isTemplate)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 5);

  const createNew = () => {
    const s = createBlankSchedule(settings.defaultScheduleType);
    upsert(s);
    toast('success', 'Schedule created', s.name);
    navigate(`/builder/${s.id}`);
  };

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <item.icon size={17} />
          {item.label}
        </NavLink>
      ))}
      <button className="nav-item text-left" onClick={() => setShortcutsOpen(true)}>
        <Clock2 size={17} />
        Shortcuts
      </button>
    </nav>
  );

  const recentBlock = (
    <div className="mt-6">
      <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500">
        Recent
      </div>
      <div className="space-y-0.5">
        {recent.length === 0 && (
          <p className="px-3 text-xs text-ink-400">Nothing yet.</p>
        )}
        {recent.map((s) => (
          <Link
            key={s.id}
            to={`/builder/${s.id}`}
            onClick={() => setMobileOpen(false)}
            className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-600 dark:text-ink-300 hover:bg-ink-100/70 dark:hover:bg-white/10"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.settings.primaryColor }}
            />
            <span className="flex-1 truncate">{s.name}</span>
            <ChevronRight size={13} className="opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        ))}
      </div>
    </div>
  );

  const footerBlock = (
    <div className="mt-6 rounded-xl border border-ink-100 dark:border-white/10 p-3 text-[11px] text-ink-400 dark:text-ink-500">
      <div className="flex items-center gap-1.5 font-medium text-ink-500 dark:text-ink-400">
        <HardDrive size={12} />
        Local-first
      </div>
      Your schedules are stored locally on this device. No account needed.
    </div>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col p-4">
      <Link to="/" className="mb-6 flex items-center gap-2.5 px-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#5873f8,#303ccb)' }}>
          <CalendarDays size={18} />
        </div>
        <div>
          <div className="text-[15px] font-extrabold tracking-tight leading-none">SmartSchedule</div>
          <div className="text-[10px] text-ink-400 dark:text-ink-500">Create. Organize. Plan.</div>
        </div>
      </Link>
      <Button className="mb-5" onClick={createNew}>
        <PlusCircle size={16} /> Create Schedule
      </Button>
      {nav}
      {recentBlock}
      <div className="flex-1" />
      {footerBlock}
    </div>
  );

  return (
    <div className="flex h-full">
      <aside className="no-print hidden md:block w-[248px] shrink-0 border-r border-ink-100 dark:border-white/10 bg-white dark:bg-[#15161c]">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="no-print md:hidden fixed inset-0 z-[60] bg-ink-950/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="no-print md:hidden fixed inset-y-0 left-0 z-[70] w-[280px] bg-white dark:bg-[#15161c]"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            >
              <div className="absolute right-3 top-3">
                <button className="btn-ghost h-8 w-8 p-0" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X size={16} />
                </button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-ink-100 dark:border-white/10 bg-white/85 dark:bg-[#15161c]/85 backdrop-blur px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button className="btn-ghost h-9 w-9 p-0" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <Link to="/" className="-my-1 flex items-center py-1 text-sm font-extrabold tracking-tight">SmartSchedule</Link>
          </div>
          <Button size="sm" onClick={createNew}>
            <PlusCircle size={14} /> New
          </Button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children ?? <Outlet />}</main>

        <nav
          className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-ink-100 dark:border-white/10 bg-white/95 dark:bg-[#15161c]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
          aria-label="Mobile navigation"
        >
          <div className="grid grid-cols-5">
            {NAV.slice(0, 4).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                    isActive ? 'text-[var(--accent)]' : 'text-ink-400 dark:text-ink-500'
                  }`
                }
              >
                <item.icon size={19} />
                {item.label.split(' ')[0]}
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium ${
                  isActive ? 'text-[var(--accent)]' : 'text-ink-400 dark:text-ink-500'
                }`
              }
            >
              <Settings size={19} />
              Settings
            </NavLink>
          </div>
        </nav>
        <div className="md:hidden h-[64px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div>
    </div>
  );
}