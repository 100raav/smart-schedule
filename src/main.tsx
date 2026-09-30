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
    const register = () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        // The new worker precaches and cleans up on its own; just fail quietly.
        .catch(() => {});
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    // A new worker took over, so whatever HTML this page was loaded from may
    // reference deleted bundles. Reload once to pick up the current build.
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type !== 'ss:activated') return;
      try {
        if (sessionStorage.getItem('ss-sw-reloaded') === '1') return;
        sessionStorage.setItem('ss-sw-reloaded', '1');
      } catch {
        /* private mode: still safe to reload once */
      }
      location.reload();
    });
  }

  const count = await useScheduleStore.getState().loadAll();
  if (count === 0) {
    const demo = buildDemoWeekly();
    demo.isTemplate = false;
    useScheduleStore.getState().upsert(demo);
  }
}

/**
 * If the shell cannot boot there is nothing to click, so paint a real message
 * with a way out instead of leaving a blank page.
 */
function fatal(message: string) {
  const el = document.getElementById('root');
  if (!el) return;
  el.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'min-height:100dvh;display:grid;place-items:center;padding:24px;font:16px/1.6 system-ui,sans-serif;background:#f7f6f2;color:#1b2033;text-align:center';
  const box = document.createElement('div');
  box.style.cssText = 'max-width:34rem';
  const h = document.createElement('h1');
  h.textContent = 'SmartSchedule could not start';
  h.style.cssText = 'font-size:1.15rem;font-weight:700;margin:0 0 8px';
  const p = document.createElement('p');
  p.textContent = message;
  p.style.cssText = 'margin:0 0 16px;color:#5b6070;font-size:.9rem;word-break:break-word';
  const btn = document.createElement('button');
  btn.textContent = 'Reload';
  btn.style.cssText =
    'font:inherit;font-weight:600;padding:10px 20px;border-radius:10px;border:0;background:#1b2033;color:#fff;cursor:pointer';
  btn.onclick = () => {
    // Also drop any stale service-worker shell, which is the usual cause.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => Promise.all(rs.map((r) => r.unregister())))
        .finally(() => location.reload());
    } else {
      location.reload();
    }
  };
  box.append(h, p, btn);
  wrap.append(box);
  el.append(wrap);
}

void bootstrap().catch((err) => {
  console.error('[smartschedule] boot failed', err);
  fatal(
    'A cached copy of the app may be out of date. Press Reload to fetch a fresh copy — this also clears the offline cache.',
  );
});