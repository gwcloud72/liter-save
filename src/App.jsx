import { useEffect, useState } from 'react';

const BASE_URL = import.meta.env.BASE_URL;
const OIL_PRICE_URL = `${BASE_URL}data/oil-prices.json`;
const OIL_HISTORY_URL = `${BASE_URL}data/oil-history.json`;
const GLOBAL_OIL_URL = `${BASE_URL}data/global-oil.json`;
const OIL_REPORT_URL = `${BASE_URL}data/oil-ai-report.json`;

const DEFAULT_FUEL_CODE = 'B027';
const DEFAULT_REGION_CODE = '01';

async function readJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  const number = toNumber(value);
  return number === null ? '-' : number.toLocaleString('ko-KR');
}

function formatWon(value) {
  const number = toNumber(value);
  return number === null ? '-' : `${Math.round(number).toLocaleString('ko-KR')}원`;
}

function formatUsd(value) {
  const number = toNumber(value);
  return number === null ? '-' : `$${number.toFixed(2)}`;
}

function formatSigned(value, suffix = '') {
  const number = toNumber(value);
  if (number === null) return '-';
  return `${number > 0 ? '+' : ''}${Math.round(number).toLocaleString('ko-KR')}${suffix}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replace(/\.$/, '');
}

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatShortDate(value) {
  const text = String(value ?? '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text.slice(5, 7)}.${text.slice(8, 10)}`;
  return text || '-';
}

function getTickIndexes(length, maxTicks = 5) {
  if (length <= 0) return [];
  if (length <= maxTicks) return Array.from({ length }, (_, index) => index);
  const last = length - 1;
  return Array.from(new Set(Array.from({ length: maxTicks }, (_, index) => Math.round((last * index) / (maxTicks - 1)))));
}

function joinText(values, fallback = '-') {
  const text = values.map((value) => String(value ?? '').trim()).filter(Boolean).join(' · ');
  return text || fallback;
}

function getHashRoute() {
  if (typeof window === 'undefined') return { page: 'home', detail: '' };
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  const [page = 'home', ...rest] = raw ? raw.split('/') : ['home'];
  return { page: page || 'home', detail: rest.join('/') };
}

function useHashRoute() {
  const [route, setRoute] = useState(getHashRoute);
  useEffect(() => {
    const update = () => setRoute(getHashRoute());
    window.addEventListener('hashchange', update);
    update();
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return route;
}

function uniqueBy(items, keyGetter) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyGetter(item);
    if (key !== undefined && key !== null && key !== '') map.set(String(key), item);
  });
  return [...map.values()];
}

function average(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (!numbers.length) return null;
  return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}

