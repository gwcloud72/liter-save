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

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-none',
  secondary: 'border border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50 hover:text-ink-900',
  ghost: 'bg-ink-100 text-ink-700 hover:bg-ink-200 hover:text-ink-900',
  white: 'border border-white/70 bg-white/10 text-white hover:bg-white/20',
  danger: 'bg-up text-white hover:bg-up',
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: 'h-control-sm px-ds-2 text-caption',
  md: 'h-control-md px-ds-3 text-body-2',
  lg: 'h-control-lg px-ds-4 text-body-1',
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
      data-primary-cta={variant === 'primary' ? true : undefined}
      disabled={isDisabled}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-ds-1 whitespace-nowrap rounded-control font-bold transition-fast duration-fast ease-product active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:cursor-not-allowed disabled:opacity-45',
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        className,
      ].join(' ')}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : leftIcon}
      <span className="min-w-0 truncate">{children}</span>
      {rightIcon}
    </button>
  );
}
