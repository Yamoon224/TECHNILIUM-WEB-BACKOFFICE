"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "./LogoMark";

const LINKS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/commandes", label: "Commandes" },
  { href: "/categories", label: "Catégories" },
  { href: "/produits", label: "Produits" },
  { href: "/offres", label: "Modération" },
  { href: "/vendeurs", label: "Vendeurs" },
  { href: "/stock", label: "Stock" },
];

export function BackofficeNav({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();

  return (
    <header className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/">
        <LogoMark />
      </Link>

      <nav className="flex items-center gap-4">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors ${
              pathname === link.href ? "text-gold" : "text-ink-soft hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={onLogout}
          className="rounded-sm border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-gold"
        >
          Se déconnecter
        </button>
      </nav>
    </header>
  );
}
