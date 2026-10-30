/**
 * Centralized money formatting/conversion - the single place rounding rules live
 * (cahier des charges §11). Amounts always travel as integers in the currency's
 * smallest unit, mirroring the backend's Money value object.
 */

export type CurrencyCode = "XOF" | "XAF" | "EUR" | "USD" | "GHS" | "NGN";

interface CurrencyMeta {
  /** Number of minor units per major unit (e.g. 100 for cents, 1 for XOF). */
  minorUnits: number;
  locale: string;
}

const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  XOF: { minorUnits: 1, locale: "fr-FR" },
  XAF: { minorUnits: 1, locale: "fr-FR" },
  EUR: { minorUnits: 100, locale: "fr-FR" },
  USD: { minorUnits: 100, locale: "en-US" },
  GHS: { minorUnits: 100, locale: "en-GH" },
  NGN: { minorUnits: 100, locale: "en-NG" },
};

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

function meta(currency: CurrencyCode): CurrencyMeta {
  const found = CURRENCIES[currency];
  if (!found) {
    throw new Error(`Unknown currency: ${currency}`);
  }
  return found;
}

/** Converts the smallest-unit integer amount to its major-unit decimal value. */
export function toMajorUnits(money: Money): number {
  return money.amount / meta(money.currency).minorUnits;
}

/** Formats a Money value for display, e.g. "12 500 F CFA" or "€ 49,90". */
export function formatMoney(money: Money): string {
  const { locale } = meta(money.currency);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currency,
    minimumFractionDigits: meta(money.currency).minorUnits === 1 ? 0 : 2,
    maximumFractionDigits: meta(money.currency).minorUnits === 1 ? 0 : 2,
  }).format(toMajorUnits(money));
}

/** Adds two Money values of the same currency. Throws on currency mismatch. */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} / ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function zeroMoney(currency: CurrencyCode): Money {
  return { amount: 0, currency };
}
