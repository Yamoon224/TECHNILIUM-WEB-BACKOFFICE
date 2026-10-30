/** Role slugs mirroring backend/app/Modules/Identity/Domain/Role.php. */
export const VENDOR_ROLE = "vendeur_tiers";

/**
 * A vendor-only account sees the vendor space, not the staff navigation.
 * This only shapes the interface - the server enforces every permission.
 */
export function isVendorOnly(roles: readonly string[]): boolean {
  return roles.length > 0 && roles.every((role) => role === VENDOR_ROLE);
}

/** Display names of the role slugs. */
export const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super administrateur",
  administrateur: "Administrateur",
  gestionnaire_catalogue: "Gestionnaire catalogue",
  gestionnaire_stock: "Gestionnaire de stock",
  operateur_commandes: "Opérateur commandes",
  vendeur_interne: "Vendeur interne",
  responsable_achats: "Responsable achats",
  comptable: "Comptable",
  logistique: "Logistique",
  support: "Support",
  marketing: "Marketing",
  vendeur_tiers: "Vendeur tiers",
  client: "Client",
};
