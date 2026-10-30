"use client";

import { AlertTriangle, ArrowUpRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  DASHBOARD_PERIODS,
  DashboardError,
  fetchDashboard,
  formatValue,
  localized,
  type Dashboard as DashboardData,
  type DashboardKpi,
  type DashboardPeriod,
  type DashboardSection,
  type DashboardTable,
  type Tone,
} from "@/lib/dashboard";
import type { User } from "@/lib/auth";
import { useAppearance } from "./AppearanceProvider";
import { ChartView } from "./DashboardCharts";

const TONE_CLASS: Record<Exclude<Tone, null>, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-danger",
};

/**
 * The home page of the back office: one block per feature the account holds
 * (the server filters them and puts the ones of its profile first), over a
 * period the user picks.
 */
export function Dashboard({ token, user }: { token: string; user: User }) {
  const { tr, appearance } = useAppearance();
  const language = appearance.language;
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDashboard(token, period)
      .then(setData)
      .catch((caught) => setError(caught instanceof DashboardError ? caught.message : tr("Tableau de bord indisponible.")))
      .finally(() => setLoading(false));
  }, [token, period, tr]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const profile = data?.roles.map((role) => tr(role.label)).join(" · ");

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="page-title font-display text-2xl font-semibold text-ink">{tr("Tableau de bord")}</h1>
          <p className="text-sm text-ink-soft">
            {tr("Bonjour")} {user.name}
            {profile ? ` — ${profile}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1" role="group" aria-label={tr("Période")}>
            {DASHBOARD_PERIODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`rounded-sm border px-3 py-1 text-xs transition-colors ${period === value ? "border-gold text-gold" : "border-line text-ink hover:border-gold"}`}
              >
                {tr(label)}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title={tr("Actualiser")}
            aria-label={tr("Actualiser")}
            className="rounded-sm border border-line p-1.5 text-ink transition-colors hover:border-gold disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading && !data ? <p className="text-sm text-ink-soft">{tr("Chargement…")}</p> : null}

      {data && data.sections.length === 0 ? (
        <p className="rounded-sm border border-line bg-surface p-6 text-sm text-ink-soft shadow-card">
          {tr("Aucune fonctionnalité n'est activée pour votre compte : il n'y a rien à afficher ici.")}
        </p>
      ) : null}

      <div className={`grid gap-4 xl:grid-cols-2 ${loading && data ? "opacity-60 transition-opacity" : ""}`}>
        {data?.sections.map((section) => (
          <SectionCard key={section.key} section={section} language={language} />
        ))}
      </div>
    </div>
  );
}

function SectionCard({ section, language }: { section: DashboardSection; language: "fr" | "en" }) {
  const { tr } = useAppearance();
  const title = localized(section.title, section.title_en, language);

  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-sm bg-surface p-4 shadow-card border-b-4 border-b-gold">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-ink">{title}</h2>
        <Link href={section.link} className="inline-flex items-center gap-1 text-xs text-gold-bright underline-offset-4 hover:underline">
          {tr("Ouvrir")} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>

      {section.error ? (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden /> {tr("Ce bloc est momentanément indisponible.")}
        </p>
      ) : (
        <>
          {section.kpis.length > 0 ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {section.kpis.map((kpi) => (
                <Kpi key={kpi.key} kpi={kpi} language={language} />
              ))}
            </dl>
          ) : null}

          {section.charts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {section.charts.map((chart) => (
                <div key={chart.key} className="flex flex-col gap-2 rounded-sm border border-line p-3">
                  <h3 className="text-xs font-semibold text-ink-soft">{localized(chart.title, chart.title_en, language)}</h3>
                  <ChartView chart={chart} />
                </div>
              ))}
            </div>
          ) : null}

          {section.tables.map((table) => (
            <TableView key={table.key} table={table} language={language} />
          ))}
        </>
      )}
    </section>
  );
}

function Kpi({ kpi, language }: { kpi: DashboardKpi; language: "fr" | "en" }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-sm bg-bg px-3 py-2">
      <dt className="text-xs text-ink-soft">{localized(kpi.label, kpi.label_en, language)}</dt>
      <dd className={`text-lg font-semibold tabular-nums ${kpi.tone ? TONE_CLASS[kpi.tone] : "text-ink"}`}>{formatValue(kpi.value, kpi.format)}</dd>
    </div>
  );
}

function TableView({ table, language }: { table: DashboardTable; language: "fr" | "en" }) {
  const { tr } = useAppearance();

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-ink-soft">{localized(table.title, table.title_en, language)}</h3>
      {table.rows.length === 0 ? (
        <p className="text-xs text-ink-soft">{tr("Rien à signaler.")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                {table.columns.map((column, index) => (
                  <th key={index} scope="col" className="py-1.5 pr-3 font-medium">
                    {localized(column.label, column.label_en, language)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-line last:border-b-0">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={`py-1.5 pr-3 text-ink ${typeof cell === "number" ? "tabular-nums" : ""}`}>
                      {cell === null || cell === "" ? "—" : typeof cell === "number" ? formatValue(cell, "number") : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
