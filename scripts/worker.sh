#!/usr/bin/env bash
# Lance le worker d'Enquête depuis la crontab du VPS (heure de Paris).
# Un seul worker à la fois : écrire une affaire prend quelques minutes.
#   * * * * *  /home/ubuntu/enquete/scripts/worker.sh
#   0 7 * * 1  /home/ubuntu/enquete/scripts/worker.sh hebdo
set -uo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$HOME/enquete-worker.log"
MAX_LINES=1000

cd "$DIR" || exit 1
# Le tour de chaque minute passe si un worker tourne déjà ; l'affaire de la
# semaine, elle, attend son tour (jusqu'à 30 min).
if [ "${1:-}" = "hebdo" ]; then ATTENTE="-w 1800"; else ATTENTE="-n"; fi
# Tant que la base propre au jeu n'existe pas, l'ancien worker continue de
# servir l'ancienne base (copie gardée dans .ancien-worker, hors git).
WORKER=worker/worker.mjs
grep -q "^ENQUETE_SERVICE_ROLE_KEY=" "$DIR/.env" 2>/dev/null || WORKER=.ancien-worker/worker/worker.mjs
flock $ATTENTE /tmp/enquete-worker.lock node "$WORKER" "$@" >> "$LOG" 2>&1
tail -n "$MAX_LINES" "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
