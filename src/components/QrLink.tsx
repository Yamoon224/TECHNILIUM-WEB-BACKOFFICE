"use client";

import { QrCode } from "lucide-react";
import Link from "next/link";
import { createContext, useContext } from "react";
import type { QrKind } from "@/lib/qr";
import { useAppearance } from "./AppearanceProvider";

/** The features the signed-in account may use (set by the application shell); undefined = not known. */
export const AbilitiesContext = createContext<readonly string[] | undefined>(undefined);

/** Whether the account has a feature. While the list is unknown nothing is offered. */
export function useCan(ability: string): boolean {
  return useContext(AbilitiesContext)?.includes(ability) ?? false;
}

/**
 * The QR button of a row: opens the generator already filled in with this product, order, invoice or
 * supply. It is not drawn at all when the QR feature is not available to the account.
 */
export function QrLink({ kind, reference }: { kind: QrKind; reference: string }) {
  const { tr } = useAppearance();
  const allowed = useCan("generate-qrcodes");

  if (!allowed || !reference) return null;

  return (
    <Link
      href={`/qrcodes?type=${kind}&ref=${encodeURIComponent(reference)}`}
      onClick={(event) => event.stopPropagation()}
      title={tr("Code QR")}
      aria-label={`${tr("Code QR")} ${reference}`}
      className="inline-flex items-center gap-1 rounded-sm border border-line px-2 py-1 text-xs text-ink transition-colors hover:border-gold"
    >
      <QrCode className="h-3.5 w-3.5" aria-hidden /> QR
    </Link>
  );
}
