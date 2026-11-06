import { readFileSync } from "node:fs";

// Format d'une affaire (règle de la nuit, « format 2 ») : vérification de
// cohérence et conversion entre le format stocké (src/lib/types.ts : public
// + secret, réponses indexées par id) et le format « plat » que Claude
// produit (tout en tableaux, plus simple à contraindre par un schéma JSON).
// Les affaires de l'ancienne règle (15 questions, 3 fouilles) restent dans
// affaires/*.json pour l'historique ; les nouvelles sont dans affaires/v2/.

// Ce que coûte chaque geste, en minutes de la nuit. Les mêmes pour toutes
// les affaires : les joueurs apprennent le barème une fois.
export const COUTS = { question: 10, relance: 5, montrer: 5, fouille: 30 };
const NATURES = ["piste", "occasion", "mobile", "decisive", "fausse-piste", "alibi"];
const minutes = (hhmm) => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

export function verifier(affaire) {
  const erreurs = [];
  const pub = affaire.public;
  const sec = affaire.secret;
  const ids = (liste) => new Set(liste.map((x) => x.id));
  const suspects = ids(pub.suspects);
  const lieux = ids(pub.lieux);
  const mobiles = ids(pub.mobiles);
  const indices = new Set(Object.keys(sec.indices));
  const questions = new Map(pub.questions.map((q) => [q.id, q]));

  if (pub.format !== 2) erreurs.push("format 2 attendu");
  if (pub.suspects.length < 3 || pub.suspects.length > 5) erreurs.push("il faut 3 à 5 suspects");
  if (pub.lieux.length < 3 || pub.lieux.length > 5) erreurs.push("il faut 3 à 5 lieux");
  if (pub.mobiles.length < 3) erreurs.push("il faut au moins 3 mobiles");
  for (const [nom, liste] of [["suspect", pub.suspects], ["lieu", pub.lieux], ["mobile", pub.mobiles], ["question", pub.questions]]) {
    if (ids(liste).size !== liste.length) erreurs.push(`id de ${nom} en double`);
  }

  // L'horloge et les événements de la nuit.
  // Minutes depuis le début de la nuit, en passant minuit si besoin.
  const depuis = (hhmm) => (minutes(hhmm) - minutes(pub.horloge?.debut) + 1440) % 1440;
  const duree = depuis(pub.horloge?.aube);
  if (Number.isNaN(duree)) erreurs.push("horloge : heures au format HH:MM");
  else if (duree < 180 || duree > 300) erreurs.push("horloge : la nuit doit durer de 3 à 5 heures");
  for (const k of Object.keys(COUTS)) if (pub.horloge?.couts?.[k] !== COUTS[k]) erreurs.push(`horloge : coût ${k} différent du barème`);
  const fin = pub.horloge?.fin;
  if (fin && (!fin.court || !Array.isArray(fin.titre) || !fin.titre.length || !fin.texte)) erreurs.push("horloge : fin incomplète (court, titre, texte)");
  for (const e of pub.evenements ?? []) {
    const h = depuis(e.heure);
    if (!(h > 0 && h < duree)) erreurs.push(`événement ${e.heure} hors de la nuit`);
    if (!e.suspect_absent && !e.lieu_perdu) erreurs.push(`événement ${e.heure} sans effet`);
    if (e.suspect_absent && !suspects.has(e.suspect_absent)) erreurs.push(`événement ${e.heure} : suspect inconnu`);
    if (e.lieu_perdu && !lieux.has(e.lieu_perdu)) erreurs.push(`événement ${e.heure} : lieu inconnu`);
    if (e.lieu_perdu && !sec.fouilles[e.lieu_perdu]?.apres_evenement) erreurs.push(`lieu ${e.lieu_perdu} : texte après l'événement manquant`);
  }
  if ((pub.evenements ?? []).length > 3) erreurs.push("3 événements au plus");

  // Les indices.
  for (const [id, i] of Object.entries(sec.indices)) {
    if (!NATURES.includes(i.nature)) erreurs.push(`indice ${id} : nature « ${i.nature} » inconnue`);
  }
  const indiceConnu = (id, ou) => {
    if (id && !indices.has(id)) erreurs.push(`${ou} : indice ${id} inconnu`);
  };

  // Les suspects : patience, répliques de refus, pièces à montrer.
  for (const s of pub.suspects) {
    if (!(s.silhouette >= 0 && s.silhouette <= 5)) erreurs.push(`silhouette de ${s.id} hors de 0-5`);
    if (!(s.patience >= 2 && s.patience <= 3)) erreurs.push(`patience de ${s.id} : 2 ou 3`);
    const siennes = pub.questions.filter((q) => q.suspect === s.id);
    const ouvertures = siennes.filter((q) => q.genre === "ouverture").length;
    if (ouvertures < 2 || ouvertures > 4) erreurs.push(`${s.id} : 2 à 4 questions d'ouverture (${ouvertures})`);
    if (siennes.length < 5) erreurs.push(`${s.id} n'a que ${siennes.length} questions (au moins 5)`);
    if (!siennes.some((q) => sec.questions[q.id]?.fache)) erreurs.push(`${s.id} : au moins une question qui fâche`);
    if (!sec.braque?.[s.id]) erreurs.push(`${s.id} : réplique quand il se braque manquante`);
    if (!sec.ricane?.[s.id]) erreurs.push(`${s.id} : réplique quand on lui montre une pièce sans effet manquante`);
    const m = sec.montrer?.[s.id];
    if (!m?._defaut) erreurs.push(`${s.id} : réaction par défaut aux pièces montrées manquante`);
    for (const [piece, r] of Object.entries(m ?? {})) {
      if (piece !== "_defaut" && !indices.has(piece)) erreurs.push(`montrer à ${s.id} : pièce ${piece} inconnue`);
      indiceConnu(r.indice, `montrer ${piece} à ${s.id}`);
    }
    const c = sec.craque?.[s.id];
    if (c) {
      if (!c.pieces?.length) erreurs.push(`${s.id} craque sans pièce`);
      for (const p of c.pieces ?? []) if (!indices.has(p)) erreurs.push(`${s.id} craque : pièce ${p} inconnue`);
      indiceConnu(c.indice, `${s.id} craque`);
    }
  }

  // Les questions et leur arbre.
  for (const q of pub.questions) {
    if (!suspects.has(q.suspect)) erreurs.push(`question ${q.id} : suspect ${q.suspect} inconnu`);
    if (!["ouverture", "relance", "piste"].includes(q.genre)) erreurs.push(`question ${q.id} : genre inconnu`);
    if (q.genre === "relance") {
      const parent = questions.get(q.apres);
      if (!parent) erreurs.push(`relance ${q.id} : question ${q.apres} inconnue`);
      else if (parent.suspect !== q.suspect) erreurs.push(`relance ${q.id} : la question d'avant est à un autre suspect`);
    }
    if (q.genre === "piste" && !indices.has(q.requiert)) erreurs.push(`piste ${q.id} : indice requis ${q.requiert} inconnu`);
    if (q.genre === "ouverture" && (q.apres || q.requiert)) erreurs.push(`ouverture ${q.id} : ni apres ni requiert`);
    const r = sec.questions[q.id];
    if (!r) erreurs.push(`question ${q.id} sans réponse`);
    else indiceConnu(r.indice, `question ${q.id}`);
  }
  for (const id of Object.keys(sec.questions)) {
    if (!questions.has(id)) erreurs.push(`réponse ${id} sans question`);
  }

  // Les lieux : au moins un ne donne rien.
  for (const l of pub.lieux) {
    const f = sec.fouilles[l.id];
    if (!f) erreurs.push(`lieu ${l.id} sans résultat de fouille`);
    else indiceConnu(f.indice, `fouille ${l.id}`);
  }
  if (pub.lieux.every((l) => sec.fouilles[l.id]?.indice)) erreurs.push("au moins un lieu doit ne rien donner");

  // Indices atteignables, en partant des fouilles et des ouvertures, puis
  // relances, pistes et pièces montrées, jusqu'à stabilité. On retient d'où
  // vient chaque indice : la fouille ou la parole.
  const atteints = new Map();
  const ajouter = (id, voie) => {
    if (id && !atteints.has(id)) {
      atteints.set(id, voie);
      return true;
    }
    return false;
  };
  for (const l of pub.lieux) ajouter(sec.fouilles[l.id]?.indice, "fouille");
  const posables = new Set();
  let change = true;
  while (change) {
    change = false;
    for (const q of pub.questions) {
      if (posables.has(q.id)) continue;
      const ouverte = q.genre === "ouverture" || (q.genre === "relance" && posables.has(q.apres)) || (q.genre === "piste" && atteints.has(q.requiert));
      if (!ouverte) continue;
      posables.add(q.id);
      ajouter(sec.questions[q.id]?.indice, "parole");
      change = true;
    }
    for (const [s, m] of Object.entries(sec.montrer ?? {})) {
      for (const [piece, r] of Object.entries(m)) if (atteints.has(piece) && ajouter(r.indice, "parole")) change = true;
      const c = sec.craque?.[s];
      if (c && c.pieces.some((p) => atteints.has(p)) && ajouter(c.indice, "parole")) change = true;
    }
  }
  for (const i of indices) if (!atteints.has(i)) erreurs.push(`indice ${i} impossible à obtenir`);

  const sol = sec.solution;
  if (!suspects.has(sol.coupable)) erreurs.push(`coupable ${sol.coupable} inconnu`);
  if (!mobiles.has(sol.mobile)) erreurs.push(`mobile ${sol.mobile} inconnu`);
  if (!Array.isArray(sol.preuves) || sol.preuves.length < 2) erreurs.push("il faut au moins 2 preuves");
  if (!Array.isArray(sol.occasion) || sol.occasion.length < 1) erreurs.push("il faut au moins une occasion");
  for (const p of [...(sol.preuves ?? []), ...(sol.occasion ?? [])]) if (!indices.has(p)) erreurs.push(`solution : indice ${p} inconnu`);
  // Deux chemins vers la condamnation : une preuve par la fouille, une par la parole.
  const voies = new Set((sol.preuves ?? []).map((p) => atteints.get(p)));
  if (!voies.has("fouille") || !voies.has("parole")) erreurs.push("il faut une preuve trouvée en fouillant et une autre obtenue en interrogeant");
  if (!sec.craque?.[sol.coupable]) erreurs.push("le coupable doit pouvoir craquer");
  return erreurs;
}

