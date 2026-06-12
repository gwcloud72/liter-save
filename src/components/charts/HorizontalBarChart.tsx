export interface HorizontalBarDatum {
  name: string;
  value: number;
  tone?: 'up' | 'down' | 'primary' | string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarDatum[];
  height?: number;
}

const colorByTone: Record<string, string> = {
  up: '#E03131',
  down: '#1971C2',
  primary: '#0D7A4E',
};

function compactLabel(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : '0';
}

export function HorizontalBarChart({ data, height = 220 }: HorizontalBarChartProps) {
  const rows = data.slice(0, 8);
  const width = 420;
  const labelWidth = 92;
  const valueWidth = 48;
  const chartWidth = width - labelWidth - valueWidth - 18;
  const rowHeight = rows.length ? Math.max(26, Math.floor((height - 16) / rows.length)) : 28;
  const svgHeight = Math.max(height, rows.length * rowHeight + 16);
  const max = Math.max(1, ...rows.map((item) => Math.abs(Number(item.value) || 0)));

  return (
    <div className="h-chart w-full">
      <svg viewBox={`0 0 ${width} ${svgHeight}`} width="100%" height={svgHeight} role="img" aria-label="막대 그래프">
        {rows.map((item, index) => {
          const raw = Math.abs(Number(item.value) || 0);
          const barWidth = Math.max(8, Math.round((raw / max) * chartWidth));
          const y = 12 + index * rowHeight;
          const color = colorByTone[item.tone ?? 'primary'] ?? colorByTone.primary;
          return (
            <g key={`${item.name}-${index}`}>
              <text x="0" y={y + 15} fontSize="12" fill="#4B5563" fontWeight="600">{item.name}</text>
              <rect x={labelWidth} y={y + 4} width={chartWidth} height="12" rx="6" fill="#ECFDF5" />
              <rect x={labelWidth} y={y + 4} width={barWidth} height="12" rx="6" fill={color} />
              <text x={labelWidth + chartWidth + 10} y={y + 15} fontSize="12" fill="#111827" fontWeight="700">{compactLabel(item.value)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
