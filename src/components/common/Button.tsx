import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'white' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  ariaLabel?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-none',
  secondary: 'border border-ink-200 bg-white text-ink-700 hover:border-primary-500 hover:text-primary-600',
  ghost: 'bg-ink-100 text-ink-700 hover:bg-primary-50 hover:text-primary-600',
  white: 'border border-white/70 bg-white/10 text-white hover:bg-white/20',
  danger: 'bg-up text-white hover:bg-up',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-ds-2 text-caption',
  md: 'h-10 px-ds-3 text-body-2',
  lg: 'h-11 px-ds-4 text-body-1',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className = '',
  ariaLabel,
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      disabled={isDisabled}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-ds-1 rounded-md font-bold transition-fast duration-fast ease-product active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : leftIcon}
      <span className="truncate">{children}</span>
      {rightIcon}
    </button>
  );
}