function getDateKey(value) {
  const text = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function toTimestamp(value) {
  const time = new Date(value ?? '').getTime();
  return Number.isFinite(time) ? time : 0;
}

function aggregateDailyPoints(points, { strategy = 'latest' } = {}) {
  const dailyMap = new Map();
  points.forEach((point, order) => {
    const date = getDateKey(point?.date ?? point?.label ?? point?.capturedAt);
    const value = toNumber(point?.value);
    if (!date || value === null) return;
    const current = dailyMap.get(date);
    const capturedAt = point?.capturedAt ?? point?.date ?? point?.label ?? date;
    const item = { ...point, label: date, date, value, capturedAt, order };
    if (!current) {
      dailyMap.set(date, strategy === 'average' ? { date, points: [item] } : item);
      return;
    }
    if (strategy === 'average') {
      current.points.push(item);
      return;
    }
    const currentTime = toTimestamp(current.capturedAt);
    const nextTime = toTimestamp(capturedAt);
    if (nextTime > currentTime || (nextTime === currentTime && order > current.order)) {
      dailyMap.set(date, item);
    }
  });
  const items = [...dailyMap.values()].map((entry) => {
    if (strategy !== 'average') return entry;
    const values = entry.points.map((point) => point.value).filter(Number.isFinite);
    const latest = entry.points.reduce((selected, point) => (toTimestamp(point.capturedAt) >= toTimestamp(selected.capturedAt) ? point : selected), entry.points[0]);
    return { ...latest, label: entry.date, date: entry.date, value: values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1), samples: values.length };
  });
  return items.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function getStationPrice(station) {
  return toNumber(station?.price ?? station?.PRICE ?? station?.priceValue);
}

function getStationRouteId(station, index) {
  const raw = station?.id || station?.name || `station-${index}`;
  return encodeURIComponent(String(raw).replace(/\s+/g, '-'));
}

function findStationByRouteId(stations, detail) {
  return stations.find((station, index) => getStationRouteId(station, index) === detail);
}

function buildMapSearchUrl(station) {
  const query = station?.roadAddress || station?.address || station?.name || '';
  return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
}

function getMetricFromSnapshot(snapshot, regionCode, fuelCode, { allowNationalFallback = false } = {}) {
  const metrics = Array.isArray(snapshot?.metrics) ? snapshot.metrics : [];
  const exact = metrics.find((metric) => String(metric.regionCode) === String(regionCode) && String(metric.fuelCode) === String(fuelCode));
  if (exact) return exact;
  if (!allowNationalFallback) return null;
  return metrics.find((metric) => String(metric.regionCode) === 'ALL' && String(metric.fuelCode) === String(fuelCode)) ?? null;
}

function getDomesticSeries(historyPayload, regionCode, fuelCode, { allowNationalFallback = false } = {}) {
  const points = (historyPayload?.snapshots ?? [])
    .map((snapshot) => {
      const metric = getMetricFromSnapshot(snapshot, regionCode, fuelCode, { allowNationalFallback });
      const value = toNumber(metric?.averagePrice ?? metric?.lowestPrice);
      if (!snapshot?.capturedAt || value === null) return null;
      const date = getDateKey(snapshot.capturedAt);
      if (!date) return null;
      return { label: date, date, capturedAt: snapshot.capturedAt, value };
    })
    .filter(Boolean);
  return aggregateDailyPoints(points, { strategy: 'latest' }).slice(-45);
}

function getGlobalItem(payload, key) {
  return (payload?.items ?? []).find((item) => item.key === key || String(item.name ?? '').toLowerCase().includes(key));
}

function getGlobalSeries(payload, key) {
  const history = payload?.history?.[key];
  if (Array.isArray(history) && history.length) {
    const points = history
      .map((point) => {
        const date = getDateKey(point.date ?? point.capturedAt);
        const value = toNumber(point.price ?? point.value);
        return date && value !== null ? { label: date, date, capturedAt: point.capturedAt ?? point.date, value } : null;
      })
      .filter(Boolean);
    return aggregateDailyPoints(points, { strategy: 'latest' }).slice(-45);
  }
  const item = getGlobalItem(payload, key);
  const value = toNumber(item?.price);
  const date = getDateKey(item?.date);
  return date && value !== null ? [{ label: date, date, value }] : [];
}

function normalizePoints(points) {
  const chartPoints = aggregateDailyPoints(
    points
      .filter((point) => point?.label && toNumber(point.value) !== null)
      .map((point) => ({ ...point, date: getDateKey(point.date ?? point.label) || (point.date ?? point.label), value: toNumber(point.value) })),
    { strategy: 'latest' },
  ).slice(-45);
  const values = chartPoints.map((point) => point.value).filter(Number.isFinite);
  if (!values.length) return { chartPoints: [], min: 0, max: 1 };
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.18, rawMax * 0.012, 1);
  return { chartPoints, min: rawMin - pad, max: rawMax + pad };
}

function Shell({ children }) {
  return <main className="min-h-screen bg-[#f7f8fa] px-4 py-6 text-slate-900 md:px-8"><div className="mx-auto max-w-[1180px] space-y-5">{children}</div></main>;
}

function PageHeader({ updatedAt }) {
  return (
    <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="break-keep text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Liter Save</h1>
          <p className="mt-2 break-keep text-sm font-semibold leading-6 text-slate-600">주유소 가격과 국제유가 흐름을 함께 확인하는 유가 정보 사이트</p>
        </div>
        <p className="text-xs font-semibold text-slate-500 md:text-right">기준일 {formatDate(updatedAt)} · {formatTime(updatedAt)}</p>
      </div>
    </header>
  );
}

