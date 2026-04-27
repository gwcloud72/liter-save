import { useMemo, useState } from 'react';
import { formatDate, formatSignedWon, formatWon } from '../utils/format.js';

const RANGE_OPTIONS = [
  { code: '1d', label: '1일' },
  { code: '7d', label: '7일' },
  { code: '30d', label: '30일' },
];

const CHART_WIDTH = 760;
const CHART_HEIGHT = 260;
const CHART_PADDING = { top: 16, right: 20, bottom: 34, left: 58 };

function formatAxisLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `${Math.round(number).toLocaleString('ko-KR')}`;
}

function formatChartLabel(value, rangeCode) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  if (rangeCode === '1d') {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function getRangeDays(rangeCode) {
  if (rangeCode === '1d') return 1;
  if (rangeCode === '30d') return 30;
  if (rangeCode === 'all') return null;
  return 7;
}

function buildSeries(historyPayload, dataset, rangeCode) {
  if (!dataset) return [];

  const snapshots = Array.isArray(historyPayload?.snapshots) ? historyPayload.snapshots : [];
  const baseSeries = snapshots
    .map((snapshot) => {
      const metric = Array.isArray(snapshot?.metrics)
        ? snapshot.metrics.find(
          (item) => item.regionCode === dataset.regionCode && item.fuelCode === dataset.fuelCode,
        )
        : null;

      if (!metric) return null;
      const timestamp = new Date(snapshot.capturedAt).getTime();
      if (Number.isNaN(timestamp)) return null;

      return {
        capturedAt: snapshot.capturedAt,
        timestamp,
        lowestPrice: Number(metric.lowestPrice),
        averagePrice: Number(metric.averagePrice),
        stationCount: Number(metric.stationCount || 0),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.timestamp - right.timestamp);

  if (baseSeries.length === 0) return [];

  const rangeDays = getRangeDays(rangeCode);
  if (rangeDays === null) return baseSeries;

  const latestTimestamp = baseSeries[baseSeries.length - 1].timestamp;
  const cutoff = latestTimestamp - rangeDays * 24 * 60 * 60 * 1000;
  const filtered = baseSeries.filter((item) => item.timestamp >= cutoff);

  return filtered.length > 0 ? filtered : baseSeries.slice(-Math.min(baseSeries.length, 6));
}

function buildChart(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      yTicks: [],
      xLabels: [],
      lowestPolyline: '',
      averagePolyline: '',
      latestPoints: null,
    };
  }

  const values = series.flatMap((item) => [item.lowestPrice, item.averagePrice]).filter((value) => Number.isFinite(value));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minValue = Math.max(0, Math.floor((rawMin - 25) / 10) * 10);
  const maxValue = Math.ceil((rawMax + 25) / 10) * 10;
  const safeMaxValue = maxValue <= minValue ? minValue + 50 : maxValue;

  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const toX = (index) => {
    if (series.length === 1) return CHART_PADDING.left + plotWidth / 2;
    return CHART_PADDING.left + (plotWidth * index) / (series.length - 1);
  };

  const toY = (value) => {
    const ratio = (Number(value) - minValue) / (safeMaxValue - minValue || 1);
    return CHART_PADDING.top + plotHeight - (ratio * plotHeight);
  };

  const lowestPoints = series.map((item, index) => `${toX(index)},${toY(item.lowestPrice)}`).join(' ');
  const averagePoints = series.map((item, index) => `${toX(index)},${toY(item.averagePrice)}`).join(' ');
  const latest = series[series.length - 1];
  const latestIndex = series.length - 1;

  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const value = minValue + ((safeMaxValue - minValue) * index) / 3;
    const y = CHART_PADDING.top + plotHeight - (plotHeight * index) / 3;
    return {
      value: Math.round(value),
      y,
    };
  }).reverse();

  const labelIndexes = Array.from(new Set([
    0,
    Math.floor((series.length - 1) / 2),
    series.length - 1,
  ]));

  const xLabels = labelIndexes.map((index) => ({
    x: toX(index),
    label: formatChartLabel(series[index].capturedAt, 'axis'),
    rawLabel: series[index].capturedAt,
  }));

  return {
    yTicks,
    xLabels,
    lowestPolyline: lowestPoints,
    averagePolyline: averagePoints,
    latestPoints: {
      lowest: { x: toX(latestIndex), y: toY(latest.lowestPrice), value: latest.lowestPrice },
      average: { x: toX(latestIndex), y: toY(latest.averagePrice), value: latest.averagePrice },
    },
  };
}

