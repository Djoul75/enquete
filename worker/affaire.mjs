import { readFileSync } from "node:fs";

// Format d'une affaire : vérification de cohérence et conversion entre le
// format stocké (src/lib/types.ts : public + secret, réponses indexées par
// id) et le format « plat » que Claude produit (tout en tableaux, plus
// simple à contraindre par un schéma JSON).

export function verifier(affaire) {
  const erreurs = [];
  const pub = affaire.public;
  const sec = affaire.secret;
  const ids = (liste) => new Set(liste.map((x) => x.id));
  const suspects = ids(pub.suspects);
  const lieux = ids(pub.lieux);
  const mobiles = ids(pub.mobiles);
  const indices = new Set(Object.keys(sec.indices));

  if (pub.suspects.length < 3 || pub.suspects.length > 5) erreurs.push("il faut 3 à 5 suspects");
  if (pub.lieux.length < 3 || pub.lieux.length > 5) erreurs.push("il faut 3 à 5 lieux");
  if (pub.mobiles.length < 3) erreurs.push("il faut au moins 3 mobiles");
  for (const [nom, liste] of [["suspect", pub.suspects], ["lieu", pub.lieux], ["mobile", pub.mobiles], ["question", pub.questions]]) {
    if (ids(liste).size !== liste.length) erreurs.push(`id de ${nom} en double`);
  }
  for (const s of pub.suspects) {
    if (!(s.silhouette >= 0 && s.silhouette <= 5)) erreurs.push(`silhouette de ${s.id} hors de 0-5`);
    const n = pub.questions.filter((q) => q.suspect === s.id).length;
    if (n < 5) erreurs.push(`${s.id} n'a que ${n} questions (au moins 5)`);
  }
  for (const q of pub.questions) {
    if (!suspects.has(q.suspect)) erreurs.push(`question ${q.id} : suspect ${q.suspect} inconnu`);
    if (q.requiert && !indices.has(q.requiert)) erreurs.push(`question ${q.id} : indice requis ${q.requiert} inconnu`);
    const r = sec.questions[q.id];
    if (!r) erreurs.push(`question ${q.id} sans réponse`);
    else if (r.indice && !indices.has(r.indice)) erreurs.push(`question ${q.id} : indice ${r.indice} inconnu`);
  }
  for (const id of Object.keys(sec.questions)) {
    if (!pub.questions.some((q) => q.id === id)) erreurs.push(`réponse ${id} sans question`);
  }
  for (const l of pub.lieux) {
    const f = sec.fouilles[l.id];
    if (!f) erreurs.push(`lieu ${l.id} sans résultat de fouille`);
    else if (f.indice && !indices.has(f.indice)) erreurs.push(`fouille ${l.id} : indice ${f.indice} inconnu`);
  }

  // Indices réellement atteignables : fouilles et questions libres, puis
  // les questions débloquées par ce qu'on a déjà, jusqu'à stabilité.
  const atteints = new Set();
  for (const l of pub.lieux) if (sec.fouilles[l.id]?.indice) atteints.add(sec.fouilles[l.id].indice);
  let change = true;
  while (change) {
    change = false;
    for (const q of pub.questions) {
      const i = sec.questions[q.id]?.indice;
      if (i && !atteints.has(i) && (!q.requiert || atteints.has(q.requiert))) {
        atteints.add(i);
        change = true;
      }
    }
  }
  for (const i of indices) if (!atteints.has(i)) erreurs.push(`indice ${i} impossible à obtenir`);

  const sol = sec.solution;
  if (!suspects.has(sol.coupable)) erreurs.push(`coupable ${sol.coupable} inconnu`);
  if (!mobiles.has(sol.mobile)) erreurs.push(`mobile ${sol.mobile} inconnu`);
  if (!Array.isArray(sol.preuves) || sol.preuves.length < 2) erreurs.push("il faut au moins 2 preuves");
  for (const p of sol.preuves ?? []) if (!indices.has(p)) erreurs.push(`preuve ${p} inconnue`);
  if (!lieux.size) erreurs.push("aucun lieu");
  return erreurs;
}

