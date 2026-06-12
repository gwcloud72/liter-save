import { useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, Download, ExternalLink, Fuel, Gauge, MapPin, Newspaper, Plus, Route, WalletCards } from 'lucide-react';
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart';
import { BottomWidgetPanel, Button, Card, DataTable, EmptyState, FilterChips, MiniTrend, PriceBadge, SearchField, SectionHeader, StatsStrip } from '../../components/common/ui';
import { KakaoMapPanel, SavingsCalculator, StationCard, StationRankTable } from '../../components/feature/liter';
import type { LiterData } from '../../data/normalize';
import { formatSignedWon } from '../../data/normalize';

interface PageProps { data: LiterData; onTabChange: (tab: string) => void; onAction: (text: string) => void; }
function Shell({ title, children, data, onAction, compact = false }: { title: string; children: ReactNode; data: LiterData; onAction: (text: string) => void; compact?: boolean }) { return <div className="mx-auto max-w-content space-y-ds-3"><SectionHeader title={title} />{children}<BottomWidgetPanel widgets={data.widgets} onAction={onAction} compact={compact} /></div>; }

type FuelRecord = LiterData['records'][number];

function RecordMetric({ icon: Icon, label, value, sub }: { icon: typeof Fuel; label: string; value: string; sub: string }) {
  return <Card padding="normal"><div className="flex items-start justify-between gap-ds-2"><div><p className="text-caption text-ink-500">{label}</p><strong className="mt-ds-1 block text-2xl font-extrabold text-ink-900 tabular">{value}</strong><p className="mt-ds-0.5 text-xs text-ink-500">{sub}</p></div><span className="rounded-lg bg-primary-50 p-2 text-primary-600"><Icon size={18} /></span></div></Card>;
}

function uniqueStations(stations: LiterData['stations']) {
  return Array.from(new Map(stations.map((station) => [station.id, station])).values());
}

export function StationsPage({ data, onAction }: PageProps) {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(data.stations[0]?.id ?? '');
  const list = data.stations.filter((station) => station.name.includes(q) || station.brand.includes(q) || station.address.includes(q) || q === '');
  const selected = list.find((station) => station.id === selectedId) ?? list[0] ?? data.stations[0];
  const selectStation = (station: typeof data.stations[number], source: string) => {
    setSelectedId(station.id);
    onAction(`${station.name} ${source}`);
  };
  return <Shell title="주유소 찾기" data={data} onAction={onAction}>
    <div className="grid gap-ds-2 lg:grid-cols-search-action"><SearchField value={q} onChange={setQ} placeholder="주유소명·브랜드·주소 검색" /><FilterChips items={['휘발유', '경유', 'LPG', '서울']} active="휘발유" onChange={onAction} /></div>
    <div className="grid gap-ds-3 xl:grid-cols-map-search">
      <Card padding="normal"><SectionHeader title="검색 결과 TOP 8" description="가격순으로 먼저 보고 지도에서 위치를 확인합니다." action="거리순" onAction={() => onAction('거리순')} /><StationRankTable stations={list} onSelect={(station) => selectStation(station, '선택')} /></Card>
      <div className="space-y-ds-2">
        <KakaoMapPanel stations={list} onSelect={(station) => selectStation(station, '지도 선택')} tall />
        {selected ? <Card padding="normal" selected>
          <div className="flex flex-wrap items-start justify-between gap-ds-2">
            <div className="min-w-0"><p className="text-caption font-semibold text-primary-600">선택 주유소</p><h3 className="mt-ds-0.5 truncate text-heading-2 text-ink-900">{selected.name}</h3><p className="mt-ds-0.5 text-sm text-ink-500">{selected.brand} · {selected.distance}km · {selected.address}</p></div>
            <div className="text-right"><strong className="inline-flex items-baseline justify-end gap-0.5 text-price-lg text-primary-500 tabular"><span>{selected.price.toLocaleString()}</span><span className="text-sm font-bold text-primary-500">원/L</span></strong><div className="mt-ds-1.5"><PriceBadge direction="down" text={formatSignedWon(selected.avgDiff)} /></div></div>
          </div>
          <div className="mt-ds-3 grid gap-ds-2 sm:grid-cols-3"><div className="rounded-md bg-primary-50 px-ds-2 py-ds-1.5"><p className="text-caption text-primary-600">50L 예상</p><strong className="text-lg font-extrabold text-primary-600 tabular">{(selected.price * 50).toLocaleString()}원</strong></div><div className="rounded-md bg-down-bg px-ds-2 py-ds-1.5"><p className="text-caption text-down">평균 대비</p><strong className="text-lg font-extrabold text-down tabular">{(50 * (data.averagePrice - selected.price)).toLocaleString()}원 절약</strong></div><Button variant="primary" onClick={() => onAction(`${selected.name} 길찾기`)} className="h-ds-7"><ExternalLink size={15} />길찾기</Button></div>
        </Card> : null}
      </div>
    </div>
  </Shell>;
}

