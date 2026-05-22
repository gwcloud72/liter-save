import { TABS } from '../config/navigation.js';
import { DEFAULT_FILTERS, normalizeSort } from '../lib/dashboardData.js';

export function readHashState() {
  if (typeof window === 'undefined') return { tab: 'home', filters: DEFAULT_FILTERS };
  const [rawTab, rawQuery = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  const tab = TABS.some((item) => item.id === rawTab) ? rawTab : 'home';
  const params = new URLSearchParams(rawQuery);
  return {
    tab,
    filters: {
      regionCode: params.get('region') || DEFAULT_FILTERS.regionCode,
      fuelCode: params.get('fuel') || DEFAULT_FILTERS.fuelCode,
      query: params.get('q') || '',
      sort: normalizeSort(params.get('sort') || DEFAULT_FILTERS.sort),
    },
  };
}

export function writeHashState(tab, filters) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (filters.regionCode !== DEFAULT_FILTERS.regionCode) params.set('region', filters.regionCode);
  if (filters.fuelCode !== DEFAULT_FILTERS.fuelCode) params.set('fuel', filters.fuelCode);
  if (filters.query.trim()) params.set('q', filters.query.trim());
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set('sort', filters.sort);
  const hash = `#${tab}${params.toString() ? `?${params.toString()}` : ''}`;
  if (window.location.hash !== hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
}
