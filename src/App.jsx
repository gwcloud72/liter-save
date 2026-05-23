import { lazy, Suspense, useEffect, useState } from 'react';
import Dashboard from './components/dashboard.jsx';

const LiterSaveShowcase = lazy(() => import('./showcase/ShowcasePage.jsx'));

function getIsShowcase() {
  if (typeof window === 'undefined') return false;
  return window.location.hash.replace(/^#\/?/, '').startsWith('showcase');
}

export default function App() {
  const [isShowcase, setIsShowcase] = useState(getIsShowcase);

  useEffect(() => {
    const updateRoute = () => setIsShowcase(getIsShowcase());
    window.addEventListener('hashchange', updateRoute);
    updateRoute();
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  if (isShowcase) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-50" aria-label="쇼케이스 화면을 불러오는 중" />}>
        <LiterSaveShowcase />
      </Suspense>
    );
  }

  return <Dashboard />;
}
