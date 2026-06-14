import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ChangeDirection } from './types';

export interface PriceBadgeProps {
  direction: ChangeDirection;
  text: string;
  ariaLabel?: string;
}

const trendMap: Record<ChangeDirection, { className: string; label: string; Icon: typeof ArrowUp }> = {
  up: { className: 'bg-up-bg text-up', label: '상승', Icon: ArrowUp },
  down: { className: 'bg-down-bg text-down', label: '하락', Icon: ArrowDown },
  flat: { className: 'bg-flat-bg text-flat', label: '보합', Icon: Minus },
};

function safeBadgeText(direction: ChangeDirection, text: string): string {
  const trimmed = text.trim();
  if (direction === 'flat' && /^(\+|-)?0(?:원|%|%p)?(?: \(0%\))?$/.test(trimmed)) return '보합';
  return trimmed;
}

function BadgeText({ text }: { text: string }) {
  const parts: Array<string | JSX.Element> = [];
  const pattern = /(\d[\d,]*)(원\/L|원)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(<span key={`${match.index}-number`}>{match[1]}</span>);
    parts.push(<span key={`${match.index}-unit`} className="v6-unit">{match[2]}</span>);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts.length ? parts : text}</>;
}

export function PriceBadge({ direction, text, ariaLabel }: PriceBadgeProps) {
  const trend = trendMap[direction];
  const displayText = safeBadgeText(direction, text);
  const Icon = trend.Icon;
  return (
    <span
      aria-label={ariaLabel ?? `${trend.label} ${displayText}`}
      className={`inline-flex items-baseline gap-ds-0.5 rounded-full px-ds-1 py-ds-0.5 text-[13px] tabular ${trend.className}`}
    >
      <Icon aria-hidden="true" size={12} strokeWidth={1.8} className="shrink-0 self-center" />
      <BadgeText text={displayText} />
    </span>
  );
}
