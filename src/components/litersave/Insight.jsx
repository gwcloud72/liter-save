import { formatNumber } from '../../lib/format.js';

function Metric({ label, value, unit, sub }) {
  return (
    <div className="px-3 py-2 md:px-7 md:py-0">
      <p className="text-[11px] font-bold text-slate-500 md:text-[13px]">{label}</p>
      <p className="mt-1.5 flex items-end gap-1 text-[20px] font-extrabold tracking-tight text-slate-950 md:mt-2 md:text-[28px]">
        <span>{value}</span>
        <span className="mb-1 text-[11px] font-bold text-slate-600 md:text-sm">{unit}</span>
      </p>
      <p className="mt-1 text-[11px] font-medium text-slate-500 md:mt-1.5 md:text-[12px]">{sub}</p>
    </div>
  );
}

export default function Insight({ regionName, fuelName, averagePrice, lowest, count }) {
  const hasStation = Boolean(lowest);
  const saving = hasStation ? averagePrice - lowest.price : 0;
  const savingLabel = hasStation ? formatNumber(Math.max(saving, 0)) : '-';
  const headline = hasStation ? `${regionName} 평균보다 ${savingLabel}원 낮은 주유소가 있습니다.` : '조회할 주유소 데이터가 없습니다.';
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:divide-x md:divide-slate-200">
        <div className="flex gap-3">
          <span className="mt-1 grid size-6 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600" aria-hidden="true">●</span>
          <div>
            <h1 className="text-[16px] font-extrabold leading-snug tracking-tight text-slate-950 md:text-[18px]">
              {hasStation ? <>{regionName} 평균보다 <span className="text-blue-600">{savingLabel}원 낮은</span> 주유소가 있습니다.</> : headline}
            </h1>
            <p className="mt-1.5 text-[12px] font-medium text-slate-500 md:mt-2 md:text-[13px]">
              {fuelName} 기준 저가 후보 {formatNumber(count)}곳
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 md:contents md:border-0">
          <Metric label={`${regionName} 평균가`} value={formatNumber(averagePrice)} unit="원/L" sub="선택 기준" />
          <Metric label="최저가" value={hasStation ? formatNumber(lowest?.price) : '-'} unit="원/L" sub={lowest?.name || '-'} />
          <Metric label="절감액" value={savingLabel} unit="원/L" sub="주유 시 절감" />
        </div>
      </div>
    </section>
  );
}