export default function HistorySection({ historyPayload, dataset }) {
  const [rangeCode, setRangeCode] = useState('7d');

  const allSeries = useMemo(
    () => buildSeries(historyPayload, dataset, 'all'),
    [dataset, historyPayload],
  );
  const series = useMemo(
    () => buildSeries(historyPayload, dataset, rangeCode),
    [dataset, historyPayload, rangeCode],
  );
  const chart = useMemo(() => buildChart(series), [series]);
  const latest = series[series.length - 1] ?? null;
  const first = series[0] ?? null;
  const changeInRange = latest && first ? Number(latest.lowestPrice) - Number(first.lowestPrice) : null;
  const snapshotCount = allSeries.length;

  return (
    <section className="history-card" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <h2 id="history-title">가격 흐름 차트</h2>
          <p>
            {dataset
              ? `${dataset.regionName} · ${dataset.fuelName} · 조회 목록 기준 누적 차트`
              : '지역과 유종을 선택하면 차트를 확인할 수 있습니다.'}
          </p>
        </div>
        <div className="range-toggle" role="tablist" aria-label="차트 기간 선택">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.code}
              type="button"
              className={`range-toggle__button${rangeCode === option.code ? ' is-active' : ''}`}
              onClick={() => setRangeCode(option.code)}
              aria-selected={rangeCode === option.code}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="history-summary-grid" aria-label="차트 요약 정보">
        <article className="summary-card history-summary-card">
          <span className="summary-card__label">최근 최저가</span>
          <strong>{latest ? formatWon(latest.lowestPrice) : '데이터연동대기'}</strong>
          <small>{latest ? formatDate(latest.capturedAt) : '누적 데이터가 아직 없습니다.'}</small>
        </article>
        <article className="summary-card history-summary-card">
          <span className="summary-card__label">최근 목록 평균</span>
          <strong>{latest ? formatWon(latest.averagePrice) : '데이터연동대기'}</strong>
          <small>{latest ? `조회된 주유소 ${latest.stationCount}곳 기준` : '차트 데이터가 쌓이는 중입니다.'}</small>
        </article>
        <article className="summary-card history-summary-card">
          <span className="summary-card__label">기간 변동</span>
          <strong>{changeInRange !== null ? formatSignedWon(changeInRange) : '데이터연동대기'}</strong>
          <small>{rangeCode === '1d' ? '1일 기준' : rangeCode === '7d' ? '7일 기준' : '30일 기준'}</small>
        </article>
        <article className="summary-card history-summary-card">
          <span className="summary-card__label">누적 횟수</span>
          <strong>{snapshotCount > 0 ? `${snapshotCount}회` : '데이터연동대기'}</strong>
          <small>오전 6시 · 오후 6시 기준 누적</small>
        </article>
      </div>

      {dataset && series.length > 0 ? (
        <div className="history-chart-wrap">
          <div className="history-chart__legend" aria-hidden="true">
            <span className="history-chart__legend-item"><i className="history-chart__swatch is-lowest"></i> 최저가</span>
            <span className="history-chart__legend-item"><i className="history-chart__swatch is-average"></i> 목록 평균</span>
          </div>
          <svg className="history-chart" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="가격 흐름 차트">
            {chart.yTicks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={CHART_PADDING.left}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y1={tick.y}
                  y2={tick.y}
                  className="history-chart__grid"
                />
                <text x={CHART_PADDING.left - 10} y={tick.y + 4} textAnchor="end" className="history-chart__label">
                  {formatAxisLabel(tick.value)}
                </text>
              </g>
            ))}

            {chart.lowestPolyline && (
              <polyline className="history-chart__line is-lowest" points={chart.lowestPolyline} />
            )}
            {chart.averagePolyline && (
              <polyline className="history-chart__line is-average" points={chart.averagePolyline} />
            )}

            {chart.latestPoints && (
              <>
                <circle className="history-chart__point is-lowest" cx={chart.latestPoints.lowest.x} cy={chart.latestPoints.lowest.y} r="4.5" />
                <circle className="history-chart__point is-average" cx={chart.latestPoints.average.x} cy={chart.latestPoints.average.y} r="4.5" />
              </>
            )}

            {series.map((item, index) => {
              const x = series.length === 1
                ? (CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right) / 2 + CHART_PADDING.left
                : CHART_PADDING.left + ((CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right) * index) / (series.length - 1);
              return (
                <line
                  key={`${item.capturedAt}-${index}`}
                  x1={x}
                  x2={x}
                  y1={CHART_HEIGHT - CHART_PADDING.bottom}
                  y2={CHART_HEIGHT - CHART_PADDING.bottom + 6}
                  className="history-chart__tick"
                />
              );
            })}
          </svg>
          <div className="history-chart__axis">
            {series.length > 0 && (
              <>
                <span>{formatChartLabel(series[0].capturedAt, rangeCode)}</span>
                <span>{formatChartLabel(series[Math.floor((series.length - 1) / 2)].capturedAt, rangeCode)}</span>
                <span>{formatChartLabel(series[series.length - 1].capturedAt, rangeCode)}</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state history-empty-state">
          {dataset
            ? '차트 데이터가 아직 부족합니다. 오전 6시와 오후 6시에 데이터가 계속 누적되면 1일 · 7일 · 30일 흐름을 볼 수 있습니다.'
            : '지역과 유종을 선택하면 차트를 확인할 수 있습니다.'}
        </div>
      )}

      <p className="history-note">
        차트는 선택한 지역과 유종의 조회 목록 기준으로 누적됩니다.
        현재 위치 정보는 차트에 저장되지 않으며, 가격 수집 결과만 기록합니다.
      </p>
    </section>
  );
}
