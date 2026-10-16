# Calendrier éditorial — Spec

## Objectif
Planifier mes publications sur les réseaux sociaux sur un mois, et voir en un coup d'œil
ce qui est prévu, ce qui est prêt et ce qui est déjà publié.

## Utilisateur
Une personne qui gère des réseaux sociaux (community manager, étudiante en marketing, freelance).

## Une publication contient
| Champ   | Exemple                         | Obligatoire |
|---------|---------------------------------|-------------|
| Date    | 03/10/2026                      | oui         |
| Réseau  | Instagram, LinkedIn, TikTok, Facebook, X | oui |
| Sujet   | « Coulisses de l'équipe »       | oui         |
| Format  | Post, Story, Reel, Carrousel, Article | non   |
| Statut  | Idée → Rédigé → Publié          | oui (Idée par défaut) |

## Fonctionnalités
1. Ajouter une publication via un formulaire.
2. Voir le mois sous forme de calendrier : chaque publication apparaît dans son jour,
   avec une couleur par réseau.
3. Passer au mois précédent / suivant.
4. Changer le statut d'une publication (Idée → Rédigé → Publié).
5. Supprimer une publication.
6. Filtrer par réseau et par statut.
7. Compteurs du mois : nombre de publications par statut.
8. Sauvegarde automatique en ligne dans Supabase, avec une copie dans le navigateur.

## Hors périmètre
- Pas de compte utilisateur, pas de serveur à nous (la base est hébergée par Supabase).
- Pas d'API : on ne publie pas réellement sur les réseaux.

## Technique
- HTML + CSS + JavaScript, sans framework.
- Front : `public/index.html`, `public/style.css`, `public/script.js`.
- Serveur : `server.js` (Express) sert `public/` et expose l'API `/api/publications`, qui accède à Supabase avec la clé secrète lue dans `.env` (dotenv).
- Base : `supabase/schema.sql`.
- Sauvegarde : table `publications` dans Supabase (accès uniquement côté serveur via `@supabase/supabase-js`), avec `localStorage` comme copie de secours.
