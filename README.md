# Technilium — Backoffice

Backoffice de gestion (équipe Technilium et vendeurs tiers) : catalogue, stocks, commandes, facturation, comptabilité, logistique, SAV.

Application NextJS **totalement autonome** : ses propres dépendances, son propre `src/components` et `src/lib`, rien d'importé depuis un autre dépôt. Même identité de marque que [TECHNILIUM-WEB-STORE](https://github.com/Yamoon224/TECHNILIUM-WEB-STORE) (palette noir/or extraite du logo), dupliquée à l'identique par choix — pas de package de design partagé.

Dépôts liés : [TECHNILIUM-BACKEND](https://github.com/Yamoon224/TECHNILIUM-BACKEND) (API) · [TECHNILIUM-WEB-STORE](https://github.com/Yamoon224/TECHNILIUM-WEB-STORE) (vitrine)

## Stack

- NextJS 16 (App Router), React 19, TypeScript strict
- Tailwind CSS v4
- Space Grotesk (titres) + IBM Plex Sans (texte courant)
- Vitest

## Démarrage rapide

Nécessite le backend [TECHNILIUM-BACKEND](https://github.com/Yamoon224/TECHNILIUM-BACKEND) démarré sur `http://localhost:8000`.

```bash
npm install
cp .env.example .env
npm run dev            # http://localhost:3001
```

Compte de démonstration (créé par le seed du backend) : `admin@technilium.app` / `password`.

## Qualité

```bash
npm run lint
npm run typecheck
npm run test
```

## Pages

- `/` — connexion (jeton Sanctum via l'API Identity) ; affiche le compte et les rôles une fois connecté, avec déconnexion.

## État d'avancement

Seule la connexion est implémentée pour l'instant — le backend ne couvre encore que les modules Identity et Catalog. Le tableau de bord, la gestion des commandes/stocks/vendeurs suivront au fur et à mesure que les modules backend correspondants seront construits.
