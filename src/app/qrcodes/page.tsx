"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QrGenerator } from "@/components/QrGenerator";
import { useAppearance } from "@/components/AppearanceProvider";
import { QR_KINDS, type QrKind } from "@/lib/qr";
import { useAuth } from "@/lib/useAuth";

function QrCodesContent() {
  const { tr } = useAppearance();
  const { status, token } = useAuth();
  const params = useSearchParams();

  // A button elsewhere can open this page already filled in: /qrcodes?type=order&ref=TCH-…
  const kind = QR_KINDS.find((item) => item.value === params.get("type"))?.value as QrKind | undefined;
  const reference = params.get("ref") ?? "";

  if (status === "checking") {
    return <p className="px-4 py-16 text-center text-sm text-ink-soft">{tr("Vérification de la session…")}</p>;
  }

  if (!token) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-ink-soft">{tr("Connectez-vous pour générer des codes QR.")}</p>
        <Link href="/" className="text-sm text-gold underline-offset-4 hover:underline">
          {tr("Se connecter")}
        </Link>
      </main>
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="page-title font-display text-2xl font-semibold text-ink">{tr("Codes QR")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          {tr("Un code QR identifie un produit, une commande, une facture ou un approvisionnement : collez-le sur un colis, une étagère ou un document.")}
        </p>
      </div>

      <QrGenerator token={token} initialKind={kind ?? "order"} initialReference={reference} autoGenerate={Boolean(kind && reference)} />
    </main>
  );
}

export default function QrCodesPage() {
  return (
    <Suspense fallback={null}>
      <QrCodesContent />
    </Suspense>
  );
}
