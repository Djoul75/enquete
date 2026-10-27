# Enquête

Jeu d'enquête policière façon film noir, en solo ou en duel asynchrone.
Site statique (Vite + React) publié sur GitHub Pages, données dans Supabase.

- `src/` : le site
- `supabase/migrations/` : tables et fonctions `enquete_*` (toute la logique du jeu)
- `affaires/` : les affaires écrites à la main (JSON)
- `worker/` : tâche du VPS (écrit les nouvelles affaires avec Claude, envoie les notifications)
- `scripts/test-sql.mjs` : rejoue une partie complète sur un Postgres en mémoire
