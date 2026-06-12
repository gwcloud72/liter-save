import type { ChangeDirection } from './types';

export interface PriceBadgeProps {
  direction: ChangeDirection;
  text: string;
  ariaLabel?: string;
}

const trendMap: Record<ChangeDirection, { className: string; icon: string; label: string }> = {
  up: { className: 'bg-up-bg text-up', icon: '▲', label: '상승' },
  down: { className: 'bg-down-bg text-down', icon: '▼', label: '하락' },
  flat: { className: 'bg-flat-bg text-flat', icon: '—', label: '보합' },
};

function safeBadgeText(direction: ChangeDirection, text: string): string {
  const trimmed = text.trim();
  if (direction === 'flat' && /^(\+|-)?0(?:원|%|%p)?(?: \(0%\))?$/.test(trimmed)) return '보합';
  return trimmed;
}

export function PriceBadge({ direction, text, ariaLabel }: PriceBadgeProps) {
  const trend = trendMap[direction];
  const displayText = safeBadgeText(direction, text);
  return (
    <span
      aria-label={ariaLabel ?? `${trend.label} ${displayText}`}
      className={`inline-flex items-center gap-1 rounded-xs px-ds-1 py-ds-0.5 text-caption font-semibold tabular ${trend.className}`}
    >
      <span aria-hidden="true">{trend.icon}</span>
      {displayText}
    </span>
  );
}
