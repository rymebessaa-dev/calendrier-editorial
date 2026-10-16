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

Le serveur (Express) sert les fichiers du dossier `public/` et expose une API (`/api/auth/…`
pour les comptes, `/api/publications` pour les données) qui s'appuie sur Supabase. La configuration est lue dans `.env` (chargé avec dotenv), qui n'est pas versionné.

## Avancement
- [x] Lot 0 : squelette
- [x] Lot 1 : ajout de publications
- [x] Lot 2 : vue calendrier
- [x] Lot 3 : statuts, suppression, filtres
- [x] Lot 4 : sauvegarde et design

## Comptes et sauvegarde (Supabase)
Chaque utilisateur crée un compte avec son email et un mot de passe (Supabase Auth),
puis retrouve ses publications sur tous ses appareils. Personne d'autre ne peut les voir.

Mise en place :
1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécuter le contenu de [supabase/schema.sql](supabase/schema.sql).
3. Dans **Project Settings → API Keys**, copier la clé *publishable* (`sb_publishable_…`),
   puis la coller dans `.env` avec l'URL du projet (`SUPABASE_URL` et `SUPABASE_PUBLISHABLE_KEY`).
4. Dans **Authentication → URL Configuration** :
   - *Site URL* : l'adresse du site (ex. `http://localhost:3000`) ;
   - *Redirect URLs* : ajouter `http://localhost:3000/auth/callback`
     (et l'adresse en ligne, ex. `https://mon-site.replit.app/auth/callback`).

Fonctionnement :
- Le navigateur ne parle jamais directement à Supabase : il passe par l'API du serveur.
- La session est stockée dans un cookie `httpOnly` géré par `@supabase/ssr`.
- La sécurité repose sur la *Row Level Security* : chaque requête est faite au nom de
  l'utilisateur connecté, et la base n'accepte que ses propres lignes.
- Par défaut, Supabase demande de confirmer l'email via un lien avant la première connexion
  (désactivable dans **Authentication → Sign In / Providers → Email**).
- Les publications enregistrées dans le navigateur avant l'ajout des comptes sont importées
  dans le premier compte qui se connecte sur ce navigateur.
