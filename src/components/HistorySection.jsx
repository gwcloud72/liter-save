import { useEffect, useMemo, useState } from 'react';
import { formatDate, formatSignedWon, formatWon } from '../utils/format.js';

const RANGE_OPTIONS = [
  { code: '1d', label: '1일' },
  { code: '7d', label: '7일' },
  { code: '30d', label: '30일' },
];

const CHART_WIDTH = 800;
const CHART_HEIGHT = 320;
const CHART_PADDING = { top: 28, right: 24, bottom: 46, left: 70 };
const TICK_COUNT = 5;

function formatAxisLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return `${Math.round(number).toLocaleString('ko-KR')}`;
}

function formatChartLabel(value, rangeCode, detailed = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  if (rangeCode === '1d') {
    return new Intl.DateTimeFormat('ko-KR', detailed
      ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  return new Intl.DateTimeFormat('ko-KR', detailed
    ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { month: 'numeric', day: 'numeric' }).format(date);
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

function buildAxisIndexes(length, maxLabels) {
  if (length <= 0) return [];
  if (length <= maxLabels) return Array.from({ length }, (_, index) => index);

  const indexes = new Set([0, length - 1]);
  const step = (length - 1) / (maxLabels - 1);

  for (let index = 1; index < maxLabels - 1; index += 1) {
    indexes.add(Math.round(step * index));
  }

  return Array.from(indexes).sort((left, right) => left - right);
}

function buildChart(series, rangeCode) {
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  if (!Array.isArray(series) || series.length === 0) {
    return {
      yTicks: [],
      xLabels: [],
      points: [],
      lowestPolyline: '',
      averagePolyline: '',
      plotWidth,
      plotHeight,
      latestIndex: null,
    };
  }

  const values = series
    .flatMap((item) => [item.lowestPrice, item.averagePrice])
    .filter((value) => Number.isFinite(value));

  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minValue = Math.max(0, Math.floor((rawMin - 20) / 10) * 10);
  const maxValue = Math.ceil((rawMax + 20) / 10) * 10;
  const safeMaxValue = maxValue <= minValue ? minValue + 50 : maxValue;

  const toX = (index) => {
    if (series.length === 1) return CHART_PADDING.left + plotWidth / 2;
    return CHART_PADDING.left + (plotWidth * index) / (series.length - 1);
  };

  const toY = (value) => {
    const ratio = (Number(value) - minValue) / (safeMaxValue - minValue || 1);
    return CHART_PADDING.top + plotHeight - ratio * plotHeight;
  };

  const points = series.map((item, index) => ({
    ...item,
    x: toX(index),
    lowestY: toY(item.lowestPrice),
    averageY: toY(item.averagePrice),
    shortLabel: formatChartLabel(item.capturedAt, rangeCode),
    detailLabel: formatChartLabel(item.capturedAt, rangeCode, true),
  }));

  const lowestPolyline = points.map((point) => `${point.x},${point.lowestY}`).join(' ');
  const averagePolyline = points.map((point) => `${point.x},${point.averageY}`).join(' ');

  const yTicks = Array.from({ length: TICK_COUNT }, (_, index) => {
    const value = minValue + ((safeMaxValue - minValue) * index) / (TICK_COUNT - 1);
    const y = CHART_PADDING.top + plotHeight - (plotHeight * index) / (TICK_COUNT - 1);
    return { value: Math.round(value), y };
  }).reverse();

  const xLabelIndexes = buildAxisIndexes(points.length, rangeCode === '1d' ? 6 : 7);
  const xLabels = xLabelIndexes.map((index) => ({
    x: points[index].x,
    label: points[index].shortLabel,
  }));

  const hoverZones = points.map((point, index) => {
    const previousX = index > 0 ? points[index - 1].x : CHART_PADDING.left;
    const nextX = index < points.length - 1 ? points[index + 1].x : CHART_WIDTH - CHART_PADDING.right;
    const startX = index === 0 ? CHART_PADDING.left : (previousX + point.x) / 2;
    const endX = index === points.length - 1 ? CHART_WIDTH - CHART_PADDING.right : (point.x + nextX) / 2;
    return {
      x: startX,
      width: Math.max(24, endX - startX),
      index,
    };
  });

  return {
    yTicks,
    xLabels,
    points,
    hoverZones,
    lowestPolyline,
    averagePolyline,
    plotWidth,
    plotHeight,
    latestIndex: points.length - 1,
  };
}

function getTooltipPosition(point) {
  if (!point) return null;

  const boxWidth = 184;
  const boxHeight = 72;
  const wantsLeft = point.x > CHART_WIDTH - 220;
  const tooltipX = wantsLeft ? point.x - boxWidth - 14 : point.x + 14;
  const aboveY = Math.min(point.lowestY, point.averageY) - boxHeight - 14;
  const tooltipY = aboveY < CHART_PADDING.top ? Math.max(CHART_PADDING.top + 6, Math.max(point.lowestY, point.averageY) + 14) : aboveY;

  return {
    x: tooltipX,
    y: tooltipY,
    width: boxWidth,
    height: boxHeight,
  };
}

export default function HistorySection({ historyPayload, dataset }) {
  const [rangeCode, setRangeCode] = useState('7d');
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const allSeries = useMemo(
    () => buildSeries(historyPayload, dataset, 'all'),
    [dataset, historyPayload],
  );
  const series = useMemo(
    () => buildSeries(historyPayload, dataset, rangeCode),
    [dataset, historyPayload, rangeCode],
  );
  const chart = useMemo(() => buildChart(series, rangeCode), [series, rangeCode]);
  const latest = series[series.length - 1] ?? null;
  const first = series[0] ?? null;
  const changeInRange = latest && first ? Number(latest.lowestPrice) - Number(first.lowestPrice) : null;
  const snapshotCount = allSeries.length;

  useEffect(() => {
    setHoveredIndex(chart.latestIndex);
  }, [chart.latestIndex, rangeCode, dataset?.fuelCode, dataset?.regionCode]);

  const hoveredPoint = hoveredIndex !== null ? chart.points[hoveredIndex] ?? null : null;
  const tooltipPosition = getTooltipPosition(hoveredPoint);

  return (
    <section className="history-card" aria-labelledby="history-title">
      <div className="section-heading">
        <div>
          <h2 id="history-title">가격 흐름 그래프</h2>
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
            <span className="history-chart__legend-item is-helper">그래프 위에 커서를 올리면 해당 시점 금액을 확인할 수 있습니다.</span>
          </div>
          <svg
            className="history-chart"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label="가격 흐름 차트"
            onMouseLeave={() => setHoveredIndex(chart.latestIndex)}
          >
            <text x={CHART_PADDING.left} y={18} className="history-chart__title">가격 (원/ℓ)</text>

            {chart.yTicks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={CHART_PADDING.left}
                  x2={CHART_WIDTH - CHART_PADDING.right}
                  y1={tick.y}
                  y2={tick.y}
                  className="history-chart__grid"
                />
                <text x={CHART_PADDING.left - 12} y={tick.y + 4} textAnchor="end" className="history-chart__label">
                  {formatAxisLabel(tick.value)}
                </text>
              </g>
            ))}

            {hoveredPoint && (
              <rect
                x={chart.hoverZones[hoveredIndex]?.x ?? hoveredPoint.x - 18}
                y={CHART_PADDING.top}
                width={chart.hoverZones[hoveredIndex]?.width ?? 36}
                height={chart.plotHeight}
                className="history-chart__hover-band"
              />
            )}

            {hoveredPoint && (
              <line
                x1={hoveredPoint.x}
                x2={hoveredPoint.x}
                y1={CHART_PADDING.top}
                y2={CHART_HEIGHT - CHART_PADDING.bottom}
                className="history-chart__guide"
              />
            )}

            {chart.lowestPolyline && (
              <polyline className="history-chart__line is-lowest" points={chart.lowestPolyline} />
            )}
            {chart.averagePolyline && (
              <polyline className="history-chart__line is-average" points={chart.averagePolyline} />
            )}

            {chart.points.map((point, index) => (
              <g key={`${point.capturedAt}-${index}`}>
                <circle
                  className={`history-chart__point is-lowest${hoveredIndex === index ? ' is-hovered' : ''}`}
                  cx={point.x}
                  cy={point.lowestY}
                  r={hoveredIndex === index ? '5.5' : '4'}
                />
                <circle
                  className={`history-chart__point is-average${hoveredIndex === index ? ' is-hovered' : ''}`}
                  cx={point.x}
                  cy={point.averageY}
                  r={hoveredIndex === index ? '5.5' : '4'}
                />
              </g>
            ))}

            {chart.hoverZones.map((zone) => (
              <rect
                key={`zone-${zone.index}`}
                x={zone.x}
                y={CHART_PADDING.top}
                width={zone.width}
                height={chart.plotHeight}
                className="history-chart__hotspot"
                onMouseEnter={() => setHoveredIndex(zone.index)}
                onFocus={() => setHoveredIndex(zone.index)}
                onBlur={() => setHoveredIndex(chart.latestIndex)}
                tabIndex={0}
                aria-label={`${chart.points[zone.index].detailLabel} 가격 보기`}
              />
            ))}

            {tooltipPosition && hoveredPoint && (
              <g className="history-chart__tooltip-group" transform={`translate(${tooltipPosition.x}, ${tooltipPosition.y})`} pointerEvents="none">
                <rect className="history-chart__tooltip-box" width={tooltipPosition.width} height={tooltipPosition.height} rx="14" ry="14" />
                <text x="12" y="20" className="history-chart__tooltip-title">{hoveredPoint.detailLabel}</text>
                <text x="12" y="42" className="history-chart__tooltip-value is-lowest">최저가 {formatWon(hoveredPoint.lowestPrice)}</text>
                <text x="12" y="60" className="history-chart__tooltip-value is-average">목록 평균 {formatWon(hoveredPoint.averagePrice)}</text>
              </g>
            )}

            {chart.xLabels.map((label) => (
              <text
                key={`${label.x}-${label.label}`}
                x={label.x}
                y={CHART_HEIGHT - 12}
                textAnchor="middle"
                className="history-chart__x-label"
              >
                {label.label}
              </text>
            ))}
          </svg>
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
        현재 위치 정보는 차트에 저장되지 않으며, 그래프 위에 커서를 올리면 해당 시점 가격을 확인할 수 있습니다.
      </p>
    </section>
  );
}
