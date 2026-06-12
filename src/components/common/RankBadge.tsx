export interface RankBadgeProps {
  value: number;
  emphasizedUntil?: number;
}

export function RankBadge({ value, emphasizedUntil = 3 }: RankBadgeProps) {
  if (value <= emphasizedUntil) {
    return <span className="inline-flex h-ds-3 w-ds-3 items-center justify-center rounded-full bg-primary-600 text-micro font-bold text-white tabular shadow-card">{value}</span>;
  }
  return <span className="inline-flex h-ds-3 w-ds-3 items-center justify-center rounded-full bg-ink-100 text-micro font-semibold text-ink-500 tabular">{value}</span>;
}
