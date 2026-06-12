import type { ChangeDirection } from '../common/types';

interface SparklineChartProps {
  values: number[];
  direction?: ChangeDirection;
  height?: number;
}

const strokeByDirection: Record<ChangeDirection, string> = {
  up: '#E03131',
  down: '#1971C2',
  flat: '#12996A'
};

function buildPath(values: number[], width: number, height: number): string {
  const points = values.length ? values : [0];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  return points.map((value, index) => {
    const x = Math.round(index * step * 100) / 100;
    const y = Math.round((height - ((value - min) / range) * (height - 6) - 3) * 100) / 100;
    return `${index === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
}

export function SparklineChart({ values, direction = 'flat', height = 36 }: SparklineChartProps) {
  const width = 120;
  const path = buildPath(values, width, height);
  const color = strokeByDirection[direction];
  const last = values.length ? values[values.length - 1] : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  return (
    <div className="min-w-trend">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="가격 흐름 그래프">
        <line x1="0" y1={height - 3} x2={width} y2={height - 3} stroke="#E5E7EB" strokeWidth="1" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {values.length ? <circle cx={width} cy={Math.round((height - ((last - min) / Math.max(1, max - min)) * (height - 6) - 3) * 100) / 100} r="2.5" fill={color} /> : null}
      </svg>
    </div>
  );
}
