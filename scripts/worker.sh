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
flock $ATTENTE /tmp/enquete-worker.lock node worker/worker.mjs "$@" >> "$LOG" 2>&1
tail -n "$MAX_LINES" "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
