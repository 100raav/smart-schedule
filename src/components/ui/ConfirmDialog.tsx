import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { Button } from './Button';

export function ConfirmDialog() {
  const { confirm, resolveConfirm } = useUIStore();
  return (
    <AnimatePresence>
      {confirm && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" aria-hidden />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-[#191a21] p-6 shadow-lift border border-ink-100 dark:border-white/10"
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
          >
            <div
              className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                confirm.danger
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-500'
                  : 'bg-ink-100 dark:bg-white/10 text-ink-600'
              }`}
            >
              <AlertTriangle size={20} />
            </div>
            <h2 id="confirm-title" className="text-base font-semibold text-ink-900 dark:text-white">
              {confirm.title}
            </h2>
            <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{confirm.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => resolveConfirm(false)}>
                {confirm.cancelLabel || 'Cancel'}
              </Button>
              <Button variant={confirm.danger ? 'danger' : 'primary'} onClick={() => resolveConfirm(true)}>
                {confirm.confirmLabel || 'Confirm'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}