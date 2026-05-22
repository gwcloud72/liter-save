import { useEffect, useState } from 'react';
import { formatNumber } from '../../lib/format.js';
import { average } from '../../lib/dashboardData.js';

function EmptyTrend({ regionName, fuelName, onReset }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold tracking-tight text-slate-950 md:text-xl">
          유가 그래프 <span className="text-[12px] font-bold text-slate-500 md:text-sm">({regionName} · {fuelName})</span>
        </h2>
        <span className="h-9 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">7일</span>
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center text-sm font-bold text-slate-500">
        <svg viewBox="0 0 320 120" className="mx-auto mb-4 h-28 w-full max-w-[320px] text-blue-200" aria-hidden="true">
          <line x1="24" y1="26" x2="300" y2="26" stroke="currentColor" opacity="0.35" />
          <line x1="24" y1="60" x2="300" y2="60" stroke="currentColor" opacity="0.35" />
          <line x1="24" y1="94" x2="300" y2="94" stroke="currentColor" opacity="0.35" />
          <polyline points="26,74 72,62 118,66 164,48 210,54 254,38 296,44" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="254" cy="38" r="8" fill="white" stroke="currentColor" strokeWidth="5" />
        </svg>
        <p>유가 그래프 데이터 수집 대기 중입니다.</p>
        {onReset && <button type="button" onClick={onReset} aria-label="유가 그래프 조건 초기화" className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-blue-900/10 transition hover:bg-blue-700">조건 초기화</button>}
      </div>
    </section>
  );
}

export default function TrendCard({ values, labels, regionName, fuelName, compact = false, featured = false, onReset }) {
  const hasData = values.length > 0;
  const [activeIndex, setActiveIndex] = useState(() => Math.max(values.length - 1, 0));

  useEffect(() => {
    setActiveIndex(Math.max(values.length - 1, 0));
  }, [values.length, regionName, fuelName]);

  if (!hasData) return <EmptyTrend regionName={regionName} fuelName={fuelName} onReset={onReset} />;

  const safeLabels = labels.length ? labels : values.map((_, index) => `지점 ${index + 1}`);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const averageValue = average(values);
  const chartTop = 42;
  const chartBottom = 172;
  const chartHeight = chartBottom - chartTop;
  const yFor = (value) => Math.round(chartBottom - ((value - min) / range) * chartHeight);
  const pointData = values.map((value, index) => {
    const step = values.length > 1 ? 360 / (values.length - 1) : 0;
    const x = Math.round(66 + index * step);
    return { value, label: safeLabels[index] || `지점 ${index + 1}`, x, y: yFor(value) };
  });
  const selected = pointData[Math.min(activeIndex, pointData.length - 1)] || pointData.at(-1);
  const points = pointData.map((point) => `${point.x},${point.y}`).join(' ');
  const averageY = yFor(averageValue);
  const tooltipX = selected.x > 320 ? selected.x - 126 : selected.x + 12;
  const tooltipY = selected.y > 74 ? selected.y - 58 : selected.y + 18;
  const selectedText = `${selected.label} · ${formatNumber(selected.value)}원/L`;
  const axisIndexes = new Set([0, Math.floor((safeLabels.length - 1) / 2), safeLabels.length - 1]);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold tracking-tight text-slate-950 md:text-xl">
          유가 그래프 <span className="text-[12px] font-bold text-slate-500 md:text-sm">({regionName} · {fuelName})</span>
        </h2>
        <span className="h-9 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">7일</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-slate-50 px-3 py-2 text-center text-[11px] font-extrabold text-slate-500">
        <span>현재 <strong className="ml-1 text-blue-700">{formatNumber(values.at(-1))}</strong></span>
        <span>평균 <strong className="ml-1 text-slate-700">{formatNumber(averageValue)}</strong></span>
        <span>최저 <strong className="ml-1 text-slate-700">{formatNumber(min)}</strong></span>
        <span>최고 <strong className="ml-1 text-slate-700">{formatNumber(max)}</strong></span>
      </div>
      <svg viewBox="0 0 470 244" role="img" aria-label={`가격 그래프: ${selectedText}`} className={`mt-3 w-full md:mt-4 ${featured ? 'h-[230px] md:h-[252px]' : compact ? 'h-[190px] md:h-[198px]' : 'h-[212px] md:h-[228px]'}`} onMouseLeave={() => setActiveIndex(Math.max(pointData.length - 1, 0))}>
        <text x="8" y={chartTop + 4} fontSize="11" fill="#64748b" fontWeight="800">{formatNumber(max)}</text>
        <text x="8" y={averageY + 4} fontSize="11" fill="#2563eb" fontWeight="800">평균</text>
        <text x="8" y={chartBottom + 4} fontSize="11" fill="#64748b" fontWeight="800">{formatNumber(min)}</text>
        <line x1="58" y1={chartTop} x2="438" y2={chartTop} stroke="#d1d5db" />
        <line x1="58" y1="96" x2="438" y2="96" stroke="#e5e7eb" />
        <line x1="58" y1={averageY} x2="438" y2={averageY} stroke="#93c5fd" strokeDasharray="6 6" />
        <text x="356" y={Math.max(averageY - 8, 24)} fontSize="11" fill="#2563eb" fontWeight="900">평균 {formatNumber(averageValue)}</text>
        <line x1="58" y1={chartBottom} x2="438" y2={chartBottom} stroke="#d1d5db" />
        <polyline fill="none" stroke="#2563eb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" points={points} />
        <line x1={selected.x} y1={chartTop} x2={selected.x} y2={chartBottom} stroke="#1d4ed8" strokeDasharray="4 6" opacity="0.24" />
        {pointData.map((point, index) => (
          <circle
            key={`${point.value}-${index}`}
            cx={point.x}
            cy={point.y}
            r={index === activeIndex ? '6' : '5'}
            fill="#2563eb"
            stroke="white"
            strokeWidth="3"
            tabIndex="0"
            className="cursor-pointer outline-none"
            aria-label={`${point.label} ${formatNumber(point.value)}원/L`}
            onFocus={() => setActiveIndex(index)}
            onBlur={() => setActiveIndex(Math.max(pointData.length - 1, 0))}
            onMouseEnter={() => setActiveIndex(index)}
          />
        ))}
        <g transform={`translate(${tooltipX} ${tooltipY})`} aria-hidden="true">
          <rect width="120" height="46" rx="13" fill="#0f172a" opacity="0.94" />
          <text x="12" y="18" fontSize="11" fill="#bfdbfe" fontWeight="800">{selected.label}</text>
          <text x="12" y="35" fontSize="14" fill="#ffffff" fontWeight="900">{formatNumber(selected.value)}원/L</text>
        </g>
        <rect x="372" y="52" width="74" height="28" rx="14" fill="#eff6ff" stroke="#bfdbfe" />
        <text x="384" y="71" fontSize="12" fill="#1d4ed8" fontWeight="900">현재 {formatNumber(values.at(-1))}</text>
        {safeLabels.map((label, index) => axisIndexes.has(index) ? (
          <text key={`${label}-${index}`} x={58 + index * (360 / Math.max(safeLabels.length - 1, 1))} y="214" fontSize="12" fill="#64748b" fontWeight="700">{label}</text>
        ) : null)}
      </svg>
      <p className="sr-only" aria-live="polite">선택 지점 {selectedText}</p>
    </section>
  );
}
