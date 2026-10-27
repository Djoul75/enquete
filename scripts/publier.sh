#!/usr/bin/env bash
# Première mise en ligne : crée le dépôt public Djoul75/enquete, pousse le
# code (sans les affaires, ignorées par git) et active GitHub Pages.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
gh repo create Djoul75/enquete --public --source . --push --description "Jeu d'enquête policière façon film noir"
gh api -X POST repos/Djoul75/enquete/pages -f build_type=workflow > /dev/null
gh workflow run pages.yml > /dev/null 2>&1 || true
echo "Publié : https://djoul75.github.io/enquete/ (en ligne d'ici 1 à 2 minutes)"
