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
- `/commandes` — liste des commandes, filtrable par statut, actions pour faire avancer le statut (confirmer/expédier/livrer/annuler). Réservé aux rôles `administrateur` et `operateur_commandes` côté API (403 pour les autres, y compris `vendeur_tiers`) — se connecter avec un autre rôle affichera une erreur sur cette page.

## État d'avancement

Identity (connexion) et Orders (liste + changement de statut) sont câblés. Catalog (gestion produits/stocks), les vendeurs, la facturation et le reste suivront au fur et à mesure que les modules backend correspondants seront construits.
