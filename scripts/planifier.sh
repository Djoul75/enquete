#!/usr/bin/env bash
# Ajoute les tâches d'Enquête à la crontab ; chaque ligne n'est ajoutée
# qu'une fois, on peut relancer sans risque.
set -euo pipefail
ajouter() {
  local repere="$1"; shift
  if crontab -l 2>/dev/null | grep -qF "$repere"; then
    echo "Déjà planifié : $repere"
    return
  fi
  { crontab -l 2>/dev/null; printf '%s\n' "$@"; } | crontab -
  echo "Planifié : $repere"
}
ajouter "enquete/scripts/worker.sh" \
  "# Enquête : affaires demandées, clôtures et notifications (chaque minute), affaire de la semaine (lundi 7 h)" \
  "* * * * * /home/ubuntu/enquete/scripts/worker.sh" \
  "0 7 * * 1 /home/ubuntu/enquete/scripts/worker.sh hebdo"
ajouter "enquete/scripts/sauvegarde.mjs" \
  "# Enquête : sauvegarde de la base du jeu chaque nuit (30 jours gardés)" \
  "30 3 * * * cd /home/ubuntu/enquete && node scripts/sauvegarde.mjs >> /home/ubuntu/enquete-sauvegarde.log 2>&1"
