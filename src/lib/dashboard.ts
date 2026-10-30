/**
 * Client-side access to the back-office home page (backend/app/Modules/Reporting,
 * GET /admin/dashboard). Every module supplies its own blocks in one generic
 * shape, so the page renders whatever comes back: a block added on the server
 * needs no work here.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type DashboardPeriod = "today" | "7d" | "30d" | "90d";

export const DASHBOARD_PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Aujourd'hui" },
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
];

export type ValueFormat = "number" | "money" | "percent";
export type Tone = "good" | "warn" | "bad" | null;

export interface DashboardKpi {
  key: string;
  label: string;
  label_en: string;
  value: number;
  format: ValueFormat;
  tone: Tone;
}

export interface DashboardChart {
  key: string;
  title: string;
  title_en: string;
  type: "bar" | "line" | "donut";
  format: ValueFormat;
  points: { label: string; label_en: string; value: number }[];
}

export interface DashboardTable {
  key: string;
  title: string;
  title_en: string;
  columns: { label: string; label_en: string }[];
  rows: (string | number | null)[][];
}

export interface DashboardSection {
  key: string;
  ability: string;
  title: string;
  title_en: string;
  /** Back-office page of the feature. */
  link: string;
  /** The block could not be computed. */
  error?: boolean;
  kpis: DashboardKpi[];
  charts: DashboardChart[];
  tables: DashboardTable[];
}

export interface Dashboard {
  period: { key: DashboardPeriod; from: string; to: string };
  roles: { slug: string; label: string }[];
  generated_at: string;
  sections: DashboardSection[];
}

export class DashboardError extends Error {}

export async function fetchDashboard(token: string, period: DashboardPeriod): Promise<Dashboard> {
  const response = await fetch(`${API_BASE_URL}/admin/dashboard?period=${period}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new DashboardError(`Erreur inattendue (${response.status}).`);
  return response.json() as Promise<Dashboard>;
}

/** The French or English wording of a bilingual field. */
export function localized(fr: string, en: string, language: "fr" | "en"): string {
  return language === "en" && en ? en : fr;
}

const NUMBER = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/** "118 000 F CFA", "12,5 %", "1 234". */
export function formatValue(value: number, format: ValueFormat): string {
  const text = NUMBER.format(value).replace(/[\u00a0\u202f]/g, " ");
  if (format === "money") return `${text} F CFA`;
  if (format === "percent") return `${text} %`;
  return text;
}

/** Shares of a donut, in percent, summing to 100 (the last slice takes the rounding). */
export function shares(values: readonly number[]): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0) return values.map(() => 0);

  return values.map((value) => (Math.max(0, value) * 100) / total);
}

/**
 * Points of a line / bars in a w × h box: x spread evenly, y scaled to the
 * highest value (zero at the bottom). A single point sits in the middle.
 */
export function scalePoints(values: readonly number[], width: number, height: number): { x: number; y: number }[] {
  const max = Math.max(0, ...values);

  return values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : (index * width) / (values.length - 1),
    y: max === 0 ? height : height - (Math.max(0, value) * height) / max,
  }));
}
