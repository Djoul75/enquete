import type { EtatPartie, Evenement } from "./types";
import { minuteEvenement } from "./partie";

// Les alertes de la nuit (un événement passé, l'heure de fin) ne s'affichent
// qu'une fois par partie : on retient celles qui ont été lues.

export function cleAlerte(partie: number, quoi: string) {
  return `enquete-nuit-${partie}-${quoi}`;
}

// Le prochain événement passé que le joueur n'a pas encore vu, ou l'aube.
export type Alerte = { type: "evenement"; e: Evenement } | { type: "aube" };

export function alerteEnAttente(etat: EtatPartie): Alerte | null {
  const pub = etat.affaire.public;
  const vu = (quoi: string) => {
    try {
      return !!localStorage.getItem(cleAlerte(etat.partie.id, quoi));
    } catch {
      return true;
    }
  };
  for (const e of pub.evenements) {
    if (minuteEvenement(pub.horloge, e) <= etat.nuit.minutes && !vu(e.heure)) return { type: "evenement", e };
  }
  if (etat.nuit.minutes >= etat.nuit.aube && !vu("aube")) return { type: "aube" };
  return null;
}
