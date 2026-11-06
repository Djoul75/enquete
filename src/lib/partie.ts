import type { AffairePublic, EtatPartie, Evenement, Fin, IndiceTrouve, Question, Verdict } from "./types";

// ---------------------------------------------------------------------------
// L'heure de la nuit
// ---------------------------------------------------------------------------

export function hhmm(texte: string): number {
  const [h, m] = texte.split(":").map(Number);
  return h * 60 + m;
}

// Minutes depuis le début de la nuit → « 3 h 05 ».
export function heureNuit(horloge: AffairePublic["horloge"], minutes: number): string {
  return heureDuJour(hhmm(horloge.debut) + minutes);
}

// Minute du jour → « 3 h 05 ».
export function heureDuJour(m: number): string {
  return `${Math.floor(m / 60) % 24} h ${String(m % 60).padStart(2, "0")}`;
}

// Minutes écoulées depuis le début de la nuit à cette heure, en passant minuit.
export function depuisDebut(horloge: AffairePublic["horloge"], heure: string): number {
  return (hhmm(heure) - hhmm(horloge.debut) + 1440) % 1440;
}

// L'heure d'un événement en minutes depuis le début de la nuit.
export function minuteEvenement(horloge: AffairePublic["horloge"], e: Evenement): number {
  return depuisDebut(horloge, e.heure);
}

// Ce qui met fin à l'enquête : l'aube, ou ce que l'affaire prévoit.
export function finDeNuit(horloge: AffairePublic["horloge"]): Fin {
  return (
    horloge.fin ?? {
      court: "L'AUBE",
      titre: ["L'AUBE", "SE LÈVE."],
      texte: "La police reprend l'affaire au petit jour. Le commissaire veut ton dossier tel qu'il est : qui, pourquoi, et ce que tu as pour le prouver.",
    }
  );
}

export function aube(etat: EtatPartie): boolean {
  return etat.nuit.minutes >= etat.nuit.aube;
}

// Ce que coûte une question.
export function cout(etat: EtatPartie, q: Question): number {
  const c = etat.affaire.public.horloge.couts;
  return q.genre === "relance" ? c.relance : c.question;
}

// ---------------------------------------------------------------------------
// Les indices et les suspects
// ---------------------------------------------------------------------------

export function indicesTrouves(etat: EtatPartie): (IndiceTrouve & { source: string })[] {
  const pub = etat.affaire.public;
  return etat.indices.map((i) => ({
    ...i,
    source:
      i.type === "fouille"
        ? (pub.lieux.find((l) => l.id === i.cible)?.nom ?? "Fouille")
        : (pub.suspects.find((s) => s.id === i.cible)?.nom ?? "Témoin"),
  }));
}

// Questions qu'on peut poser maintenant à ce suspect (le serveur décide).
export function questionsDisponibles(etat: EtatPartie, suspect: string): Question[] {
  const ouvertes = new Set(etat.nuit.ouvertes);
  return etat.affaire.public.questions.filter((q) => q.suspect === suspect && ouvertes.has(q.id));
}

// Une « nouvelle piste » : une question ouverte par un indice, pas encore posée.
export function aUnePiste(etat: EtatPartie, suspect: string): boolean {
  return questionsDisponibles(etat, suspect).some((q) => q.genre === "piste");
}

// Pistes que cet indice ouvre, encore posables.
export function questionsDebloquees(etat: EtatPartie, indice: string): Question[] {
  const ouvertes = new Set(etat.nuit.ouvertes);
  return etat.affaire.public.questions.filter((q) => q.requiert === indice && ouvertes.has(q.id));
}

// Tout ce qui s'est dit avec ce suspect : questions et pièces montrées.
export function echangesAvec(etat: EtatPartie, suspect: string) {
  return etat.journal.filter((e) => e.type !== "fouille" && e.suspect === suspect);
}

// Pièces du mur pas encore montrées à ce suspect.
export function piecesAMontrer(etat: EtatPartie, suspect: string) {
  const montrees = new Set(etat.nuit.montrees);
  return indicesTrouves(etat).filter((i) => !montrees.has(`${suspect}:${i.id}`));
}

export type EtatSuspect = "libre" | "braque" | "parti";

export function etatSuspect(etat: EtatPartie, suspect: string): EtatSuspect {
  if (etat.nuit.absents.includes(suspect)) return "parti";
  if (etat.nuit.braques.includes(suspect)) return "braque";
  return "libre";
}

// ---------------------------------------------------------------------------
// Verdicts
// ---------------------------------------------------------------------------

export const VERDICTS: Record<Verdict, { mot: string; court: string; lignes: string[] }> = {
  condamne: { mot: "Condamné", court: "CONDAMNÉ", lignes: ["CONDAMNÉ"] },
  relache: { mot: "Relâché faute de preuves", court: "RELÂCHÉ", lignes: ["RELÂCHÉ", "FAUTE DE PREUVES"] },
  erreur: { mot: "Erreur judiciaire", court: "ERREUR", lignes: ["ERREUR", "JUDICIAIRE"] },
};

// ---------------------------------------------------------------------------

export function nomCourt(nom: string): string {
  // « Inspecteur Ferrand » → « Ferrand », « Lola Ferri » → « Lola »
  const titres = ["inspecteur", "commissaire", "docteur", "maître", "madame", "monsieur", "mademoiselle", "père", "sœur", "comte", "comtesse", "baron", "baronne", "capitaine", "professeur", "lady", "lord", "sir"];
  const mots = nom.split(" ");
  if (mots.length > 1 && titres.includes(mots[0].toLowerCase())) return mots.slice(1).join(" ");
  return mots[0];
}

export function pluriel(n: number, mot: string, motPluriel = mot + "s"): string {
  return `${n} ${n > 1 ? motPluriel : mot}`;
}

// « il » ou « elle », d'après le visage dessiné.
export function pronom(etat: EtatPartie, suspect: string): "il" | "elle" {
  return etat.affaire.public.suspects.find((s) => s.id === suspect)?.visage?.femme ? "elle" : "il";
}