export function AnalysisPage({ data, onAction }: PageProps) {
  const brandRows = data.brandBars.slice(0, 6);
  const widthClass = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12', 'w-7/12'];
  return <Shell title="가격 분석" data={data} onAction={onAction}>
    <div className="grid gap-ds-2 xl:grid-cols-main-420">
      <Card padding="normal">
        <SectionHeader title="브랜드별 가격 차이" action="주유소 찾기" onAction={() => onAction('주유소 찾기')} />
        <HorizontalBarChart data={brandRows} height={180} />
        <div className="mt-ds-3 space-y-3">
          {brandRows.map((bar, index) => <div key={bar.name} className="grid grid-cols-station-row items-center gap-ds-2">
            <span className="text-sm font-semibold text-ink-700">{bar.name}</span>
            <div className="h-2.5 overflow-hidden rounded-full bg-ink-100"><div className={`${widthClass[index] ?? 'w-7/12'} h-full rounded-full bg-primary-600`} /></div>
            <span className="text-right text-sm font-bold text-ink-900 tabular">{bar.value}원</span>
          </div>)}
        </div>
      </Card>
      <Card padding="normal">
        <SectionHeader title="분석 요약" action="TOP 8" onAction={() => onAction('TOP 8')} />
        <div className="space-y-3">
          {data.stations.slice(0, 5).map((station, index) => <button type="button" key={station.id} onClick={() => onAction(`${station.name} 선택`)} className="flex w-full items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-2 text-left hover:bg-primary-50">
            <div className="min-w-0"><p className="truncate text-sm font-bold text-ink-900">{index + 1}. {station.name}</p><p className="mt-ds-0.5 truncate text-xs text-ink-500">{station.brand} · {station.distance}km</p></div>
            <strong className="text-base font-extrabold text-primary-500 tabular">{station.price.toLocaleString()}</strong>
          </button>)}
        </div>
      </Card>
    </div>
    <DataTable caption="지역 평균 비교" columns={[{ key: 'region', label: '지역' }, { key: 'fuel', label: '유종' }, { key: 'avg', label: '평균가', align: 'right' }, { key: 'low', label: '최저가', align: 'right' }, { key: 'stationCount', label: '주유소', align: 'right' }]} rows={data.regionRows.slice(0, 10).map((row) => ({ id: row.id, cells: { region: <b>{row.region}</b>, fuel: row.fuel, avg: <span className="tabular">{row.avg.toLocaleString()}원</span>, low: <span className="tabular">{row.low.toLocaleString()}원</span>, stationCount: <span className="tabular">{row.stationCount.toLocaleString()}곳</span> } }))} />
  </Shell>;
}

export function TrendPage({ data, onAction }: PageProps) { return <Shell title="가격 추이" data={data} onAction={onAction}><StatsStrip stats={data.metrics} compact /><DataTable caption="가격 흐름" columns={[{ key: 'station', label: '주유소' }, { key: 'now', label: '현재가', align: 'right' }, { key: 'trend', label: '흐름' }, { key: 'change', label: '평균 대비' }]} rows={data.stations.slice(0, 10).map((s) => ({ id: s.id, cells: { station: s.name, now: <span className="tabular">{s.price.toLocaleString()}원</span>, trend: <MiniTrend values={s.trend} direction="down" />, change: <PriceBadge direction="down" text={formatSignedWon(s.avgDiff)} /> } }))} /></Shell>; }

