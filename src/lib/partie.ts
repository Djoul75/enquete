import type { EtatPartie, Question } from "./types";

export type IndiceTrouve = {
  id: string;
  texte: string;
  source: string; // nom du suspect ou du lieu
  type: "question" | "fouille";
  cible: string; // id du suspect ou du lieu, pour y retourner depuis le mur
};

export function indicesTrouves(etat: EtatPartie): IndiceTrouve[] {
  const vus = new Set<string>();
  const indices: IndiceTrouve[] = [];
  const pub = etat.affaire.public;
  for (const e of etat.journal) {
    if (!e.indice || vus.has(e.indice.id)) continue;
    vus.add(e.indice.id);
    if (e.type === "fouille") {
      indices.push({ ...e.indice, type: "fouille", cible: e.ref, source: pub.lieux.find((l) => l.id === e.ref)?.nom ?? "Fouille" });
    } else {
      const suspect = pub.questions.find((q) => q.id === e.ref)?.suspect ?? "";
      const nom = pub.suspects.find((s) => s.id === suspect)?.nom ?? "Témoin";
      indices.push({ ...e.indice, type: "question", cible: suspect, source: nom });
    }
  }
  return indices;
}

export function compteurs(etat: EtatPartie) {
  const questions = etat.journal.filter((e) => e.type === "question").length;
  const fouilles = etat.journal.filter((e) => e.type === "fouille").length;
  return {
    questions,
    fouilles,
    questionsRestantes: etat.limites.questions - questions,
    fouillesRestantes: etat.limites.fouilles - fouilles,
  };
}

// Questions qu'on peut encore poser à ce suspect : pas déjà posées, et dont
// l'indice requis (s'il y en a un) a été trouvé.
export function questionsDisponibles(etat: EtatPartie, suspect: string): Question[] {
  const posees = new Set(etat.journal.filter((e) => e.type === "question").map((e) => e.ref));
  const trouves = new Set(indicesTrouves(etat).map((i) => i.id));
  return etat.affaire.public.questions.filter(
    (q) => q.suspect === suspect && !posees.has(q.id) && (!q.requiert || trouves.has(q.requiert))
  );
}

// Une « nouvelle piste » : une question débloquée par un indice, pas encore posée.
export function aUnePiste(etat: EtatPartie, suspect: string): boolean {
  return questionsDisponibles(etat, suspect).some((q) => q.requiert);
}

// Questions que cet indice débloque et qui n'ont pas encore été posées.
export function questionsDebloquees(etat: EtatPartie, indice: string): Question[] {
  const posees = new Set(etat.journal.filter((e) => e.type === "question").map((e) => e.ref));
  return etat.affaire.public.questions.filter((q) => q.requiert === indice && !posees.has(q.id));
}

export function echangesAvec(etat: EtatPartie, suspect: string) {
  const pub = etat.affaire.public;
  return etat.journal.filter((e) => e.type === "question" && pub.questions.find((q) => q.id === e.ref)?.suspect === suspect);
}

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
