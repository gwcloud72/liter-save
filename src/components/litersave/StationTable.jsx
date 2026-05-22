import { useEffect, useState } from 'react';
import { getStationKey } from '../../lib/data.js';
import { mapSearchUrl } from '../../lib/dashboardData.js';
import { formatNumber, formatSignedWon } from '../../lib/format.js';

const PAGE_SIZE = 8;

function PumpIcon() {
  return (
    <svg viewBox="0 0 48 48" className="mx-auto mb-3 size-12 text-blue-300" aria-hidden="true">
      <path d="M14 41V9c0-3 2-5 5-5h12c3 0 5 2 5 5v32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M18 14h14v10H18zM11 41h28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 14h3l3 5v12c0 3-2 5-5 5h-1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function getBrandMeta(brand) {
  const raw = String(brand || '기타').trim();
  const name = raw.toUpperCase();
  if (name.includes('SK')) return { label: 'SK', tone: 'bg-red-500', text: 'SK', fullLabel: raw };
  if (name.includes('GS')) return { label: 'GS', tone: 'bg-emerald-500', text: 'GS', fullLabel: raw };
  if (name.includes('S-OIL') || name.includes('SOIL')) return { label: 'S-OIL', tone: 'bg-yellow-400', text: 'S', fullLabel: raw };
  if (name.includes('현대') || name.includes('HD')) return { label: '현대', tone: 'bg-blue-500', text: 'H', fullLabel: raw };
  if (name.includes('알뜰')) return { label: '알뜰', tone: 'bg-sky-500', text: 'A', fullLabel: raw };
  if (name.includes('RTO')) return { label: 'RTO', tone: 'bg-slate-500', text: 'R', fullLabel: raw };
  return { label: raw.length > 6 ? `${raw.slice(0, 6)}…` : raw, tone: 'bg-slate-400', text: 'O', fullLabel: raw };
}

function BrandMark({ brand }) {
  const meta = getBrandMeta(brand);
  return (
    <span className={`grid size-4 shrink-0 place-items-center rounded-full ${meta.tone} text-[8px] font-black leading-none text-white ring-2 ring-white`} aria-hidden="true">
      {meta.text}
    </span>
  );
}

function BrandBadge({ brand }) {
  const meta = getBrandMeta(brand);
  return (
    <span title={meta.fullLabel} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-extrabold text-slate-700 shadow-sm">
      <BrandMark brand={brand} />
      <span className="min-w-0 truncate">{meta.label}</span>
    </span>
  );
}

function rankClass(rank) {
  return rank <= 3 ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-500';
}

function EmptyState({ onReset, message = '조건에 맞는 주유소가 없습니다.', actionLabel = '조건 초기화' }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-9 text-center text-sm font-bold text-slate-500">
      <PumpIcon />
      <p>{message}</p>
      <p className="mt-1 text-xs font-semibold text-slate-400">조건을 바꾸거나 최저가 목록으로 돌아가면 다시 탐색할 수 있습니다.</p>
      {onReset && <button type="button" onClick={onReset} aria-label={actionLabel} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700">{actionLabel}</button>}
    </div>
  );
}

function ActionCell({ station, mapUrl, favorites, isFavorite, id }) {
  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap text-[11px] font-extrabold">
      <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 transition hover:bg-slate-50" aria-label={`${station.name} 길찾기`}>길찾기</a>
      <button type="button" onClick={() => favorites?.toggle(id)} aria-label={`${station.name} 관심 주유소 토글`} aria-pressed={isFavorite} className={`rounded-lg px-2 py-1 transition ${isFavorite ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{isFavorite ? '저장됨' : '관심'}</button>
    </div>
  );
}

function StationRow({ station, rank, averagePrice, favorites }) {
  const id = getStationKey(station);
  const saving = station.price - averagePrice;
  const isFavorite = favorites?.has(id);
  const mapUrl = mapSearchUrl(station);
  return (
    <tr className="align-middle hover:bg-slate-50/80">
      <td className="px-3 py-3">
        <span className={`grid size-6 place-items-center rounded-full border text-xs font-bold ${rankClass(rank)}`}>{rank}</span>
      </td>
      <td className="min-w-0 px-3 py-3 font-bold text-slate-900">
        <p title={station.name} className="line-clamp-2 min-w-0 break-keep leading-snug">{station.name}</p>
        <p title={station.address} className="mt-1 line-clamp-1 min-w-0 text-[11px] font-semibold leading-snug text-slate-400">{station.address}</p>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[17px] font-extrabold tabular-nums text-blue-600">{formatNumber(station.price)}</td>
      <td className={`whitespace-nowrap px-3 py-3 font-bold tabular-nums ${saving <= 0 ? 'text-blue-600' : 'text-red-500'}`}>{formatSignedWon(saving)}</td>
      <td className="min-w-0 px-3 py-3">
        <BrandBadge brand={station.brand} />
      </td>
      <td className="px-3 py-3 text-right">
        <ActionCell station={station} mapUrl={mapUrl} favorites={favorites} isFavorite={isFavorite} id={id} />
      </td>
    </tr>
  );
}

function StationCard({ station, rank, averagePrice, favorites }) {
  const id = getStationKey(station);
  const saving = station.price - averagePrice;
  const isFavorite = favorites?.has(id);
  const mapUrl = mapSearchUrl(station);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${rankClass(rank)}`}>{rank}</span>
            <p title={station.name} className="line-clamp-2 min-w-0 break-keep font-extrabold text-slate-950">{station.name}</p>
          </div>
          <p className="mt-2 max-w-full">
            <BrandBadge brand={station.brand} />
          </p>
          <p title={station.address} className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">{station.address}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[20px] font-black leading-none tabular-nums text-blue-600">{formatNumber(station.price)}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-400">원/L</p>
          <p className={`mt-2 text-sm font-extrabold ${saving <= 0 ? 'text-blue-600' : 'text-red-500'}`}>{formatSignedWon(saving)}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-extrabold">
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="grid h-9 place-items-center rounded-xl border border-slate-200 text-slate-700" aria-label={`${station.name} 길찾기`}>길찾기</a>
        <button type="button" onClick={() => favorites?.toggle(id)} aria-label={`${station.name} 관심 주유소 토글`} aria-pressed={isFavorite} className={`h-9 rounded-xl ${isFavorite ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-700'}`}>{isFavorite ? '저장됨' : '관심 저장'}</button>
      </div>
    </article>
  );
}

