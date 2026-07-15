import type { ChangeDirection } from '../common/types';

interface SparklineChartProps {
  values: number[];
  direction?: ChangeDirection;
  height?: number;
}

const strokeByDirection: Record<ChangeDirection, string> = {
  up: '#E03131',
  down: '#1971C2',
  flat: 'var(--color-ink-700)'
};

function formatAxis(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (Math.abs(value) >= 10000) return Math.round(value).toLocaleString('ko-KR');
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}

export function SparklineChart({ values, direction = 'flat', height = 48 }: SparklineChartProps) {
  const width = 168;
  const left = 34;
  const right = 6;
  const top = 5;
  const bottom = 14;
  const plotWidth = width - left - right;
  const plotHeight = Math.max(18, height - top - bottom);
  const points = values.filter((value) => Number.isFinite(value));
  const series = points.length ? points : [0];
  const minSeriesValue = Math.min(...series);
  const maxSeriesValue = Math.max(...series);
  const valueRange = Math.max(1, maxSeriesValue - minSeriesValue);
  const step = series.length > 1 ? plotWidth / (series.length - 1) : plotWidth;
  const toPointY = (value: number) => top + plotHeight - ((value - minSeriesValue) / valueRange) * plotHeight;
  const path = series.map((value, index) => {
    const pointX = left + Math.round(index * step * 100) / 100;
    const pointY = Math.round(toPointY(value) * 100) / 100;
    return `${index === 0 ? 'M' : 'L'}${pointX},${pointY}`;
  }).join(' ');
  const color = strokeByDirection[direction];
  const lastSeriesValue = series[series.length - 1];
  const lastX = left + (series.length > 1 ? plotWidth : 0);

  return (
    <div className="min-w-trend">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="X축과 Y축 수치가 포함된 가격 흐름 그래프">
        <line x1={left} y1={top} x2={left} y2={top + plotHeight} stroke="#D1D5DB" strokeWidth="1" />
        <line x1={left} y1={top + plotHeight} x2={left + plotWidth} y2={top + plotHeight} stroke="#D1D5DB" strokeWidth="1" />
        <line x1={left} y1={top} x2={left + plotWidth} y2={top} stroke="#EEF2F7" strokeWidth="1" />
        <text x={left - 4} y={top + 4} textAnchor="end" fontSize="9" fill="#6B6B6B">{formatAxis(maxSeriesValue)}</text>
        <text x={left - 4} y={top + plotHeight + 3} textAnchor="end" fontSize="9" fill="#6B6B6B">{formatAxis(minSeriesValue)}</text>
        <text x={left} y={height - 2} textAnchor="start" fontSize="9" fill="#6B6B6B">시작</text>
        <text x={left + plotWidth} y={height - 2} textAnchor="end" fontSize="9" fill="#6B6B6B">현재</text>
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.length ? <circle cx={lastX} cy={Math.round(toPointY(lastSeriesValue) * 100) / 100} r="2.5" fill={color} /> : null}
      </svg>
    </div>
  );
}
