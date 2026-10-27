#!/usr/bin/env bash
# Ajoute le worker d'Enquête à la crontab (une seule fois).
set -euo pipefail
if crontab -l 2>/dev/null | grep -q "enquete/scripts/worker.sh"; then
  echo "Déjà planifié."
  exit 0
fi
{
  crontab -l 2>/dev/null
  echo "# Enquête : affaires demandées, clôtures et notifications (chaque minute), affaire de la semaine (lundi 7 h)"
  echo "* * * * * /home/ubuntu/enquete/scripts/worker.sh"
  echo "0 7 * * 1 /home/ubuntu/enquete/scripts/worker.sh hebdo"
} | crontab -
echo "Worker planifié."
