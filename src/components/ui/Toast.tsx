import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

const ICONS = {
  success: <CheckCircle2 size={18} className="text-emerald-500" />,
  error: <XCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-sky-500" />,
};

const BORDERS = {
  success: 'border-emerald-200 dark:border-emerald-500/30',
  error: 'border-red-200 dark:border-red-500/30',
  info: 'border-sky-200 dark:border-sky-500/30',
};

export function ToastViewport() {
  const { toasts, dismissToast } = useUIStore();
  return (
    <div className="no-print fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex w-full max-w-sm flex-col gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 sm:px-0">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', damping: 26, stiffness: 400 }}
            className={`flex items-start gap-3 rounded-xl border bg-white dark:bg-[#1f2028] shadow-lift px-4 py-3 ${BORDERS[t.type]}`}
            role="status"
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink-900 dark:text-white">{t.message}</p>
              {t.sub && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{t.sub}</p>}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="btn-ghost -mr-1 -mt-1 h-6 w-6 p-0"
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}