// Format stocké → format plat (pour montrer un exemple à Claude).
export function aplatir(affaire) {
  const { public: pub, secret: sec } = affaire;
  const nul = (x) => x ?? null;
  return {
    titre: affaire.titre,
    cadre: pub.cadre,
    intro: pub.intro,
    accroche: pub.accroche,
    victime: pub.victime,
    journal: pub.journal,
    horloge: { debut: pub.horloge.debut, aube: pub.horloge.aube },
    evenements: pub.evenements.map((e) => ({ heure: e.heure, texte: e.texte, suspect_absent: nul(e.suspect_absent), lieu_perdu: nul(e.lieu_perdu) })),
    suspects: pub.suspects.map((s) => ({
      id: s.id,
      nom: s.nom,
      role: s.role,
      portrait: s.portrait,
      silhouette: s.silhouette,
      visage: s.visage,
      patience: s.patience,
      braque: sec.braque[s.id],
      ricane: sec.ricane[s.id],
      montrer_defaut: sec.montrer[s.id]._defaut.texte,
      montrer: Object.entries(sec.montrer[s.id])
        .filter(([piece]) => piece !== "_defaut")
        .map(([piece, r]) => ({ piece, texte: r.texte, didascalie: nul(r.didascalie), indice: nul(r.indice), fache: !!r.fache })),
      craque: sec.craque?.[s.id]
        ? { pieces: sec.craque[s.id].pieces, texte: sec.craque[s.id].texte, didascalie: nul(sec.craque[s.id].didascalie), indice: nul(sec.craque[s.id].indice) }
        : null,
    })),
    lieux: pub.lieux.map((l) => ({
      id: l.id,
      nom: l.nom,
      decor: l.decor,
      fouille: sec.fouilles[l.id].texte,
      indice: nul(sec.fouilles[l.id].indice),
      apres_evenement: nul(sec.fouilles[l.id].apres_evenement),
    })),
    indices: Object.entries(sec.indices).map(([id, i]) => ({ id, texte: i.texte, nature: i.nature })),
    questions: pub.questions.map((q) => ({
      id: q.id,
      suspect: q.suspect,
      genre: q.genre,
      apres: nul(q.apres),
      requiert: nul(q.requiert),
      texte: q.texte,
      reponse: sec.questions[q.id].texte,
      didascalie: nul(sec.questions[q.id].didascalie),
      indice: nul(sec.questions[q.id].indice),
      fache: !!sec.questions[q.id].fache,
    })),
    mobiles: pub.mobiles,
    solution: sec.solution,
  };
}

