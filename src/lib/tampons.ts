import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

// Les douze tampons du passeport de l'agence. La base dit lesquels sont
// gagnés (enquete_tampons) ; ici, leur allure : forme et couleur d'encre,
// comme des visas de passeport tous différents.
export type Forme = "rond" | "rect" | "ovale" | "triangle";
export type Encre = "rouge" | "violet" | "bleu" | "noir";

export type EtatTampon = {
  cle: string;
  obtenu_at: string | null;
  partie: number | null;
  vu: boolean;
  progres: number | null;
  sur: number | null;
};

export const DEFINITIONS: Record<string, { nom: string; regle: string; haut: string; forme: Forme; encre: Encre }> = {
  premiere: { nom: "PREMIÈRE AFFAIRE", regle: "Faire condamner un coupable", haut: "★ BAPTÊME ★", forme: "rond", encre: "rouge" },
  flair: { nom: "FLAIR", regle: "Un dossier parfait : coupable, mobile, occasion et preuve", haut: "QUATRE SUR QUATRE", forme: "rect", encre: "violet" },
  econome: { nom: "1 H 30 CHRONO", regle: "Faire condamner en 1 h 30 de nuit ou moins", haut: "AVANT L'AUBE", forme: "ovale", encre: "bleu" },
  sans_fouiller: { nom: "MAINS PROPRES", regle: "Faire condamner sans fouiller", haut: "★ SANS FOUILLE ★", forme: "rond", encre: "noir" },
  eclair: { nom: "ÉCLAIR", regle: "Résoudre moins d'une heure après l'ouverture", haut: "EN MOINS D'1 H", forme: "triangle", encre: "noir" },
  noctambule: { nom: "NOCTAMBULE", regle: "Signer juste entre minuit et 5 h", haut: "SERVICE DE NUIT", forme: "ovale", encre: "violet" },
  serie: { nom: "EN SÉRIE", regle: "3 affaires résolues d'affilée", haut: "TROIS DE SUITE", forme: "rect", encre: "rouge" },
  dix: { nom: "DIX DOSSIERS", regle: "10 affaires résolues", haut: "★ CHEVRONNÉ ★", forme: "rond", encre: "bleu" },
  premier_table: { nom: "EN TÊTE", regle: "Finir premier d'une partie à plusieurs", haut: "PREMIER À TABLE", forme: "rect", encre: "noir" },
  tablee: { nom: "GRANDE TABLÉE", regle: "Jouer une partie à quatre privés ou plus", haut: "4 ET PLUS", forme: "ovale", encre: "rouge" },
  associes: { nom: "LE RÉSEAU", regle: "Avoir 3 associés", haut: "★ TROIS ASSOCIÉS ★", forme: "rond", encre: "violet" },
  pilier: { nom: "PILIER", regle: "25 affaires jouées", haut: "VINGT-CINQ DOSSIERS", forme: "rect", encre: "bleu" },
};

export function dateTampon(iso: string): string {
  const d = new Date(iso);
  const mois = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"][d.getMonth()];
  return `${d.getDate()} · ${mois} · ${String(d.getFullYear()).slice(2)}`;
}

let dernier: EtatTampon[] | null = null;

// La liste des tampons, et ceux qui viennent de tomber sans avoir été vus.
// `actif` permet d'attendre (la révélation laisse d'abord tourner le journal).
export function useTampons(actif = true) {
  const [tampons, setTampons] = useState<EtatTampon[] | null>(dernier);

  useEffect(() => {
    if (!actif) return;
    api.tampons().then((t) => {
      dernier = t;
      setTampons(t);
    }).catch(() => {});
  }, [actif]);

  const nouveaux = (tampons ?? []).filter((t) => t.obtenu_at && !t.vu && DEFINITIONS[t.cle]);

  const marquerVus = useCallback((cles: string[]) => {
    setTampons((ts) => {
      const maj = ts?.map((t) => (cles.includes(t.cle) ? { ...t, vu: true } : t)) ?? null;
      dernier = maj;
      return maj;
    });
    api.tamponsVus(cles).catch(() => {});
  }, []);

  return { tampons, nouveaux, marquerVus };
}
