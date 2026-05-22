import { useEffect, useMemo, useState } from 'react';

const FAVORITE_KEY = 'litersave.favoriteStations.v36';

function readFavorites(defaults = []) {
  if (typeof window === 'undefined') return defaults;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FAVORITE_KEY) || 'null');
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : defaults;
  } catch {
    return defaults;
  }
}

export function useFavorites(defaults) {
  const [items, setItems] = useState(() => readFavorites(defaults));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(FAVORITE_KEY, JSON.stringify(items));
    } catch {
      // 저장소 접근이 제한된 환경에서는 관심 목록을 메모리 상태로만 유지합니다.
    }
  }, [items]);
  const ids = useMemo(() => new Set(items), [items]);
  return { ids, has: (id) => ids.has(id), toggle: (id) => setItems((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]) };
}