function FilterBar({ regionCode, fuelCode, setRegionCode, setFuelCode, regions, fuels }) {
  return (
    <section className="border border-slate-200 bg-white px-4 py-3 md:px-5">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">지역</span>
          <select className="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950" value={regionCode} onChange={(event) => setRegionCode(event.target.value)}>
            {regions.map((region) => <option key={region.value} value={region.value}>{region.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600">유종</span>
          <select className="h-10 w-full border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950" value={fuelCode} onChange={(event) => setFuelCode(event.target.value)}>
            {fuels.map((fuel) => <option key={fuel.value} value={fuel.value}>{fuel.label}</option>)}
          </select>
        </label>
        <p className="text-xs font-semibold leading-5 text-slate-500">공개 API 수집 데이터 기준</p>
      </div>
    </section>
  );
}

function InfoStrip({ items }) {
  return (
    <dl className="grid border border-slate-200 bg-white md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border-b border-slate-200 px-5 py-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
          <dt className="text-xs font-bold text-slate-500">{item.label}</dt>
          <dd className="mt-2 text-2xl font-black tracking-tight text-slate-950">{item.value}<span className="ml-1 text-xs font-semibold text-slate-500">{item.unit}</span></dd>
          <dd className="mt-1 break-keep text-xs font-semibold leading-5 text-slate-500">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="break-keep text-lg font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 break-keep text-xs font-semibold leading-5 text-slate-500">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyPanel({ title, description, value, meta }) {
  return (
    <div className="grid min-h-52 place-items-center border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-black text-slate-700">{title}</p>
        {value ? <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p> : null}
        {meta ? <p className="mt-1 text-xs font-semibold text-slate-500">{meta}</p> : null}
        <p className="mt-3 break-keep text-sm font-semibold leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}



function LineChart({ points, valueFormatter = formatNumber, stroke = '#0f766e', emptyTitle = '추이 데이터가 없습니다', title = '가격 추이', scope = '' }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const { chartPoints, min, max } = normalizePoints(points);
  const width = 960;
  const height = 400;
  const padding = { top: 30, right: 34, bottom: 52, left: 88 };

  if (!chartPoints.length) return <EmptyPanel title={emptyTitle} description="데이터 갱신 후 그래프가 표시됩니다." />;
  if (chartPoints.length === 1) return <EmptyPanel title="최근 수집값" value={valueFormatter(chartPoints[0].value)} meta={chartPoints[0].label} description="추이선은 2건 이상 수집된 뒤 표시합니다." />;

  const range = Math.max(max - min, 1);
  const getX = (index) => padding.left + ((width - padding.left - padding.right) * index) / Math.max(chartPoints.length - 1, 1);
  const getY = (value) => padding.top + (1 - ((value - min) / range)) * (height - padding.top - padding.bottom);
  const plotted = chartPoints.map((point, index) => ({ ...point, x: getX(index), y: getY(point.value) }));
  const path = plotted.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const baseline = height - padding.bottom;
  const areaPath = `${path} L ${plotted.at(-1).x.toFixed(2)} ${baseline} L ${plotted[0].x.toFixed(2)} ${baseline} Z`;
  const active = activeIndex !== null ? plotted[activeIndex] : plotted.at(-1);
  const values = plotted.map((point) => point.value);
  const low = Math.min(...values);
  const high = Math.max(...values);
  const yTicks = [0, 1, 2, 3, 4].map((tick) => min + ((max - min) * (4 - tick)) / 4);
  const xTicks = getTickIndexes(plotted.length, 5);

  function activate(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setActiveIndex(Math.round(ratio * (plotted.length - 1)));
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-base font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{scope ? `${scope} · ` : ''}{formatShortDate(plotted[0].label)} ~ {formatShortDate(plotted.at(-1).label)} · 일자별 {plotted.length}건</p>
        </div>
        <div className="grid grid-cols-3 border border-slate-200 bg-slate-50 text-right text-xs font-bold text-slate-500">
          <div className="border-r border-slate-200 px-3 py-2"><span className="block">선택 일자</span><strong className="mt-1 block text-sm text-slate-950">{formatShortDate(active.label)} · {valueFormatter(active.value)}</strong></div>
          <div className="border-r border-slate-200 px-3 py-2"><span className="block">최저</span><strong className="mt-1 block text-sm text-slate-950">{valueFormatter(low)}</strong></div>
          <div className="px-3 py-2"><span className="block">최고</span><strong className="mt-1 block text-sm text-slate-950">{valueFormatter(high)}</strong></div>
        </div>
      </div>
      <div className="border border-slate-200 bg-white p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[22rem] w-full bg-white" onMouseMove={activate} onMouseLeave={() => setActiveIndex(null)} onClick={activate} role="img" aria-label={`${title} 그래프`}>
          {yTicks.map((value, index) => {
            const y = padding.top + ((height - padding.top - padding.bottom) * index) / 4;
            return <g key={index}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e5e7eb" /><text x={padding.left - 14} y={y + 5} textAnchor="end" className="fill-slate-600 text-[12px] font-bold">{valueFormatter(value)}</text></g>;
          })}
          <line x1={padding.left} x2={padding.left} y1={padding.top} y2={baseline} stroke="#cbd5e1" />
          <line x1={padding.left} x2={width - padding.right} y1={baseline} y2={baseline} stroke="#cbd5e1" />
          <path d={areaPath} fill={stroke} opacity="0.08" />
          <path d={path} fill="none" stroke={stroke} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          {plotted.length <= 14 ? plotted.map((point) => <circle key={`${point.label}-${point.x}`} cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke={stroke} strokeWidth="2" />) : null}
          <line x1={active.x} x2={active.x} y1={padding.top} y2={baseline} stroke="#64748b" strokeDasharray="4 5" />
          <circle cx={active.x} cy={active.y} r="6.5" fill="#fff" stroke={stroke} strokeWidth="3" />
          {xTicks.map((index) => <text key={index} x={plotted[index].x} y={height - 14} textAnchor={index === 0 ? 'start' : index === plotted.length - 1 ? 'end' : 'middle'} className="fill-slate-600 text-[12px] font-bold">{formatShortDate(plotted[index].label)}</text>)}
        </svg>
      </div>
    </div>
  );
}



function HorizontalBars({ bars, valueFormatter = formatWon }) {
  const chartBars = bars.filter((bar) => bar?.label && toNumber(bar.value) !== null).slice(0, 10);
  if (!chartBars.length) return <EmptyPanel title="비교 데이터가 없습니다" description="데이터 갱신 후 비교 정보가 표시됩니다." />;
  if (chartBars.length === 1) return <EmptyPanel title="비교 대상 1건" value={valueFormatter(chartBars[0].value)} meta={chartBars[0].label} description="2건 이상 수집되면 비교 막대가 표시됩니다." />;
  const values = chartBars.map((bar) => toNumber(bar.value)).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(96px,140px)_1fr_minmax(90px,120px)] gap-3 border-b border-slate-200 pb-2 text-xs font-black text-slate-500">
        <span>지역</span><span>가격 범위</span><span className="text-right">현재가</span>
      </div>
      {chartBars.map((bar, index) => {
        const value = toNumber(bar.value) ?? 0;
        const ratio = (value - min) / range;
        const width = max === min ? 68 : Math.max(18, Math.min(100, 28 + ratio * 72));
        return (
          <div key={bar.label} className="grid grid-cols-[minmax(96px,140px)_1fr_minmax(90px,120px)] items-center gap-3 text-sm">
            <span className="min-w-0 truncate font-black text-slate-800">{index + 1}. {bar.label}</span>
            <span className="h-7 border border-slate-200 bg-slate-50 p-1"><span className="block h-full bg-slate-800" style={{ width: `${width}%` }} /></span>
            <span className="text-right font-black tabular-nums text-slate-950">{valueFormatter(value)}</span>
          </div>
        );
      })}
      <p className="text-xs font-semibold text-slate-500">막대 길이는 표시된 값의 최저~최고 범위를 기준으로 계산합니다.</p>
    </div>
  );
}

function StationTable({ stations, nationalAverage }) {
  return (
    <div className="overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-sm">
        <thead className="hidden bg-slate-100 text-left text-xs font-black text-slate-600 md:table-header-group">
          <tr><th className="px-4 py-3">주유소</th><th className="px-4 py-3">위치</th><th className="px-4 py-3 text-right">가격</th><th className="px-4 py-3 text-right">평균 대비</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {stations.length ? stations.slice(0, 10).map((station, index) => {
            const price = getStationPrice(station);
            const diff = price !== null && nationalAverage !== null ? price - nationalAverage : null;
            return (
              <tr key={`${station.id ?? station.name}-${index}`} className="block p-4 md:table-row md:p-0">
                <td className="block py-2 md:table-cell md:px-4 md:py-3">
                  <a href={`#/stations/${getStationRouteId(station, index)}`} className="font-black text-slate-950 underline-offset-4 hover:underline">{station.name ?? '-'}</a>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{station.brand ?? station.brandCode ?? '-'}</p>
                </td>
                <td className="flex justify-between py-2 font-semibold text-slate-600 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">위치</span>{joinText([station.roadAddress || station.address], '-')}</td>
                <td className="flex justify-between py-2 text-right font-black tabular-nums text-slate-950 md:table-cell md:px-4 md:py-3"><span className="font-bold text-slate-400 md:hidden">가격</span>{formatWon(price)}</td>
                <td className={`flex justify-between py-2 text-right font-black tabular-nums md:table-cell md:px-4 md:py-3 ${diff === null ? 'text-slate-400' : diff <= 0 ? 'text-emerald-700' : 'text-red-600'}`}><span className="font-bold text-slate-400 md:hidden">평균 대비</span>{diff === null ? '-' : formatSigned(diff, '원')}</td>
              </tr>
            );
          }) : <tr><td colSpan="4" className="px-4 py-10 text-center text-sm font-semibold text-slate-500">데이터 갱신 후 주유소 목록이 표시됩니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function SummaryList({ lines }) {
  return <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">{lines.map((line, index) => <li key={`${line}-${index}`} className="break-keep px-4 py-3 text-sm font-semibold leading-6 text-slate-700">{line}</li>)}</ul>;
}

function DetailGrid({ rows }) {
  return <dl className="grid border border-slate-200 bg-white md:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="border-b border-slate-200 px-4 py-3 md:border-r md:[&:nth-child(2n)]:border-r-0"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-keep text-sm font-semibold leading-6 text-slate-900">{value ?? '-'}</dd></div>)}</dl>;
}

function StationDetail({ station, index, nationalAverage, selectedRegionName, selectedFuelName, updatedAt }) {
  if (!station) {
    return <Shell><PageHeader updatedAt={updatedAt} /><Panel title="주유소 정보를 찾을 수 없습니다" description="홈에서 다시 선택해 주세요."><a href="#/" className="inline-flex border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">홈으로</a></Panel></Shell>;
  }
  const price = getStationPrice(station);
  const diff = price !== null && nationalAverage !== null ? Math.round(nationalAverage - price) : null;
  const saving40 = diff !== null ? Math.max(0, diff * 40) : null;
  return (
    <Shell>
      <PageHeader updatedAt={updatedAt} />
      <section className="border border-slate-200 bg-white px-5 py-5 md:px-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">주유소 상세</p>
            <h2 className="mt-1 break-keep text-3xl font-black tracking-tight text-slate-950">{station.name}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">{joinText([station.brand, selectedRegionName, selectedFuelName])}</p>
          </div>
          <a href="#/" className="inline-flex w-fit border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">목록으로</a>
        </div>
      </section>
      <InfoStrip items={[
        { label: '리터당 가격', value: formatWon(price), unit: '/ L', detail: '오피넷 수집 기준' },
        { label: '전국 평균 대비', value: diff === null ? '-' : `${diff >= 0 ? '-' : '+'}${Math.abs(diff).toLocaleString('ko-KR')}원`, unit: '', detail: '낮을수록 유리합니다' },
        { label: '40L 기준 예상 절약액', value: formatWon(saving40), unit: '', detail: `${index + 1}위 · 현재 필터 기준` },
      ]} />
      <Panel title="상세 정보" description="주소와 좌표는 지도 검색 참고용입니다.">
        <DetailGrid rows={[
          ['도로명 주소', station.roadAddress || '-'], ['지번 주소', station.address || '-'], ['주유소 ID', station.id || '-'], ['브랜드 코드', station.brandCode || '-'],
          ['위도', station.latitude ?? '-'], ['경도', station.longitude ?? '-'], ['KATEC X', station.katecX ?? '-'], ['KATEC Y', station.katecY ?? '-'],
          ['데이터 기준', formatDate(updatedAt)], ['업데이트 시간', formatTime(updatedAt)],
        ]} />
        <a href={buildMapSearchUrl(station)} target="_blank" rel="noreferrer" className="mt-4 inline-flex border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800">지도에서 검색</a>
      </Panel>
    </Shell>
  );
}

export default function App() {
  const route = useHashRoute();
  const [pricePayload, setPricePayload] = useState(null);
  const [historyPayload, setHistoryPayload] = useState(null);
  const [globalOilPayload, setGlobalOilPayload] = useState(null);
  const [reportPayload, setReportPayload] = useState(null);
  const [regionCode, setRegionCode] = useState(DEFAULT_REGION_CODE);
  const [fuelCode, setFuelCode] = useState(DEFAULT_FUEL_CODE);

  useEffect(() => {
    Promise.all([
      readJson(OIL_PRICE_URL, { datasets: [] }),
      readJson(OIL_HISTORY_URL, { snapshots: [] }),
      readJson(GLOBAL_OIL_URL, { items: [], history: {} }),
      readJson(OIL_REPORT_URL, { report: null }),
    ]).then(([prices, history, globalOil, report]) => {
      setPricePayload(prices);
      setHistoryPayload(history);
      setGlobalOilPayload(globalOil);
      setReportPayload(report);
    });
  }, []);

  const datasets = Array.isArray(pricePayload?.datasets) ? pricePayload.datasets : [];
  const fuels = uniqueBy(datasets, (dataset) => dataset.fuelCode).map((dataset) => ({ value: String(dataset.fuelCode), label: dataset.fuelName || dataset.fuelCode }));
  const regions = uniqueBy(datasets.filter((dataset) => String(dataset.regionCode) !== 'ALL'), (dataset) => dataset.regionCode).map((dataset) => ({ value: String(dataset.regionCode), label: dataset.regionName || dataset.regionCode }));
  const activeFuelCode = fuels.some((fuel) => fuel.value === fuelCode) ? fuelCode : fuels[0]?.value ?? DEFAULT_FUEL_CODE;
  const activeRegionCode = regions.some((region) => region.value === regionCode) ? regionCode : regions[0]?.value ?? DEFAULT_REGION_CODE;
  const activeDataset = datasets.find((dataset) => String(dataset.regionCode) === activeRegionCode && String(dataset.fuelCode) === activeFuelCode) ?? datasets.find((dataset) => String(dataset.fuelCode) === activeFuelCode) ?? null;
  const nationalDataset = datasets.find((dataset) => String(dataset.regionCode) === 'ALL' && String(dataset.fuelCode) === activeFuelCode) ?? null;
  const stations = Array.isArray(activeDataset?.stations) ? activeDataset.stations : [];
  const selectedRegionName = activeDataset?.regionName ?? regions.find((region) => region.value === activeRegionCode)?.label ?? '선택 지역';
  const selectedFuelName = activeDataset?.fuelName ?? fuels.find((fuel) => fuel.value === activeFuelCode)?.label ?? '유종';
  const prices = stations.map(getStationPrice).filter(Number.isFinite);
  const selectedLowest = prices.length ? Math.min(...prices) : null;
  const nationalAverage = toNumber(nationalDataset?.averagePrice) ?? average((nationalDataset?.stations ?? []).map(getStationPrice));
  const brentItem = getGlobalItem(globalOilPayload, 'brent');
  const brentSeries = getGlobalSeries(globalOilPayload, 'brent');
  const domesticSeries = getDomesticSeries(historyPayload, activeRegionCode, activeFuelCode);
  const nationalSeries = getDomesticSeries(historyPayload, 'ALL', activeFuelCode, { allowNationalFallback: true });
  const regionBars = datasets
    .filter((dataset) => String(dataset.regionCode) !== 'ALL' && String(dataset.fuelCode) === activeFuelCode)
    .map((dataset) => ({ label: dataset.regionName, value: toNumber(dataset.lowestPrice) ?? Math.min(...(dataset.stations ?? []).map(getStationPrice).filter(Number.isFinite)) }))
    .filter((bar) => Number.isFinite(bar.value))
    .sort((a, b) => a.value - b.value)
    .slice(0, 10);
  const summaryLines = [reportPayload?.report?.headline, reportPayload?.report?.daily, reportPayload?.report?.consumerTip].filter(Boolean);
  const fallbackSummary = [
    brentItem?.price ? `브렌트유는 ${formatUsd(brentItem.price)} 기준으로 확인됩니다.` : '국제유가 데이터가 생성되면 요약이 표시됩니다.',
    nationalAverage !== null ? `전국 평균가는 ${formatWon(nationalAverage)} / L 입니다.` : '전국 평균가 데이터가 생성되면 표시됩니다.',
    selectedLowest !== null ? `${selectedRegionName} 최저가는 ${formatWon(selectedLowest)} / L 입니다.` : '선택 지역 최저가 데이터가 생성되면 표시됩니다.',
  ];
  const stationDetail = route.page === 'stations' && route.detail ? findStationByRouteId(stations, route.detail) : null;
  if (route.page === 'stations' && route.detail) return <StationDetail station={stationDetail} index={stations.indexOf(stationDetail)} nationalAverage={nationalAverage} selectedRegionName={selectedRegionName} selectedFuelName={selectedFuelName} updatedAt={pricePayload?.generatedAt} />;

  return (
    <Shell>
      <PageHeader updatedAt={pricePayload?.generatedAt ?? globalOilPayload?.updatedAt} />
      <FilterBar regionCode={activeRegionCode} fuelCode={activeFuelCode} setRegionCode={setRegionCode} setFuelCode={setFuelCode} regions={regions.length ? regions : [{ value: DEFAULT_REGION_CODE, label: '서울' }]} fuels={fuels.length ? fuels : [{ value: DEFAULT_FUEL_CODE, label: '휘발유' }]} />
      <InfoStrip items={[
        { label: '브렌트유', value: formatUsd(brentItem?.price), unit: '/ bbl', detail: brentItem?.date ? `${brentItem.date} 기준` : '국제유가 참고 지표' },
        { label: '전국 평균가', value: formatWon(nationalAverage), unit: '/ L', detail: selectedFuelName },
        { label: `${selectedRegionName} 최저가`, value: formatWon(selectedLowest), unit: '/ L', detail: '선택 지역 기준' },
      ]} />
      <Panel title="주유소 가격 조회" description="가격이 낮은 순서로 표시합니다. 주유소명을 누르면 상세 정보를 볼 수 있습니다.">
        <StationTable stations={stations} nationalAverage={nationalAverage} />
      </Panel>
      <Panel title="날짜별 선택 가격 추이" description="현재 선택한 지역과 유종의 날짜별 평균가를 표시합니다.">
        <LineChart points={domesticSeries} valueFormatter={formatWon} emptyTitle="선택 가격 추이 데이터가 없습니다" title="선택 가격 추이" scope={`${selectedRegionName} · ${selectedFuelName}`} />
      </Panel>
      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="전국 평균가 추이" description="같은 유종의 전국 평균가를 날짜별로 확인합니다.">
          <LineChart points={nationalSeries} valueFormatter={formatWon} emptyTitle="전국 평균가 추이 데이터가 없습니다" title="전국 평균가 추이" scope={selectedFuelName} />
        </Panel>
        <Panel title="브렌트유 추이" description="국제유가 참고 지표를 날짜별로 확인합니다.">
          <LineChart points={brentSeries} valueFormatter={formatUsd} stroke="#1d4ed8" emptyTitle="브렌트유 추이 데이터가 없습니다" title="브렌트유 추이" scope="Brent" />
        </Panel>
      </section>
      <Panel title="지역별 최저가" description="같은 유종 기준으로 지역별 최저가를 비교합니다.">
        <HorizontalBars bars={regionBars} valueFormatter={formatWon} />
      </Panel>
      <Panel title="요약" description="수집된 데이터 기준의 짧은 정리입니다.">
        <SummaryList lines={summaryLines.length ? summaryLines : fallbackSummary} />
      </Panel>
      <footer className="border border-slate-200 bg-white px-5 py-4 text-center text-xs font-semibold text-slate-500">개인적 학습 목적으로 제작된 정적 데이터 사이트입니다.</footer>
    </Shell>
  );
}