function LoadMore({ visibleCount, totalCount, onClick }) {
  if (visibleCount >= totalCount) return null;
  return (
    <div className="mt-4 flex justify-center">
      <button type="button" onClick={onClick} className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50" aria-label="주유소 더 보기">
        더 보기 <span className="ml-1 text-slate-400">{visibleCount}/{totalCount}</span>
      </button>
    </div>
  );
}

export default function StationTable({ stations, averagePrice, favorites, title = '서울특별시 휘발유 가격 비교', reset, canReset, emptyMessage, emptyAction, emptyActionLabel }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [stations.length, title]);
  const visibleStations = stations.filter((_, index) => index < visibleCount);
  const handleMore = () => setVisibleCount((count) => Math.min(count + PAGE_SIZE, stations.length));
  const emptyHandler = emptyAction || reset;
  const label = emptyActionLabel || (canReset ? '조건 초기화' : '최저가 주유소 찾기');
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-3 flex items-center gap-2 md:mb-4">
        <h2 className="text-[16px] font-extrabold tracking-tight text-slate-950 md:text-lg">{title}</h2>
        <span className="text-slate-400" aria-hidden="true">ⓘ</span>
      </div>
      {!stations.length ? <EmptyState onReset={emptyHandler} message={emptyMessage} actionLabel={label} /> : <>
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 md:block">
          <table className="w-full table-fixed border-collapse text-left text-[13px]">
            <caption className="sr-only">저가 주유소 목록</caption>
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[36%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[17%]" />
            </colgroup>
            <thead className="bg-slate-50 text-[12px] font-bold text-slate-500">
              <tr>
                <th className="px-3 py-2">순위</th>
                <th className="px-3 py-2">주유소</th>
                <th className="px-3 py-2">가격</th>
                <th className="px-3 py-2">평균 대비</th>
                <th className="px-3 py-2">브랜드</th>
                <th className="px-3 py-2 text-right">확인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{visibleStations.map((station, index) => <StationRow key={getStationKey(station)} station={station} rank={index + 1} averagePrice={averagePrice} favorites={favorites} />)}</tbody>
          </table>
        </div>
        <div className="grid gap-3 md:hidden">{visibleStations.map((station, index) => <StationCard key={getStationKey(station)} station={station} rank={index + 1} averagePrice={averagePrice} favorites={favorites} />)}</div>
        <LoadMore visibleCount={visibleStations.length} totalCount={stations.length} onClick={handleMore} />
      </>}
    </section>
  );
}
