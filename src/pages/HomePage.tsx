import { useMemo, useState } from 'react';
import { ArrowDownRight, CalendarDays, Fuel, TrendingDown } from 'lucide-react';
import { HeroBanner } from '../components/common/HeroBanner';
import { BottomWidgetPanel, Card, MiniTrend, PriceBadge, SectionHeader, StatsStrip } from '../components/common/ui';
import { SavingsCalculator, StationRankTable } from '../components/feature/liter';
import type { LiterData } from '../data/normalize';
import { formatSignedWon, formatWon } from '../data/normalize';
import brandMark from '../assets/home-brand-mark.webp';

interface PageProps { data: LiterData; onTabChange: (tab: string) => void; onAction: (text: string) => void; }

function TrendChip({ label, value, active = false }: { label: string; value: number; active?: boolean }) {
  return <div className={`rounded-md border px-ds-2 py-ds-1 ${active ? 'border-primary-400 bg-primary-50' : 'border-ink-200 bg-white'}`}>
    <p className="text-micro font-medium text-ink-400">{label}</p>
    <strong className={`mt-ds-0.5 block text-sm font-bold tabular ${active ? 'text-primary-600' : 'text-ink-800'}`}>{value.toLocaleString()}</strong>
  </div>;
}

export function HomePage({ data, onTabChange, onAction }: PageProps) {
  const [liter, setLiter] = useState(50);
  const best = data.stations[0];
  const averagePrice = data.averagePrice;
  const trendValues = useMemo(() => best.trend.slice(-7), [best.trend]);
  const trendAverage = trendValues.length ? Math.round(trendValues.reduce((sum, value) => sum + value, 0) / trendValues.length) : best.price;
  const trendDelta = trendValues.length > 1 ? trendValues[trendValues.length - 1] - trendValues[0] : best.avgDiff;
  const trendLabels = trendValues.map((_, index) => index === trendValues.length - 1 ? '현재' : `${trendValues.length - index - 1}회 전`);
  const savingPerLiter = Math.round(Math.max(0, averagePrice - best.price));

  return <div className="mx-auto max-w-shell space-y-ds-4">
    <HeroBanner
      kind="liter"
      badge="가까운 최저가"
      title={`${best.price.toLocaleString()}원/L · ${best.name}`}
      subtitle={`${best.brand} · ${best.address} · 평균보다 ${Math.abs(Math.round(best.avgDiff)).toLocaleString()}원 낮음`}
      chips={['서울', '휘발유', '50L 기준']}
      metric={{ label: '50L 예상 결제액', title: best.name, price: `${(best.price * 50).toLocaleString()}원`, sub: `${best.distance}km`, change: formatSignedWon(best.avgDiff), direction: 'down', helper: `평균 대비 ${formatWon(50 * savingPerLiter)} 절약` }}
      primaryLabel="길찾기 보기"
      secondaryLabel="주유 기록"
      onPrimary={() => onTabChange('stations')}
      onSecondary={() => onTabChange('records')}
      metricActionLabel="주유소 보기"
      onMetricAction={() => onTabChange('stations')}
    brandMarkSrc={brandMark}
    brandMarkAlt="리터세이브 브랜드 로고"
    />

    <StatsStrip stats={data.metrics.slice(0, 3)} compact />

    <div className="grid gap-ds-3 xl:grid-cols-main-360">
      <section>
        <SectionHeader title="주변 최저가 TOP 3" action="더보기" onAction={() => onTabChange('stations')} />
        <div className="grid gap-ds-2 lg:grid-cols-3">
          {data.stations.slice(0, 3).map((station, index) => <Card key={station.id} className="p-ds-3">
            <div className="flex items-start justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white tabular">{index + 1}</span>
              <PriceBadge direction="down" text={formatSignedWon(station.avgDiff)} />
            </div>
            <h3 className="mt-ds-3 truncate text-base font-bold text-ink-900">{station.name}</h3>
            <p className="mt-ds-0.5 text-sm text-ink-500">{station.brand} · {station.distance}km</p>
            <strong className="mt-ds-2 inline-flex items-baseline gap-1 text-display font-extrabold text-primary-500 tabular"><span>{station.price.toLocaleString()}</span><span className="text-base font-bold text-primary-500">원/L</span></strong>
          </Card>)}
        </div>
      </section>
      <SavingsCalculator selectedLiter={liter} onChange={setLiter} savingPerLiter={savingPerLiter} compact />
    </div>

    <div className="grid gap-ds-2 xl:grid-cols-main-360">
      <Card padding="normal">
        <SectionHeader title="가격 흐름" action="자세히" onAction={() => onTabChange('trend')} />
        <div className="grid gap-ds-2 xl:grid-cols-trend-detail">
          <div className="grid grid-cols-3 gap-ds-1 xl:grid-cols-1">
            <div className="rounded-md bg-primary-50 px-ds-2 py-ds-1.5">
              <p className="flex items-center gap-1 text-caption font-semibold text-primary-600"><Fuel size={14} />현재</p>
              <strong className="mt-ds-0.5 block text-2xl font-extrabold text-primary-600 tabular">{(trendValues[trendValues.length - 1] ?? best.price).toLocaleString()}원</strong>
            </div>
            <div className="rounded-md bg-ink-50 px-ds-2 py-ds-1.5">
              <p className="flex items-center gap-1 text-caption font-semibold text-ink-500"><CalendarDays size={14} />최근 평균</p>
              <strong className="mt-ds-0.5 block text-xl font-bold text-ink-900 tabular">{trendAverage.toLocaleString()}원</strong>
            </div>
            <div className="rounded-md bg-down-bg px-ds-2 py-ds-1.5">
              <p className="flex items-center gap-1 text-caption font-semibold text-down"><ArrowDownRight size={14} />처음 대비</p>
              <strong className="mt-ds-0.5 block text-xl font-bold text-down tabular">{trendDelta.toLocaleString()}원</strong>
            </div>
          </div>
          <div className="space-y-ds-2">
            <div className="grid grid-cols-2 gap-ds-1 md:grid-cols-7">
              {trendValues.map((value, index) => <TrendChip key={`${trendLabels[index]}-${value}`} label={trendLabels[index]} value={value} active={index === trendValues.length - 1} />)}
            </div>
            <div className="rounded-md bg-ink-50 px-ds-2 py-ds-1.5">
              <div className="mb-2 flex items-center justify-between text-caption"><span className="font-semibold text-ink-700">서울 휘발유 평균</span><span className="flex items-center gap-1 text-down"><TrendingDown size={14} />완만한 하락</span></div>
              <MiniTrend values={trendValues} direction="down" />
            </div>
          </div>
        </div>
      </Card>
      <Card padding="normal">
        <SectionHeader title="빠른 가격 확인" action="지도" onAction={() => onTabChange('stations')} />
        <StationRankTable stations={data.stations} onSelect={(station) => onAction(`${station.name} 선택`)} limit={3} compact />
      </Card>
    </div>


    {data.fuelNews.length > 0 ? (
      <Card padding="normal">
        <SectionHeader title="유가 뉴스" action="전체 보기" onAction={() => onTabChange('fuel-news')} />
        <div className="grid gap-ds-2 md:grid-cols-2">
          {data.fuelNews.slice(0, 2).map((item) => (
            <article key={item.id} className="rounded-md border border-ink-200 bg-white px-ds-2 py-ds-1.5">
              <div className="mb-2 flex items-center justify-between gap-ds-2 text-xs text-ink-400"><span>{item.keyword}</span><span>{item.publishedAt}</span></div>
              <h3 className="line-clamp-1 text-sm font-bold text-ink-900">{item.title}</h3>
              <p className="mt-ds-0.5 line-clamp-1 text-caption text-ink-500">{item.summary}</p>
            </article>
          ))}
        </div>
      </Card>
    ) : null}

    <BottomWidgetPanel widgets={data.widgets} onAction={onAction} compact />
  </div>;
}
