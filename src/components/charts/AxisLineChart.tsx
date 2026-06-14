import type { ChangeDirection } from '../common/types';

export interface AxisLineChartProps {
  values: number[];
  labels?: string[];
  direction?: ChangeDirection;
  height?: number;
  unit?: string;
  valueFormatter?: (value: number) => string;
}

const strokeByDirection: Record<ChangeDirection, string> = {
  up: '#E03131',
  down: '#1971C2',
  flat: '#12996A'
};

const defaultFormatter = (value: number, unit = ''): string => `${Math.round(value).toLocaleString('ko-KR')}${unit}`;

function niceStep(span: number): number {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const raw = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

function buildYScale(values: number[]) {
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const baseSpan = Math.max(maxValue - minValue, Math.max(1, Math.abs(maxValue) * 0.004));
  const step = niceStep(baseSpan);
  let yMin = Math.floor((minValue - step) / step) * step;
  let yMax = Math.ceil((maxValue + step) / step) * step;
  if (yMin === yMax) yMax += step;
  return { yMin, yMax, step };
}

export function AxisLineChart({ values, labels, direction = 'flat', height = 180, unit = '', valueFormatter }: AxisLineChartProps) {
  const safeValues = values.filter((value) => Number.isFinite(value));
  const points = safeValues.length ? safeValues : [0];
  const width = 560;
  const top = 18;
  const right = 72;
  const bottom = 40;
  const left = 24;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const { yMin, yMax } = buildYScale(points);
  const range = Math.max(1, yMax - yMin);
  const toX = (index: number) => left + (points.length > 1 ? (plotWidth * index) / (points.length - 1) : plotWidth / 2);
  const toY = (value: number) => top + plotHeight - ((value - yMin) / range) * plotHeight;
  const path = points.map((value, index) => `${index === 0 ? 'M' : 'L'}${toX(index).toFixed(2)},${toY(value).toFixed(2)}`).join(' ');
  const color = strokeByDirection[direction];
  const formatter = valueFormatter ?? ((value: number) => defaultFormatter(value, unit));
  const yTicks = [yMax, yMin];
  const xTicks = points.length <= 8
    ? points.map((_, index) => index)
    : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const xLabel = (index: number) => labels?.[index] ?? (index === points.length - 1 ? '현재' : `${points.length - index - 1}일 전`);
  const lastIndex = points.length - 1;
  const lastValue = points[lastIndex];
  const lastX = toX(lastIndex);
  const lastY = toY(lastValue);

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="현재값 중심 가격 흐름 그래프">
        {yTicks.map((tick, index) => {
          const y = toY(tick);
          return <g key={`y-${index}`}>
            <line x1={left} y1={y} x2={width - right} y2={y} stroke="#F1F3F5" strokeWidth="1" />
            <text x={width - right + 10} y={y + 4} textAnchor="start" fontSize="11" fill="#888888">{formatter(tick)}</text>
          </g>;
        })}
        <path d={path} fill="none" stroke={color} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((value, index) => {
          const visibleDot = points.length <= 14 || index === 0 || index === points.length - 1 || index % 10 === 0;
          return visibleDot ? <circle key={`p-${index}`} cx={toX(index)} cy={toY(value)} r={index === points.length - 1 ? 4 : 2.5} fill={color} stroke="#fff" strokeWidth="1.5" /> : null;
        })}
        <g>
          <rect x={Math.min(width - right - 86, lastX + 10)} y={Math.max(top, lastY - 14)} width="76" height="24" rx="12" fill="#FFFFFF" stroke="#EEEEEE" />
          <text x={Math.min(width - right - 48, lastX + 48)} y={Math.max(top + 16, lastY + 4)} textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{formatter(lastValue)}</text>
        </g>
        {xTicks.map((index) => <text key={`x-${index}`} x={toX(index)} y={height - 12} textAnchor="middle" fontSize="11" fill="#888888">{xLabel(index)}</text>)}
      </svg>
    </div>
  );
}
