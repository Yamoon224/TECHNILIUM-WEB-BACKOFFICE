/** Role slugs mirroring backend/app/Modules/Identity/Domain/Role.php. */
export const VENDOR_ROLE = "vendeur_tiers";

/**
 * A vendor-only account sees the vendor space, not the staff navigation.
 * This only shapes the interface — the server enforces every permission.
 */
export function isVendorOnly(roles: readonly string[]): boolean {
  return roles.length > 0 && roles.every((role) => role === VENDOR_ROLE);
}
