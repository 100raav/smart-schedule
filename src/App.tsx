import { HashRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { AppLayout } from './layouts/AppLayout';
import Landing from './features/landing/Landing';
import Dashboard from './features/dashboard/Dashboard';
import MySchedules from './features/dashboard/MySchedules';
import Templates from './features/templates/Templates';
import Analytics from './features/analytics/Analytics';
import Settings from './features/settings/Settings';
import Builder from './features/builder/Builder';
import { ToastViewport } from './components/ui/Toast';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import ShortcutsModal from './components/ui/ShortcutsModal';
import { useScheduleStore } from './store/scheduleStore';
import { useSettingsStore } from './store/settingsStore';
import { useUIStore } from './store/uiStore';
import { scheduleReminderLoop } from './services/notify';

function globalShortcuts(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement | null)?.tagName;
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (typing) return;
  if (e.key === '?') {
    e.preventDefault();
    useUIStore.getState().setShortcutsOpen(true);
  }
}

export default function App() {
  useEffect(() => {
    const stop = scheduleReminderLoop(
      () => useScheduleStore.getState().schedules,
      () => useSettingsStore.getState().settings.notificationsEnabled,
    );
    document.addEventListener('keydown', globalShortcuts);
    return () => {
      stop();
      document.removeEventListener('keydown', globalShortcuts);
    };
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/schedules" element={<MySchedules />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/builder/:id" element={<Builder />} />
        </Route>
      </Routes>
      <ToastViewport />
      <ConfirmDialog />
      <ShortcutsModal />
    </HashRouter>
  );
}