export function RecordsPage({ data, onAction }: PageProps) {
  const [rows, setRows] = useState<FuelRecord[]>(data.records);
  const [liter, setLiter] = useState(50);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), station: data.stations[0]?.name ?? '', liter: '50', price: String(data.stations[0]?.price ?? data.averagePrice) });
  const summary = useMemo(() => {
    const totalLiter = rows.reduce((sum, row) => sum + row.liter, 0);
    const totalAmount = rows.reduce((sum, row) => sum + row.liter * row.price, 0);
    const avgPrice = totalLiter > 0 ? Math.round(totalAmount / totalLiter) : 0;
    const saving = rows.reduce((sum, row) => sum + Math.max(0, data.averagePrice - row.price) * row.liter, 0);
    return { totalLiter, totalAmount, avgPrice, saving: Math.round(saving) };
  }, [rows, data.averagePrice]);
  const addRecord = () => {
    const nextLiter = Number.parseFloat(form.liter);
    const nextPrice = Number.parseInt(form.price, 10);
    if (!form.station || !Number.isFinite(nextLiter) || !Number.isFinite(nextPrice) || nextLiter <= 0 || nextPrice <= 0) { onAction('입력값 확인'); return; }
    const next: FuelRecord = { id: `record-${rows.length + 1}`, date: form.date, station: form.station, liter: nextLiter, price: nextPrice };
    setRows((current) => [next, ...current].slice(0, 12));
    setLiter(Math.round(nextLiter));
    onAction('주유 기록 추가');
  };
  const exportCsv = () => {
    const header = 'date,station,liter,price,total';
    const lines = rows.map((row) => [row.date, row.station, row.liter, row.price, row.liter * row.price].join(','));
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'litersave-records.csv';
    link.click();
    URL.revokeObjectURL(url);
    onAction('CSV 내보내기');
  };
  const best = data.stations[0];
  return <Shell title="주유 기록" data={data} onAction={onAction}>
    <div className="grid gap-ds-2 md:grid-cols-3">
      <RecordMetric icon={WalletCards} label="이번 달 주유액" value={`${summary.totalAmount.toLocaleString()}원`} sub={`${rows.length}회 기록`} />
      <RecordMetric icon={Gauge} label="평균 단가" value={`${summary.avgPrice.toLocaleString()}원/L`} sub={`지역 평균 ${Math.round(data.averagePrice).toLocaleString()}원`} />
      <RecordMetric icon={Fuel} label="총 주유량" value={`${summary.totalLiter.toLocaleString()}L`} sub={`${summary.saving.toLocaleString()}원 절약`} />
    </div>
    <div className="grid gap-ds-3 xl:grid-cols-main-380">
      <div className="space-y-ds-2">
        <div className="flex flex-wrap items-center justify-between gap-ds-2"><h3 className="text-base font-bold text-ink-900">최근 주유 기록</h3><Button variant="secondary" onClick={exportCsv}><Download size={16} />CSV 내보내기</Button></div>
        <DataTable caption="최근 주유 기록" columns={[{ key: 'date', label: '일자' }, { key: 'station', label: '주유소' }, { key: 'liter', label: '주유량', align: 'right' }, { key: 'price', label: '단가', align: 'right' }, { key: 'sum', label: '결제액', align: 'right' }]} rows={rows.map((r) => ({ id: r.id, cells: { date: <span className="inline-flex items-center gap-1.5 text-ink-600"><CalendarDays size={14} />{r.date}</span>, station: <b className="text-ink-900">{r.station}</b>, liter: <span className="tabular">{r.liter}L</span>, price: <span className="tabular">{r.price.toLocaleString()}원</span>, sum: <b className="tabular">{(r.liter * r.price).toLocaleString()}원</b> } }))} />
      </div>
      <div className="space-y-ds-2">
        <Card padding="normal">
          <SectionHeader title="기록 추가" action="최저가 적용" onAction={() => setForm((current) => ({ ...current, station: best?.name ?? current.station, price: String(best?.price ?? current.price) }))} />
          <div className="space-y-3">
            <label className="block text-caption font-semibold text-ink-500">일자<input aria-label="주유 일자" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></label>
            <label className="block text-caption font-semibold text-ink-500">주유소<select aria-label="주유소 선택" value={form.station} onChange={(event) => setForm((current) => ({ ...current, station: event.target.value }))} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100">{data.stations.slice(0, 8).map((station) => <option key={station.id} value={station.name}>{station.name}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-ds-2">
              <label className="block text-caption font-semibold text-ink-500">주유량<input aria-label="주유량" inputMode="decimal" value={form.liter} onChange={(event) => setForm((current) => ({ ...current, liter: event.target.value }))} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></label>
              <label className="block text-caption font-semibold text-ink-500">단가<input aria-label="주유 단가" inputMode="numeric" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="mt-ds-0.5 h-11 w-full rounded-md border border-ink-200 px-3 text-sm text-ink-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100" /></label>
            </div>
            <Button onClick={addRecord} className="w-full"><Plus size={16} />기록 추가</Button>
          </div>
        </Card>
        <SavingsCalculator selectedLiter={liter} onChange={setLiter} savingPerLiter={Math.max(0, data.averagePrice - (best?.price ?? data.averagePrice))} />
      </div>
    </div>
  </Shell>;
}

