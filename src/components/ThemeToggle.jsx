const THEME_OPTIONS = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
];

export default function ThemeToggle({ themeMode, resolvedTheme, onThemeChange }) {
  return (
    <div className="theme-toggle" role="group" aria-label="화면 모드 선택">
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`theme-toggle__button${themeMode === option.value ? ' is-active' : ''}`}
          onClick={() => onThemeChange(option.value)}
          aria-pressed={themeMode === option.value}
          aria-label={`${option.label} 모드${option.value === 'system' ? `, 현재 ${resolvedTheme === 'dark' ? '다크' : '라이트'} 적용 중` : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
