import { useEffect, useState } from "react";
import { api } from "./api";

export const FORME_PSEUDO = /^[A-Za-z0-9_À-ÖØ-öø-ÿ-]{3,16}$/;

// Vérifie pendant la frappe, une fois la frappe posée, que le nom est libre.
// Renvoie le petit texte à afficher dans le champ et si on peut valider.
export function usePseudoLibre(propre: string) {
  const [verif, setVerif] = useState<{ pour: string; libre: boolean } | null>(null);
  const bienForme = FORME_PSEUDO.test(propre);
  const libre = verif?.pour === propre ? verif.libre : null;

  useEffect(() => {
    if (!bienForme) return;
    const id = window.setTimeout(() => {
      api.pseudoLibre(propre).then((l) => setVerif({ pour: propre, libre: l })).catch(() => {});
    }, 300);
    return () => window.clearTimeout(id);
  }, [propre, bienForme]);

  let etat = "";
  if (propre && !bienForme) etat = propre.length < 3 ? "" : "lettres, chiffres, - et _";
  else if (libre === true) etat = "✓ libre";
  else if (libre === false) etat = "déjà pris";

  return { etat, libre, valide: bienForme && libre === true };
}
