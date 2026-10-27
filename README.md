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
- `/commandes` — (voir aussi la ventilation par vendeur : chaque part a son statut et ses actions) liste des commandes, filtrable par statut, actions pour faire avancer le statut (confirmer/expédier/livrer/annuler). Réservé aux rôles `administrateur` et `operateur_commandes` côté API (403 pour les autres, y compris `vendeur_tiers`) — se connecter avec un autre rôle affichera une erreur sur cette page.
- `/factures` — factures et avoirs : liste, émission depuis un numéro de commande, avoir total avec motif, émission automatique à la confirmation de la commande (l'émission manuelle reste possible), téléchargement du PDF de chaque document (rôles `comptable` / `administrateur`).
- `/comptabilite` — balance générale (alerte si déséquilibrée) et écritures par journal, en lecture seule.
- `/reversements` — reversements vendeurs : calcul par vendeur (ventes livrées hors délai de retour, moins commission), relevé détaillé par commande, enregistrement du paiement avec référence, total restant dû.
- `/rapports` — section **Marge de Technilium** (ventes en propre livrées, HT, remises comprises, hors vendeurs tiers : CA, coût des ventes, marge, taux, détail par produit, alerte si un coût manque, export CSV) et tableau de bord direction sur une période au choix (CA, commandes, panier moyen, graphique des ventes par jour avec vue tableau, meilleurs produits, finance, retours, alertes), ventes par vendeur et export CSV. Réservé aux rôles `administrateur` et `comptable`.
- `/promotions` — codes promotionnels : création (pourcentage ou montant fixe, minimum, plafonds, dates), état (actif / programmé / expiré / épuisé), activation et désactivation. Réservé à `marketing` et `administrateur`. La remise apparaît aussi sur les factures et dans la liste des commandes.
- `/notifications` — journal des messages envoyés aux clients (événement, canal, destinataire, texte, statut, essais, erreur), filtre par statut ou commande, relance des envois en échec. Réservé à `support` et `administrateur`.
- `/audit` — journal d'audit des actions backoffice (utilisateur, action, résultat, IP, données envoyées avec secrets masqués), filtres (utilisateur, méthode, chemin, échecs seulement, période) et bouton **Vérifier l'intégrité** de la chaîne de signatures. Réservé à `administrateur`.
- `/support` — file des tickets clients : filtres (statut, en retard, mes tickets, non assignés, recherche), conversation dépliable avec réponse ou **note interne**, prise en charge, priorité, résolution / réouverture / clôture. Réservé à `support` et `administrateur`.
- `/avis` — modération des avis clients : les avis signalés (lien, e-mail, téléphone, mot interdit) en premier, publier / rejeter avec motif / retirer / rétablir. Réservé à `support`, `marketing` et `administrateur`.
- `/achats` — fournisseurs, bons de commande (création, envoi, réception contrôlée acceptés/refusés, frais d'approche), factures fournisseurs et règlements avec dettes échues, stock valorisé au coût moyen pondéré. Réservé à `responsable_achats` et `administrateur`.
- `/retours` — dossiers de retour (RMA) : ouverture sur une commande livrée, acceptation, réception, remboursement total ou partiel, refus motivé ; le remboursement émet un avoir partiel et réduit le reversement du vendeur.
- `/espace-vendeur` — espace du vendeur tiers (cloisonné côté API) : synthèse, ses commandes (ses lignes et sa part uniquement), relevés de reversement, gestion de ses offres (soumission, prix, stock, retrait). Un compte vendeur seul voit ce menu à la place du menu équipe.

## État d'avancement

Identity (connexion) et Orders (liste + changement de statut) sont câblés. Catalog (gestion produits/stocks), les vendeurs, la facturation et le reste suivront au fur et à mesure que les modules backend correspondants seront construits.
