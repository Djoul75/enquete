// Teste la migration sur un Postgres en mémoire (PGlite) : simule une partie
// en duel de bout en bout. Usage : node scripts/test-sql.mjs [affaires/x.json]
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { charger } from "../worker/affaire.mjs";

const db = new PGlite();
const JULES = "11111111-1111-1111-1111-111111111111";
const JO = "22222222-2222-2222-2222-222222222222";

// Ce que Supabase fournit et que la migration suppose.
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table profiles (id uuid primary key, full_name text);
  insert into profiles values ('${JULES}', 'Jules'), ('${JO}', 'Joséphine');
`);
await db.exec(readFileSync(new URL("../supabase/migrations/0001_enquete.sql", import.meta.url), "utf8"));
await db.exec(readFileSync(new URL("../supabase/migrations/0002_revelation_indices.sql", import.meta.url), "utf8"));
await db.exec(`insert into enquete_joueurs values ('${JULES}', 'Jules'), ('${JO}', 'Joséphine');`);

const fichier = process.argv[2] ?? new URL("../affaires/01-vieux-port.json", import.meta.url);
const affaire = charger(fichier);
const { rows } = await db.query(
  "insert into enquete_affaires (titre, public) values ($1, $2) returning id",
  [affaire.titre, affaire.public]
);
await db.query("insert into enquete_affaires_secret values ($1, $2)", [rows[0].id, affaire.secret]);

async function en(uid, sql, params = []) {
  await db.exec(`set test.uid = '${uid}'`);
  const r = await db.query(sql, params);
  return r.rows[0] ? Object.values(r.rows[0])[0] : null;
}

function verifier(cond, message) {
  if (!cond) {
    console.error("ÉCHEC :", message);
    process.exit(1);
  }
  console.log("ok -", message);
}

async function doitEchouer(uid, sql, params, message) {
  try {
    await en(uid, sql, params);
  } catch (e) {
    return verifier(true, `${message} (${e.message})`);
  }
  verifier(false, message);
}

const accueil = await en(JULES, "select enquete_accueil()");
verifier(accueil.restantes_duel === 1, "une affaire disponible");

const partie = await en(JULES, "select enquete_nouvelle_partie('duel')");
let etat = await en(JO, "select enquete_etat($1)", [partie]);
verifier(etat.revelation === null && !JSON.stringify(etat).includes(affaire.secret.solution.recit), "la solution ne fuit pas");

const pub = affaire.public;
const libre = pub.questions.find((q) => !q.requiert);
const bloquee = pub.questions.find((q) => q.requiert);
etat = await en(JULES, "select enquete_poser_question($1, $2)", [partie, libre.id]);
verifier(etat.journal.length === 1 && etat.journal[0].texte === affaire.secret.questions[libre.id].texte, "question posée, réponse reçue");
if (bloquee) {
  await doitEchouer(JULES, "select enquete_poser_question($1, $2)", [partie, bloquee.id], "question verrouillée refusée");
}

// Jules trouve un indice qui sert de preuve, puis accuse.
let preuve = null;
for (const lieu of pub.lieux.slice(0, 3)) {
  etat = await en(JULES, "select enquete_fouiller($1, $2)", [partie, lieu.id]);
}
await doitEchouer(JULES, "select enquete_fouiller($1, $2)", [partie, pub.lieux[3].id], "4e fouille refusée");
preuve = etat.journal.find((e) => e.indice)?.indice.id;
verifier(preuve, "au moins un indice trouvé en fouillant");

const sol = affaire.secret.solution;
etat = await en(JULES, "select enquete_accuser($1, $2, $3, $4)", [partie, sol.coupable, sol.mobile, preuve]);
verifier(etat.partie.echeance && !etat.partie.revelee, "Jules accuse : échéance de 24 h, pas encore révélé");
await doitEchouer(JULES, "select enquete_poser_question($1, $2)", [partie, libre.id], "plus d'action après avoir accusé");

etat = await en(JO, "select enquete_etat($1)", [partie]);
verifier(etat.autres[0].a_accuse && etat.revelation === null, "Joséphine voit que Jules a accusé, sans savoir qui");

// Joséphine laisse filer le délai.
await db.exec(`update enquete_parties set echeance = now() - interval '1 minute' where id = ${partie}`);
etat = await en(JO, "select enquete_etat($1)", [partie]);
verifier(etat.partie.revelee && etat.revelation.solution.coupable === sol.coupable, "délai passé : révélation");
const scores = Object.fromEntries(etat.revelation.joueurs.map((j) => [j.nom, j.score]));
verifier(scores["Joséphine"] === 0 && scores["Jules"] >= 70, `scores ${JSON.stringify(scores)}`);

await doitEchouer(JULES, "select enquete_nouvelle_partie('duel')", [], "plus d'affaire disponible");
await doitEchouer(
  "33333333-3333-3333-3333-333333333333",
  "select enquete_accueil()",
  [],
  "un inconnu n'a pas accès"
);
console.log("Tout est bon.");
