export type PriceAmountSize = 'sm' | 'md' | 'lg' | 'xl';
export type PriceAmountTone = 'default' | 'muted' | 'saving' | 'danger' | 'inverse';

export interface PriceAmountProps {
  value: number;
  unit?: string;
  size?: PriceAmountSize;
  tone?: PriceAmountTone;
  className?: string;
  signed?: boolean;
}

const sizeClasses: Record<PriceAmountSize, string> = {
  sm: 'text-[18px] leading-[1.15]',
  md: 'text-[22px] leading-[1.1]',
  lg: 'text-[30px] leading-[1.05]',
  xl: 'text-[40px] leading-[1]',
};

const unitClasses: Record<PriceAmountSize, string> = {
  sm: 'text-[12px]',
  md: 'text-[13px]',
  lg: 'text-[14px]',
  xl: 'text-[15px]',
};

const toneClasses: Record<PriceAmountTone, string> = {
  default: 'text-ink-900',
  muted: 'text-ink-700',
  saving: 'text-down',
  danger: 'text-up',
  inverse: 'text-white',
};

export function PriceAmount({
  value,
  unit = '원',
  size = 'md',
  tone = 'default',
  className = '',
  signed = false,
}: PriceAmountProps) {
  const rounded = Math.round(value);
  const sign = signed && rounded > 0 ? '+' : '';
  return (
    <span
      className={[
        'ls-price inline-flex items-baseline gap-ds-0.5 whitespace-nowrap font-bold tabular no-underline',
        sizeClasses[size],
        toneClasses[tone],
        className,
      ].join(' ')}
    >
      <span className="ls-price-number tracking-[-0.03em]">{sign}{rounded.toLocaleString()}</span>
      <span className={`ls-price-unit font-bold leading-none ${unitClasses[size]}`}>{unit}</span>
    </span>
  );
}
