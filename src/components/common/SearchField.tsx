import { Search } from 'lucide-react';

export interface SearchFieldProps {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  label?: string;
  disabled?: boolean;
}

export function SearchField({ value, onChange, placeholder, label = '검색어', disabled = false }: SearchFieldProps) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Search className="absolute left-ds-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" strokeWidth={1.8} />
      <input
        aria-label={label}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-ink-200 bg-white pl-ds-5 pr-ds-2 text-body-2 outline-none transition-fast duration-fast ease-product placeholder:text-ink-400 focus:border-primary-500 focus:shadow-focus disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-400"
      />
    </label>
  );
}