// Format plat → format stocké.
export function deplier(plat) {
  const sansVide = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== false));
  return {
    titre: plat.titre,
    public: {
      format: 2,
      cadre: plat.cadre,
      intro: plat.intro,
      accroche: plat.accroche,
      victime: plat.victime,
      journal: plat.journal,
      horloge: { debut: plat.horloge.debut, aube: plat.horloge.aube, couts: COUTS },
      evenements: plat.evenements.map(sansVide),
      suspects: plat.suspects.map((s) => ({
        id: s.id,
        nom: s.nom,
        role: s.role,
        patience: s.patience,
        portrait: s.portrait,
        silhouette: s.silhouette,
        visage: s.visage,
      })),
      lieux: plat.lieux.map((l) => sansVide({ id: l.id, nom: l.nom, decor: l.decor })),
      mobiles: plat.mobiles,
      questions: plat.questions.map((q) => sansVide({ id: q.id, suspect: q.suspect, genre: q.genre, apres: q.apres, requiert: q.requiert, texte: q.texte })),
    },
    secret: {
      questions: Object.fromEntries(
        plat.questions.map((q) => [q.id, sansVide({ texte: q.reponse, didascalie: q.didascalie, indice: q.indice, fache: q.fache })])
      ),
      montrer: Object.fromEntries(
        plat.suspects.map((s) => [
          s.id,
          {
            ...Object.fromEntries(s.montrer.map((m) => [m.piece, sansVide({ texte: m.texte, didascalie: m.didascalie, indice: m.indice, fache: m.fache })])),
            _defaut: { texte: s.montrer_defaut },
          },
        ])
      ),
      braque: Object.fromEntries(plat.suspects.map((s) => [s.id, s.braque])),
      ricane: Object.fromEntries(plat.suspects.map((s) => [s.id, s.ricane])),
      craque: Object.fromEntries(plat.suspects.filter((s) => s.craque).map((s) => [s.id, sansVide(s.craque)])),
      fouilles: Object.fromEntries(plat.lieux.map((l) => [l.id, sansVide({ texte: l.fouille, indice: l.indice, apres_evenement: l.apres_evenement })])),
      indices: Object.fromEntries(plat.indices.map((i) => [i.id, { texte: i.texte, nature: i.nature }])),
      solution: plat.solution,
    },
  };
}

