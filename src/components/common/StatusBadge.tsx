export interface StatusBadgeProps {
  label: string;
}

export function StatusBadge({ label }: StatusBadgeProps) {
  const cls = label.includes('수요')
    ? 'bg-ipo-demand-bg text-ipo-demand-text'
    : label.includes('청약')
      ? 'bg-ipo-subscribe-bg text-ipo-subscribe-text'
      : label.includes('상장')
        ? 'bg-ipo-listing-bg text-ipo-listing-text'
        : 'bg-ipo-review-bg text-ipo-review-text';
  return <span className={`inline-flex items-center rounded-xs px-ds-1 py-ds-0.5 text-micro font-bold ${cls}`}>{label}</span>;
}
