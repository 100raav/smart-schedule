import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { useSettingsStore, applyAccent } from './store/settingsStore';
import { useScheduleStore } from './store/scheduleStore';
import { buildDemoWeekly } from './services/templateService';
import { BootLoader } from './components/ui/BootLoader';

async function bootstrap() {
  const { applyTheme, settings } = useSettingsStore.getState();
  applyTheme();
  applyAccent(settings.accentColor);

  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('#root missing');
  createRoot(rootEl).render(
    <StrictMode>
      <BootLoader>
        <App />
      </BootLoader>
    </StrictMode>,
  );

  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(() => {});
    });
  }

  const count = await useScheduleStore.getState().loadAll();
  if (count === 0) {
    const demo = buildDemoWeekly();
    demo.isTemplate = false;
    useScheduleStore.getState().upsert(demo);
  }
}

void bootstrap();