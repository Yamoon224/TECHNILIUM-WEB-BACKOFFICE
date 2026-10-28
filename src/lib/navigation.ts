import {
  BadgeEuro,
  BarChart3,
  Boxes,
  Calculator,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Tags,
  Truck,
  Undo2,
  Wallet,
  Bell,
  LifeBuoy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { MessageKey } from "./i18n";
import { isVendorOnly } from "./roles";

export interface NavItem {
  href: string;
  label: MessageKey;
  Icon: LucideIcon;
}

export interface NavGroup {
  label: MessageKey;
  items: NavItem[];
}

/**
 * The staff menu. Like before, this only shapes the interface: the API
 * enforces who may do what.
 */
export const STAFF_NAV: NavGroup[] = [
  { label: "nav.general", items: [{ href: "/", label: "nav.dashboard", Icon: LayoutDashboard }] },
  {
    label: "nav.sales",
    items: [
      { href: "/commandes", label: "nav.orders", Icon: ShoppingCart },
      { href: "/paiements", label: "nav.payments", Icon: Wallet },
      { href: "/livraisons", label: "nav.shipping", Icon: Truck },
      { href: "/factures", label: "nav.invoices", Icon: FileText },
      { href: "/retours", label: "nav.returns", Icon: Undo2 },
      { href: "/promotions", label: "nav.promotions", Icon: Tag },
    ],
  },
  {
    label: "nav.catalog",
    items: [
      { href: "/categories", label: "nav.categories", Icon: Tags },
      { href: "/produits", label: "nav.products", Icon: Package },
      { href: "/offres", label: "nav.moderation", Icon: PackageCheck },
      { href: "/stock", label: "nav.stock", Icon: Boxes },
      { href: "/vendeurs", label: "nav.vendors", Icon: Store },
    ],
  },
  {
    label: "nav.finance",
    items: [
      { href: "/achats", label: "nav.purchases", Icon: ShoppingBag },
      { href: "/comptabilite", label: "nav.accounting", Icon: Calculator },
      { href: "/reversements", label: "nav.payouts", Icon: BadgeEuro },
    ],
  },
  {
    label: "nav.customers",
    items: [
      { href: "/support", label: "nav.support", Icon: LifeBuoy },
      { href: "/avis", label: "nav.reviews", Icon: Star },
      { href: "/notifications", label: "nav.notifications", Icon: MessageSquare },
    ],
  },
  {
    label: "nav.insight",
    items: [
      { href: "/rapports", label: "nav.reports", Icon: BarChart3 },
      { href: "/audit", label: "nav.audit", Icon: ShieldCheck },
    ],
  },
];

export const VENDOR_NAV: NavGroup[] = [
  { label: "nav.general", items: [{ href: "/espace-vendeur", label: "nav.vendorSpace", Icon: UserRound }] },
];

/** Shortcuts of the top bar: the pages used all day. */
export const SHORTCUTS: NavItem[] = [
  { href: "/", label: "nav.dashboard", Icon: LayoutDashboard },
  { href: "/commandes", label: "nav.orders", Icon: ShoppingCart },
  { href: "/produits", label: "nav.products", Icon: Package },
  { href: "/stock", label: "nav.stock", Icon: Boxes },
  { href: "/factures", label: "nav.invoices", Icon: ReceiptText },
];

export const BELL_ICON = Bell;

export function navFor(roles: readonly string[]): NavGroup[] {
  return isVendorOnly(roles) ? VENDOR_NAV : STAFF_NAV;
}

/** The shortcuts a user can see: a vendor-only account has no staff pages. */
export function shortcutsFor(roles: readonly string[]): NavItem[] {
  return isVendorOnly(roles) ? VENDOR_NAV[0].items : SHORTCUTS;
}

/** Whether a menu entry is the current page ("/" only matches exactly). */
export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
