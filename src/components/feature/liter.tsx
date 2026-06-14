import { ExternalLink, MapPin, Star } from 'lucide-react';
import { Card, PriceBadge, RankBadge, MiniTrend, Button } from '../common/ui';
import type { Station } from '../../data/model';
import { priceDiffCopy } from '../../data/normalize';

export function StationRankTable({ stations, onSelect, limit = 8, compact = false }: { stations: Station[]; onSelect: (station: Station) => void; limit?: number; compact?: boolean }) {
  return <div className="space-y-2">{stations.slice(0,limit).map((station,index)=><button type="button" key={station.id} onClick={()=>onSelect(station)} className={`v6-list-row grid w-full grid-cols-record-action items-center gap-ds-2 rounded-lg border bg-white text-left transition hover:border-primary-500 ${compact ? 'px-ds-2 py-ds-1.5' : 'px-ds-3 py-ds-2'} ${index < 3 ? 'border-primary-100 shadow-card' : 'border-ink-200'}`}><RankBadge value={index+1}/><div className="min-w-0"><b className="block truncate text-sm text-ink-900">{station.name}</b><p className="mt-1 truncate text-xs text-ink-500">{station.brand} · {station.distance}km</p></div><div className="text-right"><strong className="inline-flex items-baseline justify-end gap-0.5 text-[20px] font-bold leading-[1.1] text-primary-500 tabular"><span>{station.price.toLocaleString()}</span><span className="v6-unit text-ink-500">원/L</span></strong></div></button>)}</div>;
}

const markerClass = (index: number) => index === 0
  ? 'map-marker-0 bg-primary-600 text-white shadow-card-hover'
  : index === 1 ? 'map-marker-1 border-2 border-primary-500 bg-white text-primary-700 shadow-card'
  : index === 2 ? 'map-marker-2 border-2 border-primary-500 bg-white text-primary-700 shadow-card'
  : index === 3 ? 'map-marker-3 border border-ink-300 bg-white text-ink-700'
  : index === 4 ? 'map-marker-4 border border-ink-300 bg-white text-ink-700'
  : index === 5 ? 'map-marker-5 border border-ink-300 bg-white text-ink-700'
  : index === 6 ? 'map-marker-6 border border-ink-300 bg-white text-ink-700'
  : 'map-marker-7 border border-ink-300 bg-white text-ink-700';

export function KakaoMapPanel({ stations, onSelect, tall = false }: { stations: Station[]; onSelect: (station: Station) => void; tall?: boolean }) {
  const best = stations[0];
  return <Card padding="normal" className={`relative overflow-hidden bg-primary-50 ${tall ? 'min-h-map' : 'min-h-hero'}`}>
    <div className="absolute inset-0 map-surface" />
    <div className="relative flex items-center justify-between"><div><h3 className="text-heading-2 text-ink-900">지역 가격 지도</h3></div><span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700"><MapPin size={13}/>현재 위치</span></div>
    <div className={`relative mt-5 overflow-hidden rounded-lg border border-white/80 bg-white/60 ${tall ? 'h-80' : 'h-56'}`}>
      <div className="map-road-a absolute rounded-full bg-white/70" />
      <div className="map-road-b absolute rounded-full bg-white/65" />
      <div className="map-road-c absolute rounded-full bg-white/55" />
      <div className="map-road-d absolute rounded-full bg-white/60" />
      {stations.slice(0,8).map((station,index)=><button type="button" key={station.id} onClick={()=>onSelect(station)} className={`absolute rounded-full px-3 py-1 text-[11px] font-bold tabular ${markerClass(index)}`}>{station.price.toLocaleString()}</button>)}
      <span className="map-current-dot absolute h-4 w-4 rounded-full border-4 border-white bg-blue-600 shadow-card" />
      <span className="map-current-label absolute rounded-full bg-blue-600/10 px-ds-1 py-ds-0.5 text-micro font-bold text-blue-700">현재 위치</span>
    </div>
    {best ? <button type="button" onClick={()=>onSelect(best)} className="relative mt-4 flex w-full items-center justify-between rounded-lg border border-primary-100 bg-white px-4 py-3 text-left shadow-card hover:border-primary-500"><div><p className="text-[11px] text-primary-600">선택 추천</p><p className="mt-ds-0.5 truncate text-[15px] text-ink-900">{best.name}</p><p className="mt-ds-0.5 text-[13px] text-ink-500">{best.brand} · {best.distance}km</p></div><strong className="inline-flex items-baseline text-[20px] font-bold text-primary-500 tabular"><span>{best.price.toLocaleString()}</span><span className="v6-unit">원/L</span></strong></button> : null}
    <a href="https://map.kakao.com" target="_blank" rel="noopener noreferrer" className="relative mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary-600 text-[15px] font-bold text-white hover:bg-primary-700">카카오맵 길찾기<ExternalLink size={15}/></a>
  </Card>;
}

export function SavingsCalculator({ selectedLiter, onChange, savingPerLiter, compact = false }: { selectedLiter: number; onChange: (liter: number) => void; savingPerLiter: number; compact?: boolean }) { return <Card padding={compact ? 'compact' : 'normal'}><h3 className="text-base font-bold">50L 절약 계산</h3><div className="mt-4 flex gap-2">{[40,50,60].map((liter)=><button type="button" key={liter} aria-pressed={selectedLiter===liter} onClick={()=>onChange(liter)} className={`h-9 rounded-full border px-4 text-sm ${selectedLiter===liter?'border-primary-600 bg-primary-600 text-white':'border-ink-200 bg-white text-ink-700'}`}>{liter}L</button>)}</div><strong className="mt-5 inline-flex items-baseline text-display font-bold text-primary-600 tabular"><span>{Math.round(selectedLiter * Math.max(0, savingPerLiter)).toLocaleString()}</span><span className="v6-unit">원</span></strong></Card>; }

function routeHref(station: Station): string { return Number.isFinite(station.lat) && Number.isFinite(station.lng) && station.lat !== 0 && station.lng !== 0 ? `https://map.kakao.com/link/to/${encodeURIComponent(station.name)},${station.lat},${station.lng}` : `https://map.kakao.com/?q=${encodeURIComponent(station.name)}`; }

export function StationCard({ station, favorite = false, onToggle, onRoute }: { station: Station; favorite?: boolean; onToggle: () => void; onRoute?: () => void }) { return <Card padding="normal"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-ink-900">{station.name}</h3><p className="mt-1 truncate text-sm text-ink-500">{station.brand} · {station.distance}km</p></div><button type="button" onClick={onToggle} aria-pressed={favorite} className={`shrink-0 rounded-full p-2 ${favorite ? 'bg-primary-100 text-primary-600' : 'bg-ink-100 text-ink-400 hover:text-primary-600'}`}><Star size={17} fill={favorite?'currentColor':'none'}/></button></div><div className="mt-5 grid grid-cols-trend-110 items-end gap-4"><div><strong className="inline-flex items-baseline gap-0.5 text-2xl font-bold text-primary-500 tabular"><span>{station.price.toLocaleString()}</span><span className="v6-unit">원/L</span></strong><p className="mt-ds-0.5 text-[13px] text-ink-500">{priceDiffCopy(station.avgDiff)}</p></div><MiniTrend values={station.trend} direction="down"/></div><a href={routeHref(station)} target="_blank" rel="noopener noreferrer" onClick={onRoute} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-ink-200 text-[15px] font-bold text-primary-600 hover:border-primary-500 hover:bg-primary-50">길찾기<ExternalLink size={15}/></a></Card>; }
