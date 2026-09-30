import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 dark:border-white/15 px-6 py-14 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-500 dark:text-ink-400">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-ink-200 dark:border-white/15 bg-ink-50 dark:bg-white/5 px-1.5 text-[11px] font-semibold text-ink-600 dark:text-ink-300">
      {children}
    </kbd>
  );
}

export function Badge({ children, color = 'ink' }: { children: ReactNode; color?: string }) {
  return (
    <span className="chip" style={{ backgroundColor: color + '18', color, borderColor: color + '40' }}>
      {children}
    </span>
  );
}