const texte = { type: "string" };
const texteOuNull = { type: ["string", "null"] };
const booleen = { type: "boolean" };
const objet = (props) => ({
  type: "object",
  properties: props,
  required: Object.keys(props),
  additionalProperties: false,
});
const liste = (items) => ({ type: "array", items });
const parmi = (...valeurs) => ({ type: "string", enum: valeurs });

// Pièces des visages et décors dessinés : mêmes listes que src/lib/visuels.ts.
const VISAGE = objet({
  femme: booleen,
  carrure: parmi("fine", "moyenne", "forte"),
  age: parmi("jeune", "mur", "vieux"),
  coiffure: parmi("longs", "carre", "chignon", "courts", "degarni", "rase"),
  chapeau: parmi("aucun", "feutre", "cloche", "beret", "casquette", "melon"),
  pilosite: parmi("aucune", "moustache", "barbe", "favoris"),
  tenue: parmi("costume", "imper", "robe", "gilet", "uniforme", "col-roule"),
  accessoire: parmi("aucun", "cigarette", "lunettes", "monocle", "perles", "voilette", "noeud", "foulard"),
  rouge_levres: booleen,
  ombre: parmi("gauche", "droite"),
});
const DECOR = parmi(
  "bureau", "quai", "bar", "loge", "chambre", "cabine", "compartiment", "couloir", "scene",
  "terrasse", "piscine", "radio", "ecurie", "atelier", "coffre", "phare", "piece",
);

// Schéma JSON du format plat, imposé à Claude via les structured outputs.
export const SCHEMA_PLAT = objet({
  titre: texte,
  cadre: objet({ ville: texte, annee: texte, heure: texte }),
  intro: texte,
  accroche: texte,
  victime: texte,
  journal: objet({ nom: texte, date: texte, prix: texte }),
  horloge: objet({ debut: texte, aube: texte }),
  evenements: liste(objet({ heure: texte, texte, suspect_absent: texteOuNull, lieu_perdu: texteOuNull })),
  suspects: liste(
    objet({
      id: texte,
      nom: texte,
      role: texte,
      portrait: texte,
      silhouette: { type: "integer" },
      visage: VISAGE,
      patience: { type: "integer" },
      braque: texte,
      ricane: texte,
      montrer_defaut: texte,
      montrer: liste(objet({ piece: texte, texte, didascalie: texteOuNull, indice: texteOuNull, fache: booleen })),
      craque: {
        anyOf: [objet({ pieces: liste(texte), texte, didascalie: texteOuNull, indice: texteOuNull }), { type: "null" }],
      },
    })
  ),
  lieux: liste(objet({ id: texte, nom: texte, decor: DECOR, fouille: texte, indice: texteOuNull, apres_evenement: texteOuNull })),
  indices: liste(objet({ id: texte, texte, nature: parmi(...NATURES) })),
  questions: liste(
    objet({
      id: texte,
      suspect: texte,
      genre: parmi("ouverture", "relance", "piste"),
      apres: texteOuNull,
      requiert: texteOuNull,
      texte,
      reponse: texte,
      didascalie: texteOuNull,
      indice: texteOuNull,
      fache: booleen,
    })
  ),
  mobiles: liste(objet({ id: texte, texte })),
  solution: objet({
    coupable: texte,
    mobile: texte,
    occasion: liste(texte),
    preuves: liste(texte),
    une: texte,
    recit: texte,
    rate: texte,
  }),
});

// Lit une affaire écrite à la main, au format stocké ou plat.
export function charger(chemin) {
  const brut = JSON.parse(readFileSync(chemin, "utf8"));
  return brut.secret ? brut : deplier(brut);
}
