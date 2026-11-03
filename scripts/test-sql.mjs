// Teste la migration sur un Postgres en mémoire (PGlite) : agences,
// associés, rendez-vous au bureau, puis une partie à trois de bout en bout.
// Usage : node scripts/test-sql.mjs [affaires/x.json]
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { charger } from "../worker/affaire.mjs";

const db = new PGlite();
const JULES = "11111111-1111-1111-1111-111111111111";
const JO = "22222222-2222-2222-2222-222222222222";
const MARCO = "33333333-3333-3333-3333-333333333333";
const INCONNU = "44444444-4444-4444-4444-444444444444";

// Ce que Supabase fournit et que la migration suppose.
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  insert into auth.users values ('${JULES}'), ('${JO}'), ('${MARCO}'), ('${INCONNU}');
`);
for (const m of ["0001_agence.sql", "0002_compte.sql"]) {
  await db.exec(readFileSync(new URL(`../supabase/migrations/${m}`, import.meta.url), "utf8"));
}

const fichiers = process.argv[2]
  ? [process.argv[2]]
  : ["../affaires/01-vieux-port.json", "../affaires/02-train-bleu.json"].map((f) => new URL(f, import.meta.url));
const affaires = fichiers.map((f) => charger(f));
for (const affaire of affaires) {
  const { rows } = await db.query("insert into enquete_affaires (titre, public) values ($1, $2) returning id", [affaire.titre, affaire.public]);
  await db.query("insert into enquete_affaires_secret values ($1, $2)", [rows[0].id, affaire.secret]);
}

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

// --- Agences --------------------------------------------------------------
const moi = await en(JULES, "select enquete_moi()");
verifier(moi.pseudo === null, "un nouveau compte n'a pas encore de nom");
await doitEchouer(JULES, "select enquete_accueil()", [], "pas d'accueil sans nom d'agence");
verifier(!(await en(JULES, "select enquete_pseudo_libre('ab')")), "pseudo trop court refusé");
await en(JULES, "select enquete_choisir_pseudo('Jules')");
await en(JO, "select enquete_choisir_pseudo('Joséphine')");
await en(MARCO, "select enquete_choisir_pseudo('Marco')");
verifier(!(await en(INCONNU, "select enquete_pseudo_libre('JULES')")), "pseudo pris, majuscules ignorées");
await doitEchouer(INCONNU, "select enquete_choisir_pseudo('jules')", [], "pas deux portes au même nom");
await doitEchouer(INCONNU, "select enquete_choisir_pseudo('a b c')", [], "espaces refusés");
await doitEchouer(JULES, "select enquete_choisir_pseudo('Autre')", [], "choisir un nom ne sert qu'une fois");

// --- Associés -------------------------------------------------------------
verifier((await en(JULES, "select enquete_ajouter_associe('joséphine')")) === "demande", "Jules demande Joséphine");
let assoc = await en(JO, "select enquete_associes()");
verifier(assoc.recues[0] === "Jules" && assoc.amis.length === 0, "Joséphine voit la demande");
await en(JO, "select enquete_repondre_associe('Jules', true)");
verifier((await en(JULES, "select enquete_ajouter_associe('Marco')")) === "demande", "Jules demande Marco");
verifier((await en(MARCO, "select enquete_ajouter_associe('jules')")) === "associes", "demande croisée : associés d'office");
await doitEchouer(JULES, "select enquete_ajouter_associe('Personne')", [], "pseudo inconnu");
await doitEchouer(JULES, "select enquete_ajouter_associe('Jules')", [], "pas soi-même");
assoc = await en(JULES, "select enquete_associes()");
verifier(assoc.amis.map((a) => a.pseudo).join() === "Joséphine,Marco", "Jules a deux associés");
await doitEchouer(JO, "select enquete_preparer(array['Marco'], null)", [], "on ne convoque que ses associés");

// --- Compte et recherche --------------------------------------------------
let trouves = await en(JO, "select enquete_chercher_agences('ma')");
verifier(trouves.length === 1 && trouves[0].pseudo === "Marco" && trouves[0].lien === null, "Joséphine trouve Marco en tapant « ma »");
trouves = await en(JULES, "select enquete_chercher_agences('o')");
verifier(trouves.length === 0, "une seule lettre : pas de suggestion");
trouves = await en(JULES, "select enquete_chercher_agences('rc')");
verifier(trouves[0]?.lien === "associe", "le lien existant est indiqué");
verifier((await en(JULES, "select enquete_chercher_agences('j_')")).length === 0, "le _ tapé n'est pas un joker");
await doitEchouer(JULES, "select enquete_renommer('Marco')", [], "on ne prend pas le nom d'un autre");
await en(JULES, "select enquete_renommer('JULES')");
await en(JULES, "select enquete_renommer('Sherlock')");
verifier((await en(JULES, "select enquete_moi()")).pseudo === "Sherlock", "Jules change le nom sur sa porte");
verifier((await en(JO, "select enquete_associes()")).amis[0].pseudo === "Sherlock", "ses associés voient le nouveau nom");
await en(JULES, "select enquete_renommer('Jules')");

// --- Rendez-vous au bureau ------------------------------------------------
const possibles = await en(JULES, "select enquete_dossiers_possibles(array['Joséphine','Marco'])");
verifier(possibles.length === affaires.length, `${possibles.length} dossiers jamais lus`);
const partie = await en(JULES, "select enquete_preparer(array['Joséphine','Marco'], null)");
let accueil = await en(JO, "select enquete_accueil()");
verifier(accueil.bureaux[0]?.hote === "Jules" && accueil.bureaux[0].mon_statut === "invite", "Joséphine voit le rendez-vous");
await doitEchouer(JO, "select enquete_ouvrir_dossier($1)", [partie], "seul l'hôte ouvre le dossier");
await doitEchouer(JO, "select enquete_etat($1)", [partie], "pas d'enquête avant l'ouverture");
let bureau = await en(JO, "select enquete_bureau($1)", [partie]);
verifier(bureau.participants.filter((p) => p.statut === "present").length === 2 && !bureau.affaire, "Joséphine s'assoit, enveloppe cachetée");
bureau = await en(MARCO, "select enquete_bureau($1)", [partie]);
verifier(bureau.participants.every((p) => p.statut === "present"), "Marco s'assoit, tout le monde est là");
await en(JULES, "select enquete_ouvrir_dossier($1)", [partie]);
bureau = await en(MARCO, "select enquete_bureau($1)", [partie]);
verifier(bureau.lancee, "le bureau sait que le dossier est ouvert");

// --- La partie ------------------------------------------------------------
let etat = await en(JO, "select enquete_etat($1)", [partie]);
const affaire = affaires.find((a) => a.titre === etat.affaire.titre);
verifier(etat.revelation === null && !JSON.stringify(etat).includes(affaire.secret.solution.recit), "la solution ne fuit pas");
verifier(etat.autres.length === 2, "trois privés sur l'affaire");

const pub = affaire.public;
const libre = pub.questions.find((q) => !q.requiert);
const bloquee = pub.questions.find((q) => q.requiert);
etat = await en(JULES, "select enquete_poser_question($1, $2)", [partie, libre.id]);
verifier(etat.journal.length === 1 && etat.journal[0].texte === affaire.secret.questions[libre.id].texte, "question posée, réponse reçue");
if (bloquee) {
  await doitEchouer(JULES, "select enquete_poser_question($1, $2)", [partie, bloquee.id], "question verrouillée refusée");
}

for (const lieu of pub.lieux.slice(0, 3)) {
  etat = await en(JULES, "select enquete_fouiller($1, $2)", [partie, lieu.id]);
}
await doitEchouer(JULES, "select enquete_fouiller($1, $2)", [partie, pub.lieux[3].id], "4e fouille refusée");
const preuve = etat.journal.find((e) => e.indice)?.indice.id;
verifier(preuve, "au moins un indice trouvé en fouillant");

const sol = affaire.secret.solution;
etat = await en(JULES, "select enquete_accuser($1, $2, $3, $4)", [partie, sol.coupable, sol.mobile, preuve]);
verifier(etat.partie.echeance && !etat.partie.revelee, "Jules accuse : échéance de 24 h, pas encore révélé");
await doitEchouer(JULES, "select enquete_poser_question($1, $2)", [partie, libre.id], "plus d'action après avoir accusé");

etat = await en(MARCO, "select enquete_fouiller($1, $2)", [partie, pub.lieux[0].id]);
const preuveMarco = etat.journal.find((e) => e.indice)?.indice.id;
if (preuveMarco) {
  const autre = pub.suspects.find((s) => s.id !== sol.coupable).id;
  etat = await en(MARCO, "select enquete_accuser($1, $2, $3, $4)", [partie, autre, sol.mobile, preuveMarco]);
  verifier(!etat.partie.revelee, "Marco accuse, Joséphine n'a pas encore accusé");
}

etat = await en(JO, "select enquete_etat($1)", [partie]);
verifier(etat.autres[0].a_accuse && etat.revelation === null, "Joséphine voit qu'on a accusé, sans savoir qui");

await db.exec(`update enquete_parties set echeance = now() - interval '1 minute' where id = ${partie}`);
etat = await en(JO, "select enquete_etat($1)", [partie]);
verifier(etat.partie.revelee && etat.revelation.solution.coupable === sol.coupable, "délai passé : révélation");
const scores = Object.fromEntries(etat.revelation.joueurs.map((j) => [j.nom, j.score]));
verifier(scores["Joséphine"] === 0 && scores["Jules"] >= 70 && etat.revelation.joueurs[0].nom === "Jules", `classement ${JSON.stringify(scores)}`);

accueil = await en(JULES, "select enquete_accueil()");
verifier(accueil.moi.resolues === 1 && accueil.moi.record >= 70 && accueil.bureaux.length === 0, "l'accueil compte l'affaire résolue");
assoc = await en(JULES, "select enquete_associes()");
verifier(assoc.amis.find((a) => a.pseudo === "Joséphine").moi_devant === 1, "bilan entre associés");

// --- Revanche, dossiers déjà lus, départs ---------------------------------
const revanche = await en(JO, "select enquete_revanche($1)", [partie]);
bureau = await en(JO, "select enquete_bureau($1)", [revanche]);
verifier(bureau.participants.map((p) => p.pseudo).sort().join() === "Joséphine,Jules", "revanche avec ses seuls associés");
await en(JULES, "select enquete_quitter_bureau($1)", [revanche]);
bureau = await en(JO, "select enquete_bureau($1)", [revanche]);
verifier(bureau.participants.find((p) => p.pseudo === "Jules").statut === "decline", "Jules décline");
await doitEchouer(JO, "select enquete_ouvrir_dossier($1)", [revanche], "seule au bureau, on n'ouvre pas");
await en(JO, "select enquete_quitter_bureau($1)", [revanche]);
await doitEchouer(JO, "select enquete_bureau($1)", [revanche], "l'hôte part : rendez-vous annulé");

const lue = (await en(JULES, "select enquete_dossiers_possibles(array['Marco'])")).map((d) => d.titre);
verifier(!lue.includes(affaire.titre), "le dossier lu n'est plus proposé");
await doitEchouer(JULES, "select enquete_preparer(array['Marco'], $1)", [etat.affaire.id], "on ne propose pas un dossier déjà lu");

const solo = await en(MARCO, "select enquete_nouvelle_partie('solo')");
etat = await en(MARCO, "select enquete_etat($1)", [solo]);
verifier(etat.affaire.titre !== affaire.titre || affaires.length === 1, "seul : une affaire pas encore lue");

await doitEchouer(JULES, "select enquete_demander_affaire()", [], "nouvelle affaire réservée à l'admin");
await db.exec(`update enquete_joueurs set admin = true where user_id = '${JULES}'`);
await en(JULES, "select enquete_demander_affaire()");
verifier((await en(JULES, "select enquete_accueil()")).demande_en_cours, "l'admin fait écrire une affaire");
await doitEchouer(INCONNU, "select enquete_accueil()", [], "un compte sans agence n'a pas accès");
console.log("Tout est bon.");
