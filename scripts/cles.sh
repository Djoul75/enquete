#!/usr/bin/env bash
# Range les deux secrets nécessaires à l'ouverture du jeu aux amis dans
# ~/enquete/.env (ignoré par git, lisible par toi seul). À lancer dans le
# terminal web : les saisies ne s'affichent pas.
set -euo pipefail
FICHIER="$HOME/enquete/.env"
touch "$FICHIER" && chmod 600 "$FICHIER"

ranger() {
  local nom="$1" valeur="$2"
  grep -v "^$nom=" "$FICHIER" > "$FICHIER.tmp" || true
  echo "$nom=$valeur" >> "$FICHIER.tmp"
  mv "$FICHIER.tmp" "$FICHIER" && chmod 600 "$FICHIER"
}

# Une réponse vide garde la valeur déjà rangée.
echo "1/2 · Jeton Supabase (commence par sbp_), puis Entrée (vide = garder l'actuel) :"
read -rs jeton; echo
if [[ -n "$jeton" ]]; then
  [[ "$jeton" == sbp_* ]] || { echo "Ce n'est pas un jeton Supabase (il doit commencer par sbp_)."; exit 1; }
  ranger SUPABASE_ACCESS_TOKEN "$jeton"
fi

echo "2/2 · Mot de passe d'application Gmail (16 lettres, espaces acceptés), puis Entrée (vide = garder l'actuel) :"
read -rs mdp; echo
mdp="${mdp// /}"
if [[ -n "$mdp" ]]; then
  [[ ${#mdp} -eq 16 ]] || { echo "Il faut 16 lettres, j'en compte ${#mdp}."; exit 1; }
  ranger GMAIL_APP_PASSWORD "$mdp"
fi

echo "C'est rangé. Tu peux dire à Claude que c'est fait."
