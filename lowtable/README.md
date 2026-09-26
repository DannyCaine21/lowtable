# Lowtable

Déjeuners et dîners low carb pour deux : tirage hebdomadaire orienté batch cooking, swipe du repas du jour, liste de courses par rayon. PWA installable sur iPhone et Android, données partagées entre les membres du foyer.

## Architecture

- **Front** : `index.html` + `config.js` (page statique, aucun build), hébergée sur GitHub Pages. `manifest.webmanifest` + `sw.js` la rendent installable et consultable hors ligne.
- **Données** : Supabase (Postgres). Schéma, sécurité (RLS) et 30 recettes de départ dans `supabase/schema.sql`.
- **Accès** : connexion par lien magique (email). Seuls les emails présents dans la table `household_members` peuvent lire et écrire.
- **Agents** : la base est une API ouverte (PostgREST). N'importe quel agent autorisé peut lire `recipes`/`plans` et écrire un plan de semaine — le tirage n'est pas enfermé dans l'app.

## Modèle de données

- `recipes` : `id`, `name`, `protein` (poulet|dinde|boeuf|porc|poisson|oeufs|vege|agneau), `time_min`, `meals` (repas pour 2 produits par le batch : 1-3), `carbs`/`prot`/`kcal` par portion (indicatifs), `tags[]`, `ingredients` (jsonb `[{name, qty, unit, rayon}]`, quantités pour tout le batch), `steps[]`, `active`.
- `plans` : `week` (clé ISO `YYYY-Www`), `slots` (jsonb `{"d-kind": {id, leftoverOf?, status?}}` avec `d` 0=dimanche…6=samedi, `kind` lunch|dinner), `locked`, `checked` (cases de la liste de courses).

## Règles de tirage

La semaine commence le dimanche (jour batch). Deux dîners « grand batch » (3 repas) le dimanche et le mercredi ; un dîner à 2-3 repas nourrit les déjeuners suivants ; pas la même protéine deux dîners de suite ; pas de recette cuisinée dans les 3 semaines précédentes ; glucides nets ≤ 30 g/portion.

## Installation

1. Supabase → SQL Editor : coller `supabase/schema.sql` (remplacer les deux emails du foyer) → Run.
2. Supabase → Authentication → URL Configuration : Site URL = l'URL GitHub Pages de l'app ; l'ajouter aussi aux Redirect URLs.
3. Ouvrir l'app, entrer son email, cliquer le lien reçu. Sur téléphone : « Ajouter à l'écran d'accueil ».
