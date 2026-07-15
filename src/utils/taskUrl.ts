import { useEffect, useMemo, useState } from 'react';

export interface TaskRouteAlias {
  tab: string;
  params?: Record<string, string>;
}

export interface TaskRouteState {
  tab: string;
  params: URLSearchParams;
}

const TASK_ROUTE_EVENT = 'task-route-change';

function readRawRoute(): TaskRouteState {
  if (typeof window === 'undefined') return { tab: 'home', params: new URLSearchParams() };
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return { tab: 'home', params: new URLSearchParams() };
  if (raw.startsWith('/')) {
    const [pathPart, queryPart = ''] = raw.slice(1).split('?', 2);
    return { tab: decodeURIComponent(pathPart || 'home'), params: new URLSearchParams(queryPart) };
  }
  if (!raw.includes('=')) return { tab: decodeURIComponent(raw), params: new URLSearchParams() };
  const params = new URLSearchParams(raw);
  const tab = params.get('tab') || 'home';
  params.delete('tab');
  return { tab, params };
}

export function readTaskRoute(aliases: Record<string, TaskRouteAlias> = {}): TaskRouteState {
  const route = readRawRoute();
  const alias = aliases[route.tab];
  if (!alias) return route;
  const params = new URLSearchParams(route.params);
  Object.entries(alias.params ?? {}).forEach(([key, value]) => {
    if (!params.has(key)) params.set(key, value);
  });
  return { tab: alias.tab, params };
}

export function writeTaskRoute(tab: string, patch: Record<string, string | null | undefined> = {}, mode: 'push' | 'replace' = 'push') {
  if (typeof window === 'undefined') return;
  const current = readRawRoute();
  const params = new URLSearchParams(current.params);
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  });
  const hash = new URLSearchParams({ tab });
  params.forEach((value, key) => hash.set(key, value));
  const next = `#${hash.toString()}`;
  if (mode === 'replace') window.history.replaceState(null, '', next);
  else window.history.pushState(null, '', next);
  window.dispatchEvent(new Event(TASK_ROUTE_EVENT));
}

export function canonicalizeTaskRoute(aliases: Record<string, TaskRouteAlias> = {}) {
  if (typeof window === 'undefined') return;
  const raw = readRawRoute();
  const canonical = readTaskRoute(aliases);
  const rawParams = new URLSearchParams(raw.params);
  const canonicalParams = new URLSearchParams(canonical.params);
  const sameParams = rawParams.toString() === canonicalParams.toString();
  if (raw.tab === canonical.tab && sameParams && window.location.hash.startsWith('#tab=')) return;
  const next = new URLSearchParams({ tab: canonical.tab });
  canonical.params.forEach((value, key) => next.set(key, value));
  window.history.replaceState(null, '', `#${next.toString()}`);
}

export function useTaskRoute(aliases: Record<string, TaskRouteAlias> = {}): TaskRouteState {
  const stableAliases = useMemo(() => aliases, [aliases]);
  const [route, setRoute] = useState<TaskRouteState>(() => readTaskRoute(stableAliases));
  useEffect(() => {
    const sync = () => {
      setRoute(readTaskRoute(stableAliases));
      canonicalizeTaskRoute(stableAliases);
    };
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    window.addEventListener(TASK_ROUTE_EVENT, sync);
    sync();
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
      window.removeEventListener(TASK_ROUTE_EVENT, sync);
    };
  }, [stableAliases]);
  return route;
}
