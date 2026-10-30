"use client";

import { formatValue, localized, scalePoints, shares, type DashboardChart } from "@/lib/dashboard";
import { useAppearance } from "./AppearanceProvider";

/** Slice colours: the configured main colour first, then fixed, distinguishable hues. */
const PALETTE = ["var(--gold)", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#f59e0b", "#64748b"];

const W = 300;
const H = 90;

export function ChartView({ chart }: { chart: DashboardChart }) {
  const { appearance } = useAppearance();
  const language = appearance.language;

  if (chart.points.length === 0 || chart.points.every((point) => point.value === 0)) {
    return <p className="py-6 text-center text-xs text-ink-soft">—</p>;
  }

  const values = chart.points.map((point) => point.value);
  const labels = chart.points.map((point) => localized(point.label, point.label_en, language));

  if (chart.type === "donut") return <Donut values={values} labels={labels} format={chart.format} />;
  return <Series type={chart.type} values={values} labels={labels} format={chart.format} />;
}

function Series({ type, values, labels, format }: { type: "bar" | "line"; values: number[]; labels: string[]; format: DashboardChart["format"] }) {
  const points = scalePoints(values, W, H);
  const max = Math.max(...values);
  const step = W / values.length;
  const barWidth = Math.max(2, step * 0.7);
  const summary = labels.map((label, index) => `${label}: ${formatValue(values[index], format)}`).join(", ");

  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H + 4}`} role="img" aria-label={summary} className="h-24 w-full overflow-visible" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line key={ratio} x1={0} x2={W} y1={H * ratio} y2={H * ratio} stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {type === "bar" ? (
          values.map((value, index) => {
            const height = max === 0 ? 0 : (value * H) / max;
            return (
              <rect key={index} x={index * step + (step - barWidth) / 2} y={H - height} width={barWidth} height={height} rx={1.5} fill="var(--gold)">
                <title>{`${labels[index]}: ${formatValue(value, format)}`}</title>
              </rect>
            );
          })
        ) : (
          <>
            <polygon points={`0,${H} ${points.map((p) => `${p.x},${p.y}`).join(" ")} ${W},${H}`} fill="var(--gold)" opacity={0.15} />
            <polyline points={points.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {points.map((p, index) => (
              <circle key={index} cx={p.x} cy={p.y} r={5} fill="transparent">
                <title>{`${labels[index]}: ${formatValue(values[index], format)}`}</title>
              </circle>
            ))}
          </>
        )}
      </svg>
      <figcaption className="flex justify-between text-[10px] text-ink-soft">
        <span>{labels[0]}</span>
        <span>{labels.length > 2 ? labels[Math.floor(labels.length / 2)] : ""}</span>
        <span>{labels[labels.length - 1]}</span>
      </figcaption>
    </figure>
  );
}

function Donut({ values, labels, format }: { values: number[]; labels: string[]; format: DashboardChart["format"] }) {
  const parts = shares(values);
  const radius = 15.9155; // circumference 100: a slice's length is its percentage
  // Each slice starts where the previous one ended; the first at 12 o'clock.
  const starts = parts.map((_, index) => 25 - parts.slice(0, index).reduce((sum, part) => sum + part, 0));
  const summary = labels.map((label, index) => `${label}: ${formatValue(values[index], format)}`).join(", ");

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 42 42" role="img" aria-label={summary} className="h-24 w-24 shrink-0">
        <circle cx={21} cy={21} r={radius} fill="none" stroke="var(--line)" strokeWidth={5} />
        {parts.map((part, index) => (
          <circle
            key={index}
            cx={21}
            cy={21}
            r={radius}
            fill="none"
            stroke={PALETTE[index % PALETTE.length]}
            strokeWidth={5}
            strokeDasharray={`${part} ${100 - part}`}
            strokeDashoffset={starts[index]}
          >
            <title>{`${labels[index]}: ${formatValue(values[index], format)}`}</title>
          </circle>
        ))}
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
        {labels.map((label, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[index % PALETTE.length] }} aria-hidden />
            <span className="truncate text-ink-soft">{label}</span>
            <span className="ml-auto font-medium tabular-nums text-ink">{formatValue(values[index], format)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
