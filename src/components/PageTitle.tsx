"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { STAFF_NAV, VENDOR_NAV, isActive } from "@/lib/navigation";
import { pageTitle } from "@/lib/pageTitle";
import { useAppearance } from "./AppearanceProvider";

/** Keeps the browser tab's title in the interface language, naming the current page. Draws nothing. */
export function PageTitle() {
  const pathname = usePathname();
  const { t, appearance } = useAppearance();

  useEffect(() => {
    const items = [...STAFF_NAV, ...VENDOR_NAV].flatMap((group) => group.items);
    // Longest href first, so "/espace-vendeur" is not mistaken for a shorter prefix.
    const current = [...items].sort((a, b) => b.href.length - a.href.length).find((item) => isActive(item.href, pathname));

    document.title = pageTitle(current ? t(current.label) : null);
  }, [pathname, t, appearance.language]);

  return null;
}
