// Captures d'écran du site sans toucher à Supabase : les appels RPC sont
// interceptés par Playwright et joués sur un Postgres en mémoire (PGlite)
// avec la vraie migration. Usage (site servi par `npx vite preview`) :
//   node scripts/captures.mjs <dossier de sortie>
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { charger } from "../worker/affaire.mjs";

const { chromium } = createRequire("/home/ubuntu/shots-tool/package.json")("playwright");
const SORTIE = process.argv[2] ?? "captures";
const SITE = "http://127.0.0.1:4173/enquete/";
mkdirSync(SORTIE, { recursive: true });

const JULES = "11111111-1111-1111-1111-111111111111";
const JO = "22222222-2222-2222-2222-222222222222";
const MARCO = "33333333-3333-3333-3333-333333333333";
const LEA = "55555555-5555-5555-5555-555555555555";
const NOUVEAU = "44444444-4444-4444-4444-444444444444";
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  insert into auth.users values ('${JULES}'), ('${JO}'), ('${MARCO}'), ('${LEA}'), ('${NOUVEAU}');
`);
await db.exec(readFileSync(new URL("../supabase/migrations/0001_agence.sql", import.meta.url), "utf8"));
await db.exec(`insert into enquete_joueurs (user_id, pseudo, admin) values
  ('${JULES}', 'Jules', true), ('${JO}', 'Joséphine', false), ('${MARCO}', 'Marco', false), ('${LEA}', 'Léa', false);
  insert into enquete_amities (de, a, acceptee_at) values
  ('${JULES}', '${JO}', now()), ('${JULES}', '${MARCO}', now()), ('${JULES}', '${LEA}', now());`);
for (const f of ["01-vieux-port", "02-train-bleu", "03-derniere-prise"]) {
  const a = charger(new URL(`../affaires/${f}.json`, import.meta.url));
  const { rows } = await db.query("insert into enquete_affaires (titre, public) values ($1, $2) returning id", [a.titre, a.public]);
  await db.query("insert into enquete_affaires_secret values ($1, $2)", [rows[0].id, a.secret]);
}

let uid = JULES;
async function rpc(fn, args) {
  await db.exec(`set test.uid = '${uid}'`);
  const noms = Object.keys(args);
  const sql = `select ${fn}(${noms.map((n, i) => `${n} => $${i + 1}`).join(", ")}) as r`;
  const { rows } = await db.query(sql, Object.values(args));
  return rows[0]?.r ?? null;
}

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript((id) => {
  if (!id) return;
  const dans = Math.floor(Date.now() / 1000) + 3600;
  localStorage.setItem(
    "enquete-agence",
    JSON.stringify({
      access_token: "x.eyJzdWIiOiIxIn0.x",
      refresh_token: "x",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: dans,
      user: { id, aud: "authenticated", email: "jules@example.com" },
    })
  );
}, JULES);
await page.route("**/rest/v1/rpc/**", async (route) => {
  const fn = route.request().url().split("/rpc/")[1].split("?")[0];
  try {
    const r = await rpc(fn, JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(r) });
  } catch (e) {
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: e.message, code: "P0001" }) });
  }
});
await page.route("**/auth/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
page.on("pageerror", (e) => console.error("erreur page :", e.message));

async function capture(nom, hash, pleinePage = true) {
  // Changer seulement le « # » ne recharge pas la page : on force.
  await page.goto(SITE + hash);
  await page.reload();
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: pleinePage });
  console.log("capturé", nom);
}

// Le parcours d'un nouveau venu : connexion, code, nom d'agence.
const vierge = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await vierge.goto(SITE);
await vierge.waitForTimeout(800);
await vierge.screenshot({ path: `${SORTIE}/a1-connexion.png` });
await vierge.fill("#email", "marco.p@gmail.com");
await vierge.route("**/auth/v1/otp**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
await vierge.click("button.gros-bouton");
await vierge.waitForTimeout(500);
await vierge.keyboard.type("4170");
await vierge.waitForTimeout(400);
await vierge.screenshot({ path: `${SORTIE}/a2-code.png` });
await vierge.close();

uid = NOUVEAU;
const nouveau = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await nouveau.addInitScript((id) => {
  localStorage.setItem("enquete-agence", JSON.stringify({ access_token: "x.eyJzdWIiOiIxIn0.x", refresh_token: "x", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, aud: "authenticated", email: "n@example.com" } }));
}, NOUVEAU);
await nouveau.route("**/rest/v1/rpc/**", async (route) => {
  const fn = route.request().url().split("/rpc/")[1].split("?")[0];
  try {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(await rpc(fn, JSON.parse(route.request().postData() || "{}"))) });
  } catch (e) {
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: e.message, code: "P0001" }) });
  }
});
await nouveau.route("**/auth/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
await nouveau.goto(SITE);
await nouveau.waitForTimeout(800);
await nouveau.fill("#pseudo", "Sam_K");
await nouveau.waitForTimeout(900);
await nouveau.screenshot({ path: `${SORTIE}/a3-pseudo.png` });
await nouveau.close();
await rpc("enquete_choisir_pseudo", { p_pseudo: "Sam_K" });
uid = JULES;

// Jules a reçu une demande d'association de Sam_K.
await db.exec(`insert into enquete_amities (de, a) values ('${NOUVEAU}', '${JULES}');`);
await capture("b1-dossiers-vide", "#/");
await capture("b2-associes", "#/associes");
await capture("b3-preparer", "#/preparer", false);

// Jules donne rendez-vous à Joséphine, Marco et Léa ; Joséphine s'assoit.
const rdv = await rpc("enquete_preparer", { p_pseudos: ["Joséphine", "Marco", "Léa"], p_affaire: null });
uid = JO;
await rpc("enquete_bureau", { p_partie: rdv });
uid = LEA;
await rpc("enquete_quitter_bureau", { p_partie: rdv });
uid = JULES;
await capture("c1-bureau-hote", `#/bureau/${rdv}`, false);
await capture("c2-dossiers-rdv", "#/");

