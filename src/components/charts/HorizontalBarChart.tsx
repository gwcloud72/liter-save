export interface HorizontalBarDatum {
  name: string;
  value: number;
  tone?: 'up' | 'down' | 'primary' | string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarDatum[];
  height?: number;
  unit?: string;
  limit?: number;
  axisLabel?: string;
}

const colorByTone: Record<string, string> = {
  up: '#E03131',
  down: '#1971C2',
  primary: '#0D7A4E',
};

function compactLabel(value: number, unit = ''): string {
  if (!Number.isFinite(value)) return `0${unit}`;
  return `${Math.round(value).toLocaleString('ko-KR')}${unit}`;
}

function niceStep(span: number): number {
  if (!Number.isFinite(span) || span <= 0) return 1;
  const raw = span / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

export function HorizontalBarChart({ data, height = 240, unit = '', limit = 8, axisLabel = '값' }: HorizontalBarChartProps) {
  const rows = data.filter((item) => Number.isFinite(Number(item.value))).slice(0, limit);
  const width = 520;
  const labelWidth = 104;
  const valueWidth = 78;
  const chartWidth = width - labelWidth - valueWidth - 24;
  const axisHeight = 26;
  const rowHeight = rows.length ? Math.max(30, Math.floor((height - axisHeight - 18) / rows.length)) : 30;
  const svgHeight = Math.max(height, rows.length * rowHeight + axisHeight + 20);
  const values = rows.map((item) => Math.abs(Number(item.value) || 0));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 1;
  const span = Math.max(maxValue - minValue, Math.max(1, maxValue * 0.006));
  const step = niceStep(span);
  const axisMin = Math.max(0, Math.floor((minValue - step) / step) * step);
  const axisMax = Math.ceil((maxValue + step) / step) * step;
  const range = Math.max(1, axisMax - axisMin);
  const ticks = [axisMin, axisMax];
  const toX = (value: number) => labelWidth + ((Math.abs(value) - axisMin) / range) * chartWidth;
  const barStart = labelWidth;
  const axisY = 14 + rows.length * rowHeight + 5;

  return (
    <div className="h-chart w-full min-w-0 overflow-hidden">
      <svg viewBox={`0 0 ${width} ${svgHeight}`} width="100%" height={svgHeight} role="img" aria-label="축 수치가 표시된 막대 그래프">
        <text x={labelWidth} y="11" fontSize="11" fill="#6B7280" fontWeight="600">{axisLabel}</text>
        {rows.map((item, index) => {
          const raw = Math.abs(Number(item.value) || 0);
          const barWidth = Math.max(6, toX(raw) - barStart);
          const y = 15 + index * rowHeight;
          const color = colorByTone[item.tone ?? 'primary'] ?? colorByTone.primary;
          return (
            <g key={`${item.name}-${index}`}>
              <text x="0" y={y + 17} fontSize="12" fill="#4B5563" fontWeight="600">{item.name}</text>
              <rect x={barStart} y={y + 6} width={chartWidth} height="12" rx="6" fill="#ECFDF5" />
              <rect x={barStart} y={y + 6} width={barWidth} height="12" rx="6" fill={color} />
              <text x={labelWidth + chartWidth + 12} y={y + 17} fontSize="12" fill="#111827" fontWeight="700">{compactLabel(item.value, unit)}</text>
            </g>
          );
        })}
        <line x1={labelWidth} y1={axisY} x2={labelWidth + chartWidth} y2={axisY} stroke="#D1D5DB" strokeWidth="1" />
        {ticks.map((tick, index) => {
          const x = toX(tick);
          return <g key={`axis-${index}`}>
            <line x1={x} y1={axisY} x2={x} y2={axisY + 4} stroke="#D1D5DB" strokeWidth="1" />
            <text x={x} y={axisY + 19} textAnchor="middle" fontSize="11" fill="#6B7280">{compactLabel(tick, unit)}</text>
          </g>;
        })}
      </svg>
    </div>
  );
}
