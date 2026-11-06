# Agence Noire

Anciennement « Enquête ».

Jeu d'enquête policière façon film noir, en solo ou en duel asynchrone.
Site statique (Vite + React) publié sur GitHub Pages, données dans Supabase.

- `src/` : le site
- `supabase/migrations/` : tables et fonctions `enquete_*` (toute la logique du jeu)
- `affaires/v2/` : les affaires de la règle de la nuit (JSON, hors du dépôt) ; `affaires/*.json` : l'ancienne règle, pour l'historique
- `worker/` : tâche du VPS (écrit les nouvelles affaires avec Claude, envoie les notifications)
- `scripts/test-sql.mjs` : rejoue une nuit complète sur un Postgres en mémoire
- `scripts/captures-nuit.mjs` : captures d'écran d'une nuit, sans toucher à Supabase

## La règle de la nuit

Le joueur arrive à l'heure du crime ; l'enquête s'arrête environ quatre heures plus tard (l'aube, ou ce que l'affaire prévoit : un train qui arrive, un bateau qui part). Une question coûte 10 min, une relance 5, montrer une pièce 5, une fouille 30. Les interrogatoires sont en arbre (ouvertures, relances, pistes). Chaque suspect a une patience de 2 ou 3 crans (la cigarette) : une question qui fâche en coûte un, à zéro il se braque ; une vraie preuve montrée le fait craquer, une fois. Des événements à heure fixe font partir un suspect ou vident un lieu. Le dossier (coupable, mobile, occasion, preuve) donne un verdict : condamné, relâché faute de preuves, erreur judiciaire. À plusieurs, le meilleur verdict gagne, puis le dossier signé le plus tôt dans la nuit. Tout l'état se recalcule en rejouant le journal (`enquete_nuit`).