// Marco invite Jules à son tour : vue d'un invité.
await db.exec(`insert into enquete_amities (de, a, acceptee_at) values ('${MARCO}', '${JO}', now()) on conflict do nothing`);
uid = MARCO;
const rdvMarco = await rpc("enquete_preparer", { p_pseudos: ["Jules", "Joséphine"], p_affaire: null });
uid = JULES;
await capture("c3-dossiers-invitation", "#/");
await capture("c4-bureau-invite", `#/bureau/${rdvMarco}`, false);

// Marco s'assoit au premier bureau, Jules ouvre l'enveloppe.
uid = MARCO;
await rpc("enquete_bureau", { p_partie: rdv });
uid = JULES;
await capture("c5-bureau-complet", `#/bureau/${rdv}`, false);
await rpc("enquete_ouvrir_dossier", { p_partie: rdv });
const partie = rdv;
const affaireOuverte = (await rpc("enquete_etat", { p_partie: partie })).affaire;
console.log("dossier tiré :", affaireOuverte.titre);
const pub = affaireOuverte.public;
const secret = (await db.query("select secret from enquete_affaires_secret where affaire_id = $1", [affaireOuverte.id])).rows[0].secret;

for (const q of pub.questions.filter((q) => !q.requiert).slice(0, 5)) {
  await rpc("enquete_poser_question", { p_partie: partie, p_question: q.id });
}
for (const l of pub.lieux.slice(0, 2)) await rpc("enquete_fouiller", { p_partie: partie, p_lieu: l.id });

// Joséphine accuse la mauvaise personne.
uid = JO;
await rpc("enquete_fouiller", { p_partie: partie, p_lieu: pub.lieux[0].id });
const preuveJo = (await rpc("enquete_etat", { p_partie: partie })).journal.find((e) => e.indice)?.indice.id;
const faux = pub.suspects.find((x) => x.id !== secret.solution.coupable).id;
if (preuveJo) await rpc("enquete_accuser", { p_partie: partie, p_suspect: faux, p_mobile: pub.mobiles[0].id, p_preuve: preuveJo });
uid = JULES;

await capture("d1-dossiers-en-cours", "#/");
await capture("d2-telegramme", `#/p/${partie}`, false);
await page.evaluate((id) => localStorage.setItem(`enquete-telegramme-${id}`, "1"), partie);
await capture("d3-scene", `#/p/${partie}`, false);
await capture("d4-accusation", `#/p/${partie}/accuser`, false);
await capture("00-regles", "#/regles");

const etat = await rpc("enquete_etat", { p_partie: partie });
const preuve = etat.journal.find((e) => e.indice)?.indice.id;
await rpc("enquete_accuser", { p_partie: partie, p_suspect: secret.solution.coupable, p_mobile: secret.solution.mobile, p_preuve: preuve });
uid = MARCO;
await rpc("enquete_fouiller", { p_partie: partie, p_lieu: pub.lieux[1].id });
const preuveMarco = (await rpc("enquete_etat", { p_partie: partie })).journal.find((e) => e.indice)?.indice.id;
if (preuveMarco) await rpc("enquete_accuser", { p_partie: partie, p_suspect: secret.solution.coupable, p_mobile: pub.mobiles[1].id, p_preuve: preuveMarco });
uid = JULES;
await capture("e1-revelation", `#/p/${partie}`);
await capture("e2-archives", "#/archives");

await navigateur.close();