// Format stocké → format plat (pour montrer un exemple à Claude).
export function aplatir(affaire) {
  const { public: pub, secret: sec } = affaire;
  return {
    titre: affaire.titre,
    cadre: pub.cadre,
    intro: pub.intro,
    accroche: pub.accroche,
    victime: pub.victime,
    suspects: pub.suspects,
    lieux: pub.lieux.map((l) => ({
      id: l.id,
      nom: l.nom,
      fouille: sec.fouilles[l.id].texte,
      indice: sec.fouilles[l.id].indice ?? null,
    })),
    indices: Object.entries(sec.indices).map(([id, i]) => ({ id, texte: i.texte })),
    questions: pub.questions.map((q) => ({
      id: q.id,
      suspect: q.suspect,
      texte: q.texte,
      requiert: q.requiert ?? null,
      reponse: sec.questions[q.id].texte,
      didascalie: sec.questions[q.id].didascalie ?? null,
      indice: sec.questions[q.id].indice ?? null,
    })),
    mobiles: pub.mobiles,
    journal: pub.journal,
    solution: sec.solution,
  };
}

// Format plat → format stocké.
export function deplier(plat) {
  const sansNull = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));
  return {
    titre: plat.titre,
    public: {
      cadre: plat.cadre,
      intro: plat.intro,
      accroche: plat.accroche,
      victime: plat.victime,
      suspects: plat.suspects,
      lieux: plat.lieux.map((l) => ({ id: l.id, nom: l.nom })),
      questions: plat.questions.map((q) => sansNull({ id: q.id, suspect: q.suspect, texte: q.texte, requiert: q.requiert })),
      mobiles: plat.mobiles,
      journal: plat.journal,
    },
    secret: {
      questions: Object.fromEntries(
        plat.questions.map((q) => [q.id, sansNull({ texte: q.reponse, didascalie: q.didascalie, indice: q.indice })])
      ),
      fouilles: Object.fromEntries(plat.lieux.map((l) => [l.id, sansNull({ texte: l.fouille, indice: l.indice })])),
      indices: Object.fromEntries(plat.indices.map((i) => [i.id, { texte: i.texte }])),
      solution: plat.solution,
    },
  };
}

const texte = { type: "string" };
const texteOuNull = { type: ["string", "null"] };
const objet = (props) => ({
  type: "object",
  properties: props,
  required: Object.keys(props),
  additionalProperties: false,
});

// Schéma JSON du format plat, imposé à Claude via les structured outputs.
export const SCHEMA_PLAT = objet({
  titre: texte,
  cadre: objet({ ville: texte, annee: texte, heure: texte }),
  intro: texte,
  accroche: texte,
  victime: texte,
  suspects: {
    type: "array",
    items: objet({ id: texte, nom: texte, role: texte, portrait: texte, silhouette: { type: "integer" } }),
  },
  lieux: { type: "array", items: objet({ id: texte, nom: texte, fouille: texte, indice: texteOuNull }) },
  indices: { type: "array", items: objet({ id: texte, texte }) },
  questions: {
    type: "array",
    items: objet({
      id: texte,
      suspect: texte,
      texte,
      requiert: texteOuNull,
      reponse: texte,
      didascalie: texteOuNull,
      indice: texteOuNull,
    }),
  },
  mobiles: { type: "array", items: objet({ id: texte, texte }) },
  journal: objet({ nom: texte, date: texte, prix: texte }),
  solution: objet({
    coupable: texte,
    mobile: texte,
    preuves: { type: "array", items: texte },
    une: texte,
    recit: texte,
    rate: texte,
  }),
});

// Lit une affaire écrite à la main, dans l'un ou l'autre format.
export function charger(chemin) {
  const brut = JSON.parse(readFileSync(chemin, "utf8"));
  return brut.secret ? brut : deplier(brut);
}
