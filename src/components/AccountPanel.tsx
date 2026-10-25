import type { User } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
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

export function AccountPanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-sm border border-line bg-surface p-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-ink-soft">Connecté</p>
        <h1 className="text-lg font-medium text-ink">{user.name}</h1>
        {user.email ? <p className="text-sm text-ink-soft">{user.email}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {user.roles.map((role) => (
          <span
            key={role}
            className="rounded-full border border-gold-deep px-3 py-1 text-xs text-gold-bright"
          >
            {ROLE_LABEL[role] ?? role}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="rounded-sm border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-gold"
      >
        Se déconnecter
      </button>
    </div>
  );
}
