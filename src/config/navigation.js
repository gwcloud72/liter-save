export const TABS = [
  { id: 'home', label: '홈' },
  { id: 'regions', label: '지역별 비교' },
  { id: 'fuel', label: '유종별 시세' },
  { id: 'report', label: '가격 리포트' },
  { id: 'favorites', label: '관심 목록' },
];

export function getInitialTab() {
  if (typeof window === 'undefined') return 'home';
  const raw = window.location.hash.replace(/^#\/?/, '').trim().split('?')[0] || 'home';
  return TABS.some((tab) => tab.id === raw) ? raw : 'home';
}
