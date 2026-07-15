export interface RankBadgeProps {
  value: number;
  emphasizedUntil?: number;
}

export function RankBadge({ value, emphasizedUntil = 3 }: RankBadgeProps) {
  if (value === 1) {
    return <span className="inline-flex h-ds-3 w-ds-3 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white tabular shadow-card">{value}</span>;
  }
  if (value <= emphasizedUntil) {
    return <span className="inline-flex h-ds-3 w-ds-3 items-center justify-center rounded-full border border-ink-400 bg-white text-[11px] font-bold text-ink-700 tabular">{value}</span>;
  }
  return <span className="inline-flex h-ds-3 w-ds-3 items-center justify-center rounded-full bg-ink-100 text-[11px] text-ink-500 tabular">{value}</span>;
}
