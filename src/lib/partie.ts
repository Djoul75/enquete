import type { EtatPartie, Question } from "./types";

export function indicesTrouves(etat: EtatPartie) {
  const vus = new Set<string>();
  const indices: { id: string; texte: string; source: string }[] = [];
  const pub = etat.affaire.public;
  for (const e of etat.journal) {
    if (!e.indice || vus.has(e.indice.id)) continue;
    vus.add(e.indice.id);
    const source =
      e.type === "fouille"
        ? pub.lieux.find((l) => l.id === e.ref)?.nom ?? "Fouille"
        : pub.suspects.find((s) => s.id === pub.questions.find((q) => q.id === e.ref)?.suspect)?.nom ?? "Témoin";
    indices.push({ ...e.indice, source });
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

export function nomCourt(nom: string): string {
  // « Inspecteur Ferrand » → « Ferrand », « Lola Ferri » → « Lola »
  const titres = ["inspecteur", "commissaire", "docteur", "maître", "madame", "monsieur", "mademoiselle", "père", "sœur", "comte", "comtesse", "baron", "baronne", "capitaine", "professeur", "lady", "lord", "sir"];
  const mots = nom.split(" ");
  if (mots.length > 1 && titres.includes(mots[0].toLowerCase())) return mots.slice(1).join(" ");
  return mots[0];
}
