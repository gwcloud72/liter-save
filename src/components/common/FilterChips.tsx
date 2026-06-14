export interface FilterChipsProps {
  items: string[];
  active: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
}

const displayLabels: Record<string, string> = { up: '상승', down: '하락', flat: '보합' };

export function FilterChips({ items, active, onChange, ariaLabel = '필터' }: FilterChipsProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-ds-1">
      {items.map((item) => {
        const selected = active === item;
        return (
          <button
            type="button"
            key={item}
            aria-pressed={selected}
            onClick={() => onChange(item)}
            className={[
              'h-9 rounded-full border px-ds-2 text-[15px] transition-fast duration-fast ease-product active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:shadow-focus',
              selected
                ? 'v6-chip-selected border-primary-600 bg-primary-600 text-white'
                : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-100',
            ].join(' ')}
          >
            {displayLabels[item] ?? item}
          </button>
        );
      })}
    </div>
  );
}
