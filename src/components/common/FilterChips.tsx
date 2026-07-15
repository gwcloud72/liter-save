export interface FilterChipsProps {
  items: string[];
  active: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
}

const filterDisplayLabels: Record<string, string> = { up: '상승', down: '하락', flat: '보합' };

export function FilterChips({ items, active, onChange, ariaLabel = '필터' }: FilterChipsProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-ds-1">
      {items.map((filterValue) => {
        const isSelected = active === filterValue;
        return (
          <button
            type="button"
            key={filterValue}
            aria-pressed={isSelected}
            onClick={() => onChange(filterValue)}
            className={[
              'h-control-sm rounded-pill border px-ds-2 text-body-2 font-bold transition-fast duration-fast ease-product active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:shadow-focus',
              isSelected
                ? 'v6-chip-selected border-primary-600 bg-primary-600 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-100',
            ].join(' ')}
          >
            {filterDisplayLabels[filterValue] ?? filterValue}
          </button>
        );
      })}
    </div>
  );
}
