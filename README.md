# 📅 Calendrier éditorial

Petit outil web pour planifier ses publications sur les réseaux sociaux
(Instagram, LinkedIn, TikTok…) sur un mois.

Projet réalisé dans le cadre du MBA Marketing Digital, IA & Automatisation (.decode).

- Spécifications : [SPEC.md](SPEC.md)
- Découpage en lots : [LOTS.md](LOTS.md)

## Lancer le projet
Prérequis : [Node.js](https://nodejs.org).

```bash
npm install
cp .env.example .env   # puis remplir les valeurs Supabase
npm start
```

Ouvrir ensuite http://localhost:3000.

Le serveur (Express) sert les fichiers du dossier `public/` et expose une API (`/api/publications`)
qui lit et écrit dans Supabase. La configuration est lue dans `.env` (chargé avec dotenv), qui n'est pas versionné.

## Avancement
- [x] Lot 0 : squelette
- [x] Lot 1 : ajout de publications
- [x] Lot 2 : vue calendrier
- [x] Lot 3 : statuts, suppression, filtres
- [x] Lot 4 : sauvegarde et design

## Sauvegarde en ligne (Supabase)
Les publications sont enregistrées dans une base Supabase : on les retrouve sur tous les appareils.
Une copie est aussi gardée dans le navigateur (`localStorage`) au cas où Supabase ne répond pas.

Mise en place :
1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécuter le contenu de [supabase/schema.sql](supabase/schema.sql).
3. Dans **Project Settings → API Keys**, créer une clé *secret* (`sb_secret_…`),
   puis la coller dans `.env` avec l'URL du projet (`SUPABASE_URL` et `SUPABASE_SECRET_KEY`).

La clé secrète reste sur le serveur : le navigateur ne parle jamais directement à Supabase.

Si ces valeurs sont absentes, l'application fonctionne comme avant, uniquement dans le navigateur.
Les publications déjà présentes dans le navigateur sont envoyées sur Supabase à la première connexion.

⚠️ Il n'y a pas de compte utilisateur : toute personne qui a accès au site peut lire et modifier les publications via l'API.
