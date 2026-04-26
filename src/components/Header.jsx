import ThemeToggle from './ThemeToggle.jsx';

const SERVICE_BADGES = ['휘발유', '경유', '가까운순', '가성비추천'];

export default function Header({ themeMode, resolvedTheme, onThemeChange }) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="리터세이브 홈">
        <span className="brand-mark">L</span>
        <span>리터세이브</span>
      </a>
      <div className="header-actions">
        <nav className="header-pills" aria-label="서비스 특징">
          {SERVICE_BADGES.map((badge) => <span key={badge}>{badge}</span>)}
        </nav>
        <ThemeToggle themeMode={themeMode} resolvedTheme={resolvedTheme} onThemeChange={onThemeChange} />
      </div>
    </header>
  );
}
