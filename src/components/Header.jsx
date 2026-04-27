import ThemeToggle from './ThemeToggle.jsx';

const SERVICE_BADGES = ['가까운 순', '가성비 추천', '공유 링크', '즐겨찾기', '가격 차트'];

export default function Header({ themeMode, resolvedTheme, onThemeChange, favoriteCount = 0 }) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="리터세이브 홈">
        <span className="brand-mark">L</span>
        <span>리터세이브</span>
      </a>
      <div className="header-actions">
        <nav className="header-pills" aria-label="서비스 특징">
          {SERVICE_BADGES.map((badge) => <span key={badge}>{badge}</span>)}
          <span>저장된 즐겨찾기 {favoriteCount}곳</span>
        </nav>
        <ThemeToggle themeMode={themeMode} resolvedTheme={resolvedTheme} onThemeChange={onThemeChange} />
      </div>
    </header>
  );
}
