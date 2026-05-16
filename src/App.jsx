import { useEffect, useMemo, useState } from 'react';

const BASE_URL = import.meta.env.BASE_URL;
const OIL_PRICE_URL = `${BASE_URL}data/oil-prices.json`;
const OIL_HISTORY_URL = `${BASE_URL}data/oil-history.json`;
const GLOBAL_OIL_URL = `${BASE_URL}data/global-oil.json`;
const OIL_REPORT_URL = `${BASE_URL}data/oil-ai-report.json`;

const DEFAULT_FUEL_CODE = 'B027';
const DEFAULT_REGION_CODE = '01';
const REGION_NAMES = {
  ALL: '전국',
  '01': '서울특별시',
  '02': '경기도',
  '03': '강원도',
  '04': '충청북도',
  '05': '충청남도',
  '06': '전라북도',
  '07': '전라남도',
  '08': '경상북도',
  '09': '경상남도',
  10: '부산광역시',
  11: '제주특별자치도',
  14: '대구광역시',
  15: '인천광역시',
  16: '광주광역시',
  17: '대전광역시',
  18: '울산광역시',
  19: '세종특별자치시',
};

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

function formatSigned(value, unit = '') {
  const number = toNumber(value);
  if (number === null) return '-';
  const sign = number > 0 ? '+' : '';
  return `${sign}${number.toLocaleString('ko-KR')}${unit}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date).replace(/\.$/, '');
}

function uniqueBy(items, getKey) {
  const map = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    if (key !== undefined && key !== null && key !== '') map.set(String(key), item);
  });
  return [...map.values()];
}

function getAverage(numbers) {
  const values = numbers.map(Number).filter(Number.isFinite);
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getStationPrice(station) {
  return toNumber(station?.price ?? station?.PRICE ?? station?.priceValue);
}

function getStationLocation(station) {
  const text = String(station?.roadAddress || station?.address || station?.city || '').trim();
  if (!text) return '-';
  const parts = text.split(/\s+/).filter(Boolean);
  return parts.slice(0, 3).join(' ');
}

function formatTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getMetricFromSnapshot(snapshot, regionCode, fuelCode) {
  const metrics = Array.isArray(snapshot?.metrics) ? snapshot.metrics : [];
  return metrics.find((metric) => String(metric.regionCode) === String(regionCode) && String(metric.fuelCode) === String(fuelCode))
    ?? metrics.find((metric) => String(metric.regionCode) === 'ALL' && String(metric.fuelCode) === String(fuelCode))
    ?? null;
}

function getDomesticSeries(historyPayload, regionCode, fuelCode) {
  const snapshots = Array.isArray(historyPayload?.snapshots) ? historyPayload.snapshots : [];
  return snapshots
    .map((snapshot) => {
      const metric = getMetricFromSnapshot(snapshot, regionCode, fuelCode);
      const value = toNumber(metric?.averagePrice ?? metric?.lowestPrice);
      if (!snapshot?.capturedAt || value === null) return null;
      return { date: snapshot.capturedAt.slice(0, 10), value };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(-45);
}

function getGlobalSeries(globalOilPayload, key) {
  const historySeries = globalOilPayload?.history?.[key];
  if (Array.isArray(historySeries) && historySeries.length) {
    return historySeries
      .map((point) => ({ date: point.date, value: toNumber(point.price ?? point.value) }))
      .filter((point) => point.date && point.value !== null)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(-45);
  }

  const item = (globalOilPayload?.items ?? []).find((entry) => entry.key === key || String(entry.name).toLowerCase().includes(key));
  return item?.date && toNumber(item.price) !== null ? [{ date: item.date, value: toNumber(item.price) }] : [];
}

function buildPriceReport({ brentItem, nationalAverage, selectedLowest, selectedRegionName }) {
  const report = [];
  if (brentItem?.price !== undefined) {
    const change = toNumber(brentItem.change);
    const direction = change === null ? '확인 중' : change > 0 ? '상승' : change < 0 ? '하락' : '보합';
    report.push(`브렌트유는 ${formatUsd(brentItem.price)}로 ${direction} 흐름입니다.`);
  }
  if (nationalAverage !== null) {
    report.push(`전국 평균가는 ${formatWon(nationalAverage)} / L 기준입니다.`);
  }
  if (selectedLowest !== null && nationalAverage !== null) {
    const diff = Math.round(nationalAverage - selectedLowest);
    report.push(`${selectedRegionName} 최저가는 전국 평균보다 ${Math.abs(diff).toLocaleString('ko-KR')}원 ${diff >= 0 ? '낮습니다' : '높습니다'}.`);
  }
  return report.length ? report : ['데이터 갱신 후 유가 요약이 표시됩니다.'];
}

function Icon({ type }) {
  const icons = {
    oil: 'M12 2C8 7 5 10.5 5 14a7 7 0 0 0 14 0c0-3.5-3-7-7-12Zm0 18a4 4 0 0 1-4-4c0-1.2.8-2.8 2.4-5.2-.2 3.4.6 5.5 3.7 7.1-.6.1-1 .1-1.1.1Z',
    pump: 'M5 3h9a2 2 0 0 1 2 2v16H4V5a2 2 0 0 1 2-2Zm1 2v6h8V5H6Zm12 3 2 2v8a2 2 0 0 0 4 0v-6.6l-3-3V6h-2v2Z',
    tag: 'M11 3h8a2 2 0 0 1 2 2v8L12 22 3 13V5a2 2 0 0 1 2-2h6Zm-3 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    chart: 'M4 18h16v2H4v-2Zm2-3 4-4 3 3 6-7 1.5 1.3-7.5 8.7-3-3-3.5 3.5L6 15Z',
    location: 'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z',
    calendar: 'M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v16H2V6a2 2 0 0 1 2-2h3V2Zm15 8H4v10h18V10Z',
    refresh: 'M12 4a8 8 0 0 1 7.5 5.3l-1.9.7A6 6 0 0 0 6 12H3l4 4 4-4H8a4 4 0 0 1 7.8-1.3l1.9-.7A6 6 0 0 0 6.4 9.6L4.7 8A8 8 0 0 1 12 4Zm5 4 4 4h-3a8 8 0 0 1-15.5 2.7l1.9-.7A6 6 0 0 0 18 12h-3l4-4Z',
  };
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={icons[type] ?? icons.chart} />
    </svg>
  );
}

function SelectField({ label, value, onChange, options, icon }) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 md:border-r md:border-slate-200 last:border-r-0">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-500">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 block text-xs font-extrabold text-slate-500">{label}</span>
        <select
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </span>
    </label>
  );
}

function InfoField({ label, value, icon }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-500">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 block text-xs font-extrabold text-slate-500">{label}</span>
        <span className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800">{value}</span>
      </span>
    </div>
  );
}

function MetricCard({ icon, title, value, unit, accent = 'green', sparkline, detail }) {
  const accentClass = accent === 'blue' ? 'text-blue-700 bg-blue-100' : 'text-emerald-700 bg-emerald-100';
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex min-h-24 items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${accentClass}`}><Icon type={icon} /></div>
          <div className="min-w-0">
            <p className="break-keep text-sm font-extrabold text-slate-700">{title}</p>
            <p className="mt-1 flex items-end gap-2 text-4xl font-black tabular-nums tracking-tight text-slate-900">
              {value}
              {unit ? <span className="mb-1 text-sm font-bold text-slate-500">{unit}</span> : null}
            </p>
            {detail ? <p className="mt-2 text-xs font-bold text-slate-500">{detail}</p> : null}
          </div>
        </div>
        {sparkline ? <MiniSparkline points={sparkline} /> : null}
      </div>
    </article>
  );
}

