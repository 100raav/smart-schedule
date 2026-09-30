import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  children?: ReactNode;
}

const sizeClasses: Record<string, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
  icon: 'h-9 w-9 p-0',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const cls =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
        ? 'btn-secondary'
        : variant === 'danger'
          ? 'btn-danger'
          : 'btn-ghost';
  return (
    <button className={`${cls} ${sizeClasses[size]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  variant = 'ghost',
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ghost' | 'secondary' | 'danger';
  label: string;
  children: ReactNode;
}) {
  const cls =
    variant === 'secondary'
      ? 'btn-secondary h-9 w-9 p-0'
      : variant === 'danger'
        ? 'btn-ghost h-9 w-9 p-0 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
        : 'btn-ghost h-9 w-9 p-0';
  return (
    <button aria-label={label} title={label} className={`${cls} ${className}`} {...rest}>
      {children}
    </button>
  );
}