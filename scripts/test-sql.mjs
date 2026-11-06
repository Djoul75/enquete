// Teste la migration sur un Postgres en mémoire (PGlite) : agences,
// associés, rendez-vous au bureau, puis une nuit à trois de bout en bout
// (horloge, patience, suspect braqué qui craque, événements, verdicts).
// Usage : node scripts/test-sql.mjs [affaires/v2/x.json]
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
for (const m of ["0001_agence.sql", "0002_compte.sql", "0003_tampons.sql", "0004_nuit.sql"]) {
  await db.exec(readFileSync(new URL(`../supabase/migrations/${m}`, import.meta.url), "utf8"));
}

// Une affaire de l'ancienne règle (pour les archives), puis celles de la nuit.
const ancienne = JSON.parse(readFileSync(new URL("../affaires/01-vieux-port.json", import.meta.url), "utf8"));
{
  const { rows } = await db.query("insert into enquete_affaires (titre, public) values ($1, $2) returning id", [ancienne.titre, ancienne.public]);
  await db.query("insert into enquete_affaires_secret values ($1, $2)", [rows[0].id, ancienne.secret]);
}
const fichiers = process.argv[2] ? [process.argv[2]] : [new URL("../affaires/v2/01-vieux-port.json", import.meta.url)];
const affaires = fichiers.map((f) => charger(f));
// Une seconde affaire pour la revanche et la partie seul.
if (affaires.length === 1) affaires.push({ ...affaires[0], titre: `${affaires[0].titre} (bis)` });
for (const affaire of affaires) {
  const { rows } = await db.query("insert into enquete_affaires (titre, public, regle) values ($1, $2, 2) returning id", [affaire.titre, affaire.public]);
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

// --- La nuit --------------------------------------------------------------
let etat = await en(JO, "select enquete_etat($1)", [partie]);
const affaire = affaires.find((a) => a.titre === etat.affaire.titre);
verifier(etat.regle === 2 && etat.revelation === null && !JSON.stringify(etat).includes(affaire.secret.solution.recit), "la solution ne fuit pas");
verifier(etat.autres.length === 2, "trois privés sur l'affaire");
verifier(etat.nuit.minutes === 0 && etat.nuit.aube === 240, "la nuit commence, 4 heures avant l'aube");

const pub = affaire.public;
const sol = affaire.secret.solution;
const ouvertes = () => etat.nuit.ouvertes;
const poser = async (uid, q) => (etat = await en(uid, "select enquete_poser_question($1, $2)", [partie, q]));
const montrer = async (uid, s, p) => (etat = await en(uid, "select enquete_montrer($1, $2, $3)", [partie, s, p]));
const fouiller = async (uid, l) => (etat = await en(uid, "select enquete_fouiller($1, $2)", [partie, l]));

verifier(ouvertes().every((id) => pub.questions.find((q) => q.id === id).genre === "ouverture"), "au départ, seulement les questions d'ouverture");
const ouverture = pub.questions.find((q) => q.genre === "ouverture" && pub.questions.some((r) => r.apres === q.id));
const relance = pub.questions.find((r) => r.apres === ouverture.id);
await doitEchouer(JULES, "select enquete_poser_question($1, $2)", [partie, relance.id], "pas de relance avant sa question");
await poser(JULES, ouverture.id);
verifier(etat.nuit.minutes === 10 && etat.journal[0].texte === affaire.secret.questions[ouverture.id].texte, "question posée : +10 min");
verifier(ouvertes().includes(relance.id), "la relance apparaît");
await poser(JULES, relance.id);
verifier(etat.nuit.minutes === 15, "relance : +5 min");
await doitEchouer(JULES, "select enquete_poser_question($1, $2)", [partie, relance.id], "pas deux fois la même question");

// Ferrand : deux crans. Le chemin de Sauveur mène au quai, la fouille donne la douille.
await poser(JULES, "sauveur-comptoir");
await poser(JULES, "sauveur-retour");
verifier(ouvertes().includes("ferrand-retour"), "l'indice ouvre une piste chez Ferrand");
await poser(JULES, "ferrand-soir");
await poser(JULES, "ferrand-retour");
verifier(etat.nuit.patience.ferrand === 1 && etat.journal.at(-1).fache, "question qui fâche : un cran de moins");
await poser(JULES, "lola-soir");
await poser(JULES, "lola-tel");
await poser(JULES, "lola-ferrand");
await poser(JULES, "ferrand-enveloppes");
verifier(etat.nuit.braques.includes("ferrand") && etat.journal.at(-1).braque, "plus de patience : Ferrand se braque");
verifier(!ouvertes().some((id) => id.startsWith("ferrand-")), "un suspect braqué n'a plus de questions");
await doitEchouer(JULES, "select enquete_poser_question($1, $2)", [partie, "ferrand-marchetti"], "on n'interroge pas un suspect braqué");
await montrer(JULES, "ferrand", "telephone");
verifier(etat.journal.at(-1).ricane && etat.nuit.braques.includes("ferrand"), "mauvaise pièce : il ricane, toujours braqué");
await doitEchouer(JULES, "select enquete_montrer($1, $2, $3)", [partie, "ferrand", "telephone"], "pas deux fois la même pièce");
await doitEchouer(JULES, "select enquete_montrer($1, $2, $3)", [partie, "ferrand", "douille"], "on ne montre que ce qu'on a trouvé");
const avantFouille = etat.nuit.minutes;
await fouiller(JULES, "quai");
verifier(etat.nuit.minutes === avantFouille + 30 && etat.indices.some((i) => i.id === "douille"), "fouille du quai : +30 min, la douille");
await doitEchouer(JULES, "select enquete_fouiller($1, $2)", [partie, "quai"], "pas deux fouilles au même endroit");
await montrer(JULES, "ferrand", "douille");
verifier(etat.journal.at(-1).craque && !etat.nuit.braques.includes("ferrand") && etat.nuit.patience.ferrand === 1, "la bonne pièce : Ferrand craque");
verifier(etat.indices.some((i) => i.id === "lapsus"), "il lâche le lapsus");
await fouiller(JULES, "bar");
verifier(!etat.journal.at(-1).indice, "le bar ne donne rien");
const minutesJules = etat.nuit.minutes;

etat = await en(JULES, "select enquete_accuser($1, $2, $3, $4, $5)", [partie, sol.coupable, sol.mobile, "retour", "lapsus"]);
verifier(etat.partie.echeance && !etat.partie.revelee && etat.moi.accusation.minutes === minutesJules, "Jules signe : heure notée, 24 h pour les autres");
await doitEchouer(JULES, "select enquete_poser_question($1, $2)", [partie, "irene-alibi"], "plus d'action après avoir signé");

// Marco traîne : les événements tombent, puis l'aube.
for (const q of ["lola-alibi", "lola-rapports", "irene-alibi", "irene-soucis", "irene-coffre", "irene-ferrand", "sauveur-vu", "sauveur-coup", "sauveur-ennemis"]) await poser(MARCO, q);
for (const l of ["bureau", "loge", "bar"]) await fouiller(MARCO, l);
verifier(etat.nuit.minutes === 165, `Marco à ${etat.nuit.minutes} min`);
await poser(MARCO, "lola-quitter");
await poser(MARCO, "lola-meurtre");
verifier(etat.nuit.minutes === 180 && etat.nuit.absents.includes("irene"), "4 h 30 passées : Irène est partie");
await doitEchouer(MARCO, "select enquete_montrer($1, $2, $3)", [partie, "irene", "rupture"], "on ne parle plus à un suspect parti");
await fouiller(MARCO, "quai");
verifier(etat.journal.at(-1).perdu && !etat.indices.some((i) => i.id === "douille"), "après 5 h, le quai est lavé");
await poser(MARCO, "ferrand-soir");
await poser(MARCO, "ferrand-qui");
await poser(MARCO, "ferrand-marchetti");
verifier(etat.nuit.minutes === 240, "l'aube");
await doitEchouer(MARCO, "select enquete_poser_question($1, $2)", [partie, "ferrand-heure"], "à l'aube, plus de question");
await doitEchouer(MARCO, "select enquete_accuser($1, $2, $3, $4, $5)", [partie, "irene", "fuite", null, "douille"], "on ne verse au dossier que son mur");
etat = await en(MARCO, "select enquete_accuser($1, $2, $3, $4, $5)", [partie, "irene", "fuite", null, "bijoux"]);
verifier(!etat.partie.revelee, "Marco signe à l'aube, Joséphine n'a pas encore signé");

etat = await en(JO, "select enquete_etat($1)", [partie]);
verifier(etat.autres.every((a) => a.a_accuse) && etat.revelation === null, "Joséphine voit qu'on a signé, sans savoir qui");
await poser(JO, "sauveur-comptoir");
etat = await en(JO, "select enquete_accuser($1, $2, $3, $4, $5)", [partie, sol.coupable, sol.mobile, null, null]);
verifier(etat.partie.revelee && etat.revelation.solution.coupable === sol.coupable, "tout le monde a signé : révélation");
const verdicts = Object.fromEntries(etat.revelation.joueurs.map((j) => [j.nom, j.verdict]));
verifier(verdicts.Jules === "condamne" && verdicts["Joséphine"] === "relache" && verdicts.Marco === "erreur", `verdicts ${JSON.stringify(verdicts)}`);
verifier(etat.revelation.joueurs.map((j) => j.nom).join() === "Jules,Joséphine,Marco", "classement par verdict");

accueil = await en(JULES, "select enquete_accueil()");
verifier(accueil.moi.resolues === 1 && accueil.moi.record === 120 + minutesJules && accueil.bureaux.length === 0, "l'accueil compte l'affaire résolue et le record");
let tampons = Object.fromEntries((await en(JULES, "select enquete_tampons()")).map((t) => [t.cle, t]));
verifier(tampons.premiere.obtenu_at && tampons.premiere.partie === partie && !tampons.premiere.vu, "tampon : première affaire");
verifier(!tampons.econome.obtenu_at && tampons.premier_table.obtenu_at && tampons.flair.obtenu_at, "tampons : dossier parfait, premier à table, pas assez rapide");
verifier(!tampons.tablee.obtenu_at && tampons.dix.progres === 1 && tampons.dix.sur === 10, "dix dossiers à 1/10");
verifier(tampons.associes.progres === 2 && !tampons.associes.obtenu_at, "deux associés sur trois");
verifier(!(await en(JO, "select enquete_tampons()")).find((t) => t.cle === "premiere").obtenu_at, "Joséphine n'a rien résolu");
await en(JULES, "select enquete_tampons_vus(array['premiere', 'flair'])");
await en(JULES, "select enquete_tampons_vus(array['premiere'])");
tampons = Object.fromEntries((await en(JULES, "select enquete_tampons()")).map((t) => [t.cle, t]));
verifier(tampons.premiere.vu && tampons.flair.vu && !tampons.premier_table.vu, "tampons marqués comme vus");
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
// --- Ancienne règle ------------------------------------------------------
verifier(!(await en(JULES, "select enquete_dossiers_possibles(array['Marco'])")).some((d) => d.id === 1), "l'ancienne affaire n'est plus proposée");
await db.exec(`insert into enquete_parties (id, affaire_id, mode, cree_par, lancee_at, revelee_at) overriding system value values (900, 1, 'solo', '${JULES}', now(), now()), (901, 1, 'solo', '${JO}', now(), null)`);
await db.exec(`insert into enquete_participants (partie_id, user_id, accuse_suspect, accuse_at, score) values (900, '${JULES}', 'ferrand', now(), 90), (901, '${JO}', null, null, null)`);
etat = await en(JULES, "select enquete_etat(900)");
verifier(etat.regle === 1 && etat.revelation.joueurs[0].score === 90, "une ancienne affaire close se relit");
await doitEchouer(JO, "select enquete_etat(901)", [], "une ancienne affaire en cours est rangée");
verifier(!(await en(JO, "select enquete_accueil()")).parties.some((p) => p.id === 901), "elle disparaît de l'accueil");
accueil = await en(JULES, "select enquete_accueil()");
verifier(accueil.moi.resolues === 2 && accueil.parties.find((p) => p.id === 900).regle === 1, "l'ancienne affaire résolue compte toujours");

console.log("Tout est bon.");