function MiniSparkline({ points }) {
  const values = points.map((point) => toNumber(point.value)).filter(Number.isFinite);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const d = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 96;
    const y = 44 - ((value - min) / range) * 34;
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
  return (
    <svg className="hidden h-12 w-28 md:block" viewBox="0 0 96 48" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-emerald-600" />
    </svg>
  );
}

function normalizeSeries(points) {
  const sortedPoints = [...points].filter((point) => point?.date && toNumber(point.value) !== null).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-45);
  const values = sortedPoints.map((point) => toNumber(point.value)).filter(Number.isFinite);
  if (!values.length) return { points: [], min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.12, 1);
  return { points: sortedPoints, min: min - padding, max: max + padding };
}

function InteractiveLineChart({ title, unit, series, valueFormatter = formatNumber, colorClass = 'text-emerald-600' }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const normalized = normalizeSeries(series);
  const chartWidth = 620;
  const chartHeight = 220;
  const plot = { left: 44, right: 18, top: 24, bottom: 34 };
  const innerWidth = chartWidth - plot.left - plot.right;
  const innerHeight = chartHeight - plot.top - plot.bottom;
  const range = normalized.max - normalized.min || 1;
  const points = normalized.points.map((point, index) => {
    const x = plot.left + (index / Math.max(normalized.points.length - 1, 1)) * innerWidth;
    const y = plot.top + (1 - ((toNumber(point.value) ?? normalized.min) - normalized.min) / range) * innerHeight;
    return { ...point, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const active = activeIndex !== null ? points[activeIndex] : points.at(-1);

  function activateFromEvent(event) {
    if (!points.length) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const index = Math.round(ratio * (points.length - 1));
    setActiveIndex(index);
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <p className="text-xs font-semibold text-slate-500">{unit}</p>
        </div>
        {active ? (
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-right text-xs font-semibold text-white shadow-lg">
            <div>{formatDate(active.date)}</div>
            <div className="text-sm">{valueFormatter(active.value)}</div>
          </div>
        ) : null}
      </div>
      {points.length ? (
        <svg
          className="h-56 w-full overflow-visible"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`${title} 그래프`}
          onMouseMove={activateFromEvent}
          onMouseLeave={() => setActiveIndex(null)}
          onClick={activateFromEvent}
        >
          {[0, 1, 2, 3].map((tick) => {
            const y = plot.top + (tick / 3) * innerHeight;
            const value = normalized.max - (tick / 3) * range;
            return (
              <g key={tick}>
                <line x1={plot.left} x2={chartWidth - plot.right} y1={y} y2={y} className="stroke-slate-200" strokeDasharray="4 6" />
                <text x="4" y={y + 4} className="fill-slate-500 text-[11px] font-semibold">{valueFormatter(value)}</text>
              </g>
            );
          })}
          <path d={path} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={colorClass} />
          {points.map((point, index) => (
            <circle
              key={`${point.date}-${index}`}
              cx={point.x}
              cy={point.y}
              r={activeIndex === index ? 6 : 4}
              className={`${colorClass} fill-white stroke-current`}
              strokeWidth="3"
            />
          ))}
          {active ? (
            <g>
              <line x1={active.x} x2={active.x} y1={plot.top} y2={chartHeight - plot.bottom} className="stroke-slate-300" strokeDasharray="4 4" />
              <circle cx={active.x} cy={active.y} r="7" className="fill-white stroke-emerald-600" strokeWidth="3" />
            </g>
          ) : null}
          {points.length > 1 ? (
            <>
              <text x={plot.left} y={chartHeight - 8} className="fill-slate-500 text-[11px] font-semibold">{formatDate(points[0].date)}</text>
              <text x={chartWidth - plot.right - 70} y={chartHeight - 8} className="fill-slate-500 text-[11px] font-semibold">{formatDate(points.at(-1).date)}</text>
            </>
          ) : null}
        </svg>
      ) : (
        <div className="grid h-56 place-items-center rounded-xl bg-slate-50 text-sm font-semibold text-slate-500">데이터 갱신 후 표시됩니다.</div>
      )}
    </article>
  );
}

function BarChart({ id, title, unit, rows, valueFormatter = formatNumber }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const values = rows.map((row) => toNumber(row.value)).filter(Number.isFinite);
  const max = Math.max(...values, 1);
  return (
    <article id={id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          <p className="text-xs font-semibold text-slate-500">{unit}</p>
        </div>
        {(activeIndex !== null ? rows[activeIndex] : rows[0]) ? (
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-right text-xs font-semibold text-white">
            <div>{(activeIndex !== null ? rows[activeIndex] : rows[0]).label}</div>
            <div className="text-sm">{valueFormatter((activeIndex !== null ? rows[activeIndex] : rows[0]).value)}</div>
          </div>
        ) : null}
      </div>
      <div className="flex h-56 items-end gap-3 border-b border-slate-200 px-2 pb-2">
        {rows.length ? rows.map((row, index) => {
          const value = toNumber(row.value) ?? 0;
          const height = Math.max(12, (value / max) * 170);
          return (
            <button
              type="button"
              key={row.label}
              className="group flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
            >
              <span className="text-xs font-extrabold text-slate-700">{valueFormatter(value).replace('원', '')}</span>
              <span
                className={`w-full rounded-t-xl ${index === 0 ? 'bg-emerald-700' : 'bg-blue-500'} transition group-hover:opacity-80`}
                style={{ height, opacity: activeIndex === null ? (index === 0 ? 1 : 0.62) : (activeIndex === index ? 1 : 0.62) }}
              />
              <span className="truncate text-xs font-semibold text-slate-600">{row.label}</span>
            </button>
          );
        }) : <div className="grid h-full w-full place-items-center text-sm font-semibold text-slate-500">데이터 갱신 후 표시됩니다.</div>}
      </div>
    </article>
  );
}


function normalizeLine(points) {
  const cleaned = points.filter((point) => point?.date && toNumber(point.value) !== null).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(-30);
  const values = cleaned.map((point) => toNumber(point.value));
  if (!values.length) return { points: [], min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.12, 1);
  return { points: cleaned, min: min - padding, max: max + padding };
}

function CombinedOilChart({ brentSeries, domesticSeries, nationalAverage, globalItems }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const brent = normalizeLine(brentSeries);
  const domestic = normalizeLine(domesticSeries);
  const width = 620;
  const height = 230;
  const plot = { left: 42, right: 30, top: 26, bottom: 34 };
  const innerWidth = width - plot.left - plot.right;
  const innerHeight = height - plot.top - plot.bottom;
  const maxLength = Math.max(brent.points.length, domestic.points.length);

  function buildPath(line) {
    const range = line.max - line.min || 1;
    return line.points.map((point, index) => {
      const x = plot.left + (index / Math.max(line.points.length - 1, 1)) * innerWidth;
      const y = plot.top + (1 - ((toNumber(point.value) - line.min) / range)) * innerHeight;
      return { ...point, x, y };
    });
  }

  const brentPoints = buildPath(brent);
  const domesticPoints = buildPath(domestic);
  const brentPath = brentPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const domesticPath = domesticPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const activeBrent = brentPoints[activeIndex ?? brentPoints.length - 1];
  const activeDomestic = domesticPoints[activeIndex ?? domesticPoints.length - 1];
  const indicators = [
    ...globalItems.filter((item) => ['wti', 'dubai'].some((key) => String(item.key || item.name).toLowerCase().includes(key))).slice(0, 2).map((item) => ({ label: item.name || item.key, value: formatUsd(item.price) })),
    { label: '전국 평균가', value: `${formatNumber(nationalAverage)} 원/L` },
  ].filter((row) => row.value && row.value !== '-');

  function activateFromEvent(event) {
    if (!maxLength) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setActiveIndex(Math.round(ratio * (maxLength - 1)));
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-lg font-black text-slate-900">국제유가 / 국내 평균가 추이</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
            <span><span className="mr-1 inline-block h-2 w-4 rounded-full bg-emerald-600" />브렌트유</span>
            <span><span className="mr-1 inline-block h-2 w-4 rounded-full bg-blue-600" />전국 평균가</span>
          </div>
        </div>
        {(activeBrent || activeDomestic) ? (
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-right text-xs font-bold leading-5 text-white">
            <div>{formatDate(activeBrent?.date || activeDomestic?.date)}</div>
            {activeBrent ? <div>브렌트유 {formatUsd(activeBrent.value)}</div> : null}
            {activeDomestic ? <div>전국 {formatWon(activeDomestic.value)}</div> : null}
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_180px]">
        {maxLength ? (
          <svg className="h-56 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="국제유가와 국내 평균가 추이" onMouseMove={activateFromEvent} onMouseLeave={() => setActiveIndex(null)} onClick={activateFromEvent}>
            {[0, 1, 2, 3].map((tick) => {
              const y = plot.top + (tick / 3) * innerHeight;
              return <line key={tick} x1={plot.left} x2={width - plot.right} y1={y} y2={y} className="stroke-slate-200" strokeDasharray="4 6" />;
            })}
            {brentPath ? <path d={brentPath} fill="none" stroke="#15803d" strokeWidth="3" strokeLinecap="round" /> : null}
            {domesticPath ? <path d={domesticPath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" /> : null}
            {brentPoints.map((point, index) => <circle key={`b-${point.date}-${index}`} cx={point.x} cy={point.y} r={activeIndex === index ? 5 : 3} fill="#fff" stroke="#15803d" strokeWidth="2" />)}
            {domesticPoints.map((point, index) => <circle key={`d-${point.date}-${index}`} cx={point.x} cy={point.y} r={activeIndex === index ? 5 : 3} fill="#fff" stroke="#2563eb" strokeWidth="2" />)}
            {activeBrent ? <line x1={activeBrent.x} x2={activeBrent.x} y1={plot.top} y2={height - plot.bottom} className="stroke-slate-300" strokeDasharray="4 4" /> : null}
            {brentPoints[0] ? <text x={plot.left} y={height - 8} className="fill-slate-500 text-[11px] font-bold">{formatDate(brentPoints[0].date)}</text> : null}
            {brentPoints.at(-1) ? <text x={width - plot.right - 70} y={height - 8} className="fill-slate-500 text-[11px] font-bold">{formatDate(brentPoints.at(-1).date)}</text> : null}
          </svg>
        ) : <div className="grid h-56 place-items-center rounded-xl bg-slate-50 text-sm font-bold text-slate-500">데이터 갱신 후 표시됩니다.</div>}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h3 className="mb-2 text-sm font-black text-slate-800">주요 지표</h3>
          <dl className="space-y-2 text-xs font-bold text-slate-600">
            {indicators.length ? indicators.map((row) => (
              <div key={row.label} className="flex justify-between gap-3 border-b border-slate-200 pb-2 last:border-0">
                <dt className="truncate">{row.label}</dt><dd className="shrink-0 text-blue-700">{row.value}</dd>
              </div>
            )) : <p className="py-8 text-center text-slate-500">데이터 갱신 후 표시됩니다.</p>}
          </dl>
        </div>
      </div>
    </article>
  );
}

function PriceTable({ stations, nationalAverage, updatedAt }) {
  const tableClass = 'w-full border-separate border-spacing-y-3 text-sm md:border-collapse md:border-spacing-y-0';
  const rowClass = 'block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:table-row md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none';
  const cellClass = 'flex items-start justify-between gap-4 border-b border-slate-100 px-1 py-2 text-right font-semibold text-slate-600 last:border-b-0 md:table-cell md:px-3 md:py-3 md:text-left';
  const mobileLabelClass = 'shrink-0 font-extrabold text-slate-500 md:hidden';
  const updateTime = formatTime(updatedAt);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-extrabold text-slate-900">선택 지역 최저가 주유소</h2>
      <div className="overflow-x-auto">
        <table className={tableClass}>
          <thead className="hidden md:table-header-group">
            <tr className="border-y border-slate-200 bg-slate-50 text-slate-600">
              <th className="px-3 py-3 text-left font-extrabold">순위</th>
              <th className="px-3 py-3 text-left font-extrabold">주유소명</th>
              <th className="px-3 py-3 text-left font-extrabold">위치</th>
              <th className="px-3 py-3 text-right font-extrabold">가격(원/L)</th>
              <th className="px-3 py-3 text-right font-extrabold">절약금액(원/L)</th>
              <th className="px-3 py-3 text-right font-extrabold">업데이트</th>
            </tr>
          </thead>
          <tbody className="md:divide-y md:divide-slate-100">
            {stations.length ? stations.map((station, index) => {
              const price = getStationPrice(station);
              const saving = price !== null && nationalAverage !== null ? Math.max(0, Math.round(nationalAverage - price)) : null;
              return (
                <tr key={`${station.id ?? station.name}-${index}`} className={rowClass}>
                  <td className={cellClass}><span className={mobileLabelClass}>순위</span><span>{index + 1}</span></td>
                  <td className={`${cellClass} md:text-left`}><span className={mobileLabelClass}>주유소명</span><span className="font-bold text-slate-900">{station.name ?? '-'}</span></td>
                  <td className={cellClass}><span className={mobileLabelClass}>위치</span><span>{getStationLocation(station)}</span></td>
                  <td className={`${cellClass} md:text-right`}><span className={mobileLabelClass}>가격</span><span className="font-extrabold tabular-nums text-emerald-700">{formatNumber(price)}</span></td>
                  <td className={`${cellClass} md:text-right`}><span className={mobileLabelClass}>절약금액</span><span>{saving === null ? '-' : formatNumber(saving)}</span></td>
                  <td className={`${cellClass} md:text-right`}><span className={mobileLabelClass}>업데이트</span><span>{updateTime}</span></td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="6" className="block rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-10 text-center font-semibold text-slate-500 md:table-cell md:border-0 md:bg-transparent">
                  데이터 갱신 후 표시됩니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-400">※ 선택 지역 기준 최저가 순</p>
    </article>
  );
}

function App() {
  const [pricePayload, setPricePayload] = useState(null);
  const [historyPayload, setHistoryPayload] = useState(null);
  const [globalOilPayload, setGlobalOilPayload] = useState(null);
  const [reportPayload, setReportPayload] = useState(null);
  const [selectedRegionCode, setSelectedRegionCode] = useState(DEFAULT_REGION_CODE);
  const [selectedFuelCode, setSelectedFuelCode] = useState(DEFAULT_FUEL_CODE);

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
  const fuelOptions = useMemo(() => {
    const options = uniqueBy(datasets, (dataset) => dataset.fuelCode)
      .map((dataset) => ({ value: String(dataset.fuelCode), label: dataset.fuelName || String(dataset.fuelCode) }));
    return options.length ? options : [{ value: 'B027', label: '휘발유' }, { value: 'D047', label: '경유' }];
  }, [datasets]);
  const regionOptions = useMemo(() => {
    const options = uniqueBy(datasets, (dataset) => dataset.regionCode)
      .map((dataset) => ({ value: String(dataset.regionCode), label: REGION_NAMES[String(dataset.regionCode)] || dataset.regionName || String(dataset.regionCode) }));
    return options.length ? options : [{ value: 'ALL', label: '전국' }, { value: '01', label: '서울특별시' }];
  }, [datasets]);

  const activeFuelCode = fuelOptions.some((option) => option.value === selectedFuelCode) ? selectedFuelCode : fuelOptions[0].value;
  const activeRegionCode = regionOptions.some((option) => option.value === selectedRegionCode) ? selectedRegionCode : regionOptions[0].value;
  const selectedDataset = datasets.find((dataset) => String(dataset.regionCode) === activeRegionCode && String(dataset.fuelCode) === activeFuelCode)
    ?? datasets.find((dataset) => String(dataset.regionCode) === 'ALL' && String(dataset.fuelCode) === activeFuelCode)
    ?? null;
  const nationalDataset = datasets.find((dataset) => String(dataset.regionCode) === 'ALL' && String(dataset.fuelCode) === activeFuelCode) ?? selectedDataset;
  const selectedRegionName = regionOptions.find((option) => option.value === activeRegionCode)?.label ?? '선택 지역';
  const stations = Array.isArray(selectedDataset?.stations)
    ? [...selectedDataset.stations].sort((a, b) => (getStationPrice(a) ?? Infinity) - (getStationPrice(b) ?? Infinity)).slice(0, 5)
    : [];
  const selectedLowest = toNumber(selectedDataset?.lowestPrice) ?? toNumber(stations[0]?.price);
  const nationalAverage = toNumber(nationalDataset?.averagePrice) ?? getAverage((nationalDataset?.stations ?? []).map(getStationPrice));
  const globalItems = Array.isArray(globalOilPayload?.items) ? globalOilPayload.items : [];
  const brentItem = globalItems.find((item) => String(item.name).toLowerCase().includes('brent')) ?? null;
  const brentSeries = getGlobalSeries(globalOilPayload, 'brent');
  const domesticSeries = getDomesticSeries(historyPayload, activeRegionCode, activeFuelCode);
  const regionRows = regionOptions
    .filter((option) => option.value !== 'ALL')
    .map((option) => {
      const dataset = datasets.find((entry) => String(entry.regionCode) === option.value && String(entry.fuelCode) === activeFuelCode);
      const lowest = toNumber(dataset?.lowestPrice) ?? getStationPrice(dataset?.stations?.[0]);
      return { label: option.label.replace(/특별시|광역시|특별자치도|특별자치시|도/g, ''), value: lowest };
    })
    .filter((row) => row.value !== null)
    .slice(0, 8);
  const reportLines = reportPayload?.report?.headline
    ? [reportPayload.report.headline, reportPayload.report.daily, reportPayload.report.weekly].filter(Boolean)
    : buildPriceReport({ brentItem, nationalAverage, selectedLowest, selectedRegionName });
  const updatedAt = pricePayload?.generatedAt || globalOilPayload?.updatedAt || '';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-6 md:px-8 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center text-emerald-700"><Icon type="oil" /></div>
            <div>
              <h1 className="break-keep text-4xl font-black tracking-tight text-emerald-800">Liter Save</h1>
              <p className="mt-1 text-base font-bold text-slate-500">주유소 가격과 국제유가 정보</p>
            </div>
          </div>
          <nav className="flex max-w-full gap-5 overflow-x-auto whitespace-nowrap text-sm font-black text-slate-700 md:gap-9">
            <a className="border-b-4 border-emerald-700 pb-3 text-emerald-700" href="#top">홈</a>
            <a className="pb-3 hover:text-emerald-700" href="#global">국제 유가</a>
            <a className="pb-3 hover:text-emerald-700" href="#region">지역별 비교</a>
            <a className="pb-3 hover:text-emerald-700" href="#table">주유소 찾기</a>
            <a className="pb-3 hover:text-emerald-700" href="#trend">가격 추이</a>
          </nav>
        </div>
      </header>

      <div id="top" className="mx-auto max-w-[1440px] space-y-5 px-5 py-5 md:px-8">
        <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-4">
          <SelectField label="지역" value={activeRegionCode} onChange={setSelectedRegionCode} options={regionOptions} icon={<Icon type="location" />} />
          <SelectField label="유종" value={activeFuelCode} onChange={setSelectedFuelCode} options={fuelOptions} icon={<Icon type="pump" />} />
          <InfoField label="기준일" value={formatDate(updatedAt)} icon={<Icon type="calendar" />} />
          <InfoField label="데이터 업데이트" value={updatedAt ? `${formatTime(updatedAt)} 기준` : '갱신 후 표시'} icon={<Icon type="refresh" />} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard icon="oil" title="브렌트유 (USD/배럴)" value={formatUsd(brentItem?.price)} unit="" detail={toNumber(brentItem?.change) === null ? '전일 대비 확인 중' : `전일 대비 ${formatSigned(brentItem.change)}`} sparkline={brentSeries} />
          <MetricCard icon="pump" title="전국 평균가 (원/L)" value={formatNumber(nationalAverage)} unit="" accent="blue" detail="오피넷 전국 평균 기준" sparkline={domesticSeries} />
          <MetricCard icon="tag" title="선택 지역 최저가 (원/L)" value={formatNumber(selectedLowest)} unit="" detail={selectedRegionName} sparkline={domesticSeries} />
        </section>

        <section id="table" className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <PriceTable stations={stations} nationalAverage={nationalAverage} updatedAt={updatedAt} />
          <div id="global"><CombinedOilChart brentSeries={brentSeries} domesticSeries={domesticSeries} nationalAverage={nationalAverage} globalItems={globalItems} /></div>
        </section>

        <section id="trend" className="grid gap-5 lg:grid-cols-2">
          <InteractiveLineChart title="브렌트유 추이" unit="USD/배럴" series={brentSeries} valueFormatter={formatUsd} />
          <BarChart id="region" title="지역별 최저가 비교" unit="휘발유, 원/L" rows={regionRows} valueFormatter={formatWon} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-5 md:flex-row md:items-center">
              <div className="flex items-center gap-4 md:w-64">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon type="chart" /></div>
                <h2 className="break-keep text-xl font-black text-emerald-800">오늘의 유가 요약</h2>
              </div>
              <ul className="space-y-2 text-sm font-semibold leading-7 text-slate-700">
                {reportLines.map((line, index) => <li key={`${line}-${index}`} className="before:mr-2 before:text-emerald-700 before:content-['•']">{line}</li>)}
              </ul>
            </div>
            <div className="hidden h-20 w-20 place-items-center rounded-2xl bg-slate-100 text-slate-300 md:grid"><Icon type="pump" /></div>
          </div>
        </section>
      </div>

      <footer className="px-6 pb-8 pt-2 text-center text-sm font-semibold text-slate-500">
        개인적 학습 목적으로 제작된 정적 데이터 사이트
      </footer>
    </main>
  );
}

export default App;
