import { useState } from 'react';
import { SORT_OPTIONS } from '../../lib/dashboardData.js';
import { formatNumber } from '../../lib/format.js';

const resetButton = 'rounded-xl border border-slate-300 bg-white font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45';
const control = 'h-10 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100';
const mobileControl = 'h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100';
const mobileAction = 'h-11 shrink-0 rounded-xl px-3 text-[13px] font-extrabold transition';
function Field({ label, children }) { return <label className="grid gap-1.5 text-[12px] font-semibold text-slate-600 md:text-[12px]">{label}{children}</label>; }

export default function SearchToolbar({ filters, setFilter, reset, canReset, regions, fuels, resultCount, dataSourceLabel }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const detailId = 'liter-mobile-bottom-sheet';
  const regionName = regions.find((region) => region.code === filters.regionCode)?.name;
  const fuelName = fuels.find((fuel) => fuel.code === filters.fuelCode)?.name;
  return (
    <section aria-label="가격 검색" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <div className="hidden gap-3 md:grid md:grid-cols-[1fr_1fr_1.7fr_1fr_92px]">
        <Field label="지역"><select aria-label="지역" value={filters.regionCode} onChange={(event) => setFilter('regionCode', event.target.value)} className={control}>{regions.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}</select></Field>
        <Field label="유종"><select aria-label="유종" value={filters.fuelCode} onChange={(event) => setFilter('fuelCode', event.target.value)} className={control}>{fuels.map((fuel) => <option key={fuel.code} value={fuel.code}>{fuel.name}</option>)}</select></Field>
        <Field label="키워드 검색"><input aria-label="주유소 이름, 지역, 도로명 검색" value={filters.query} onChange={(event) => setFilter('query', event.target.value)} className={control} placeholder="주유소 이름, 지역, 도로명 검색" /></Field>
        <Field label="정렬"><select aria-label="정렬" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)} className={control}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
        <button type="button" onClick={reset} disabled={!canReset} aria-label="주유소 검색 조건 초기화" className={`mt-auto h-10 px-3 text-[13px] ${resetButton}`}>초기화</button>
      </div>
      <div className="md:hidden">
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="liter-mobile-query">주유소 이름, 지역 검색</label>
          <input id="liter-mobile-query" aria-label="주유소 이름, 지역 검색" value={filters.query} onChange={(event) => setFilter('query', event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50/80 px-3 text-[14px] font-semibold text-slate-900 outline-none transition focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100" placeholder="주유소 이름, 지역 검색" />
          <button type="button" aria-expanded={detailOpen} aria-controls={detailId} onClick={() => setDetailOpen(true)} className={`${mobileAction} border border-blue-200 bg-blue-50 text-blue-800`}>필터</button>
          <button type="button" onClick={reset} disabled={!canReset} aria-label="주유소 검색 조건 초기화" className={`${mobileAction} ${resetButton}`}>초기화</button>
        </div>
        {canReset && <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 text-[11px] font-extrabold text-blue-800" aria-label="적용된 주유소 필터">
          {regionName && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 ring-1 ring-blue-100">{regionName}</span>}
          {fuelName && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 ring-1 ring-blue-100">{fuelName}</span>}
          {filters.sort !== 'price-asc' && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 ring-1 ring-blue-100">정렬 변경</span>}
        </div>}
        {detailOpen && (
          <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-modal="true" aria-labelledby="liter-mobile-filter-title">
            <button type="button" className="absolute inset-0 bg-slate-950/35" aria-label="상세 필터 닫기" onClick={() => setDetailOpen(false)} />
            <div id={detailId} className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="liter-mobile-filter-title" className="text-base font-black text-slate-950">상세 필터</h2>
                <button type="button" onClick={() => setDetailOpen(false)} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">닫기</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select aria-label="지역" value={filters.regionCode} onChange={(event) => setFilter('regionCode', event.target.value)} className={mobileControl}>{regions.map((region) => <option key={region.code} value={region.code}>{region.name}</option>)}</select>
                <select aria-label="유종" value={filters.fuelCode} onChange={(event) => setFilter('fuelCode', event.target.value)} className={mobileControl}>{fuels.map((fuel) => <option key={fuel.code} value={fuel.code}>{fuel.name}</option>)}</select>
              </div>
              <select aria-label="정렬" value={filters.sort} onChange={(event) => setFilter('sort', event.target.value)} className={`${mobileControl} mt-2`}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
              <button type="button" onClick={() => setDetailOpen(false)} className="mt-3 h-11 w-full rounded-xl bg-blue-600 text-sm font-extrabold text-white">적용</button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs font-bold text-slate-500 md:mt-3" aria-live="polite">조회 결과 {formatNumber(resultCount)}곳 · {dataSourceLabel}</p>
    </section>
  );
}