export function FavoritesPage({ data, onAction }: PageProps) { const favorites = uniqueStations([...data.stations.filter((s) => s.favorite), ...data.stations]).slice(0, 6); return <Shell title="자주 가는 주유소" data={data} onAction={onAction}><div className="grid gap-ds-2 lg:grid-cols-2 xl:grid-cols-3">{favorites.map((s) => <StationCard key={s.id} station={s} onToggle={() => onAction(`${s.name} 즐겨찾기`)} />)}</div></Shell>; }


export function FuelNewsPage({ data, onAction }: PageProps) {
  const [keyword, setKeyword] = useState('전체');
  const keywordCounts = new Map<string, number>();
  data.fuelNews.forEach((item) => keywordCounts.set(item.keyword, (keywordCounts.get(item.keyword) ?? 0) + 1));
  const keywords = ['전체', ...Array.from(keywordCounts.entries()).filter(([, count]) => count > 0).map(([item]) => item).slice(0, 6)];
  const rows = data.fuelNews.filter((item) => keyword === '전체' || item.keyword === keyword).slice(0, 10);
  return <Shell title="유가 뉴스" data={data} onAction={onAction} compact>
    <div className="flex flex-wrap gap-ds-1">{keywords.map((item) => <button type="button" key={item} onClick={() => setKeyword(item)} aria-pressed={keyword === item} className={`rounded-full border px-ds-2 py-ds-0.5 text-sm ${keyword === item ? 'border-primary-600 bg-primary-600 text-white' : 'border-ink-200 bg-white text-ink-700 hover:border-primary-500'}`}>{item}</button>)}</div>
    {rows.length ? <div className="grid gap-ds-2 xl:grid-cols-main-360">
      <div className="space-y-3">{rows.slice(0, 9).map((item) => {
        const href = item.link || item.originallink;
        return <article key={item.id} className="rounded-md border border-ink-200 bg-white p-ds-2 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-ds-1 text-caption text-ink-500"><span className="rounded-full bg-primary-50 px-2 py-1 font-semibold text-primary-600">{item.keyword}</span><span>{item.source} · {item.publishedAt}</span></div>
          <h3 className="mt-ds-2 text-base font-bold text-ink-900">{item.title}</h3>
          <p className="mt-ds-1 line-clamp-2 text-sm text-ink-500">{item.summary}</p>
          {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-ds-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline"><ExternalLink size={15} />원문 보기</a> : null}
        </article>;
      })}</div>
      <Card padding="normal"><SectionHeader title="가격과 함께 볼 키워드" action="가격 분석" onAction={() => onAction('가격 분석')} /><div className="space-y-2">{['휘발유','경유','LPG','국제유가','유류세'].map((item) => ({ item, count: data.fuelNews.filter((news) => news.keyword === item).length })).filter(({ count }) => count > 0).map(({ item, count }) => <div key={item} className="flex items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-1"><span className="text-sm font-semibold text-ink-900">{item}</span><span className="text-caption text-ink-500">{count}건</span></div>)}</div></Card>
    </div> : <EmptyState title="유가 뉴스 항목 확인 필요" description="주유소 가격과 추이 화면을 확인하세요." icon={Newspaper} />}
  </Shell>;
}

export function AlertsPage({ data, onAction }: PageProps) {
  const [active, setActive] = useState<string[]>([]);
  return <Shell title="알림 설정" data={data} onAction={onAction}>
    <div className="grid gap-ds-2 xl:grid-cols-main-360">
      <div className="grid gap-ds-2 lg:grid-cols-3">{data.stations.slice(0, 6).map((s) => <Card key={s.id} className={`p-ds-3 ${active.includes(s.id) ? 'border-primary-400 bg-primary-50' : ''}`}><div className="flex items-center justify-between"><b>{s.name}</b><button type="button" aria-pressed={active.includes(s.id)} onClick={() => setActive((list) => list.includes(s.id) ? list.filter((id) => id !== s.id) : [...list, s.id])} className="text-xs font-semibold text-primary-600">{active.includes(s.id) ? '켜짐' : '꺼짐'}</button></div><p className="mt-ds-1 text-sm text-ink-500">{s.price - 20}원 이하 진입 시 확인</p><PriceBadge direction="down" text={formatSignedWon(s.avgDiff)} /></Card>)}</div>
      <Card padding="normal"><SectionHeader title="최근 변동" action="가격 추이" onAction={() => onAction('가격 추이')} /><div className="space-y-2">{data.stations.slice(0, 5).map((s) => <div key={`${s.id}-change`} className="flex items-center justify-between rounded-md bg-ink-50 px-ds-2 py-ds-1"><span className="truncate text-sm font-semibold text-ink-900">{s.name}</span><PriceBadge direction={s.trend[s.trend.length - 1] - s.trend[0] > 0 ? 'up' : s.trend[s.trend.length - 1] - s.trend[0] < 0 ? 'down' : 'flat'} text={`${s.trend[s.trend.length - 1] - s.trend[0]}원`} /></div>)}</div></Card>
    </div>
  </Shell>;
}

export function GuidePage({ data, onAction }: PageProps) { return <Shell title="이용 가이드" data={data} onAction={onAction} compact>
  <div className="grid gap-ds-2 lg:grid-cols-3">{['위치 확인', '가격 비교', '길찾기', '기록 확인'].map((label, index) => <Card key={label} className="p-ds-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-white tabular">{index + 1}</span><h3 className="mt-ds-2 font-bold">{label}</h3><p className="mt-ds-1 text-sm text-ink-500">핵심 화면으로 바로 이동합니다.</p><Button variant="secondary" onClick={() => onAction(label)} className="mt-ds-2 w-full">확인</Button></Card>)}</div>
  <Card padding="normal"><SectionHeader title="빠른 이동" action="주유소 찾기" onAction={() => onAction('주유소 찾기')} /><div className="grid gap-ds-2 md:grid-cols-3"><Button variant="secondary" onClick={() => onAction('주유소 찾기')}><MapPin size={16} />주유소</Button><Button variant="secondary" onClick={() => onAction('가격 분석')}><Route size={16} />분석</Button><Button variant="secondary" onClick={() => onAction('주유 기록')}><WalletCards size={16} />기록</Button></div></Card>
</Shell>; }

export function NoticePage({ data, onAction }: PageProps) { return <Shell title="공지사항" data={data} onAction={onAction} compact>
  <EmptyState title="공지사항 항목 확인 필요" description="운영 공지가 등록된 뒤 이곳에 표시됩니다." icon={Newspaper} />
</Shell>; }
