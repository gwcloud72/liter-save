export interface DeviationBarDatum {
  name: string;
  value: number;
  tone?: "primary" | "up" | "down" | string;
}

interface DeviationBarChartProps {
  data: DeviationBarDatum[];
  average?: number;
  height?: number;
  unit?: string;
  limit?: number;
  axisLabel?: string;
  positiveLabel?: string;
  negativeLabel?: string;
  contextLabel?: string;
}

export interface DeviationRow extends DeviationBarDatum {
  deviation: number;
  deviationPct: number;
  absDeviationPct: number;
}

const upColor = "var(--color-up)";
const downColor = "var(--color-down)";
const primaryColor = "var(--color-ink-700)";

function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("ko-KR");
}

function pctLabel(value: number): string {
  if (!Number.isFinite(value)) return "0.0%";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`;
}

export function averageOf(data: DeviationBarDatum[]): number {
  const values = data
    .map((item) => Number(item.value))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildDeviationRows(
  data: DeviationBarDatum[],
  average = averageOf(data),
): DeviationRow[] {
  const baseline = Number.isFinite(average) && average > 0 ? average : averageOf(data);
  return data
    .filter((item) => Number.isFinite(Number(item.value)))
    .map((item) => {
      const value = Number(item.value);
      const deviation = value - baseline;
      const deviationPct = baseline ? (deviation / baseline) * 100 : 0;
      return {
        ...item,
        value,
        deviation,
        deviationPct,
        absDeviationPct: Math.abs(deviationPct),
      };
    });
}

export function DeviationBarChart({
  data,
  average,
  height = 260,
  unit = "",
  limit = 8,
  axisLabel = "평균 대비 편차",
  positiveLabel = "평균보다 비쌈",
  negativeLabel = "평균보다 쌈",
  contextLabel,
}: DeviationBarChartProps) {
  const rows = buildDeviationRows(data, average).slice(0, limit);
  const baseline = Number.isFinite(average ?? 0) && (average ?? 0) > 0 ? Number(average) : averageOf(rows);
  const width = 560;
  const labelWidth = 108;
  const valueWidth = 138;
  const chartWidth = width - labelWidth - valueWidth - 28;
  const halfWidth = chartWidth / 2 - 10;
  const centerX = labelWidth + chartWidth / 2;
  const axisHeight = 32;
  const rowHeight = rows.length
    ? Math.max(32, Math.floor((height - axisHeight - 18) / rows.length))
    : 32;
  const svgHeight = Math.max(height, rows.length * rowHeight + axisHeight + 22);
  const maxAbsPct = rows.length
    ? Math.max(...rows.map((row) => row.absDeviationPct), 0.1)
    : 1;
  const scalePct = Math.max(3, Math.ceil(maxAbsPct * 10) / 10);
  const values = rows.map((row) => row.value);
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : 0;
  const spread = Math.max(0, maxValue - minValue);
  const spreadPct = baseline ? (spread / baseline) * 100 : 0;
  const axisY = 18 + rows.length * rowHeight + 8;
  const smallDiffLabel =
    spreadPct > 0 && spreadPct < 3
      ? `지역 차 ${compactNumber(spread)}${unit} (${pctLabel(spreadPct).replace("+", "")}) · 큰 차이 아님`
      : null;

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="mb-ds-1 flex flex-wrap items-center justify-between gap-ds-1 text-caption text-ink-500">
        <span>{contextLabel ?? `기준 평균 ${compactNumber(baseline)}${unit}`}</span>
        <span className="inline-flex items-center gap-ds-1">
          <span className="rounded-full bg-down-bg px-ds-1.5 py-ds-0.5 font-bold text-down">
            {negativeLabel}
          </span>
          <span className="rounded-full bg-up-bg px-ds-1.5 py-ds-0.5 font-bold text-up">
            {positiveLabel}
          </span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${svgHeight}`}
        width="100%"
        height={svgHeight}
        role="img"
        aria-label={`${axisLabel} 막대 그래프`}
      >
        <text x={labelWidth} y="12" fontSize="11" fill="#6B7280" fontWeight="700">
          {axisLabel}
        </text>
        <line
          x1={centerX}
          y1="20"
          x2={centerX}
          y2={axisY + 5}
          stroke="var(--color-ink-300)"
          strokeWidth="1.5"
        />
        {rows.map((item, index) => {
          const rawWidth = (item.absDeviationPct / scalePct) * halfWidth;
          const barWidth = item.absDeviationPct > 0 ? Math.max(3, rawWidth) : 0;
          const isPositive = item.deviation > 0;
          const color = item.deviation === 0 ? primaryColor : isPositive ? upColor : downColor;
          const deviationBarX = isPositive ? centerX : centerX - barWidth;
          const deviationRowY = 22 + index * rowHeight;
          return (
            <g key={`${item.name}-${index}`}>
              <text x="0" y={deviationRowY + 17} fontSize="12" fill="#4B5563" fontWeight="700">
                {item.name}
              </text>
              <rect
                x={centerX - halfWidth}
                y={deviationRowY + 6}
                width={halfWidth * 2}
                height="12"
                rx="6"
                fill="var(--color-ink-100)"
              />
              <rect className={`v7-chart-bar v7-chart-delay-${Math.min(index, 8)}`} x={deviationBarX} y={deviationRowY + 6} width={barWidth} height="12" rx="6" fill={color} />
              <text
                x={isPositive ? deviationBarX + barWidth + 5 : deviationBarX - 5}
                y={deviationRowY + 16}
                textAnchor={isPositive ? "start" : "end"}
                fontSize="11"
                fill={color}
                fontWeight="800"
              >
                {pctLabel(item.deviationPct)}
              </text>
              <text
                x={labelWidth + chartWidth + 16}
                y={deviationRowY + 17}
                fontSize="12"
                fill="#111827"
                fontWeight="800"
              >
                {compactNumber(item.value)}{unit}
              </text>
            </g>
          );
        })}
        <line
          x1={centerX - halfWidth}
          y1={axisY}
          x2={centerX + halfWidth}
          y2={axisY}
          stroke="#D1D5DB"
          strokeWidth="1"
        />
        {[-scalePct, 0, scalePct].map((tick) => {
          const axisTickX = centerX + (tick / scalePct) * halfWidth;
          return (
            <g key={`tick-${tick}`}>
              <line x1={axisTickX} y1={axisY} x2={axisTickX} y2={axisY + 4} stroke="#D1D5DB" strokeWidth="1" />
              <text x={axisTickX} y={axisY + 19} textAnchor="middle" fontSize="11" fill="#6B7280">
                {pctLabel(tick)}
              </text>
            </g>
          );
        })}
      </svg>
      {smallDiffLabel ? (
        <p className="mt-ds-1 rounded-md bg-ink-50 px-ds-2 py-ds-1 text-caption font-bold text-ink-600">
          {smallDiffLabel}
        </p>
      ) : null}
    </div>
  );
}
