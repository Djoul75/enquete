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
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table profiles (id uuid primary key, full_name text);
  insert into profiles values ('${JULES}', 'Jules'), ('${JO}', 'Joséphine');
`);
await db.exec(readFileSync(new URL("../supabase/migrations/0001_enquete.sql", import.meta.url), "utf8"));
await db.exec(`insert into enquete_joueurs values ('${JULES}', 'Jules'), ('${JO}', 'Joséphine');`);
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
await page.addInitScript(() => {
  const dans = Math.floor(Date.now() / 1000) + 3600;
  localStorage.setItem(
    "enquete-auth",
    JSON.stringify({
      access_token: "x.eyJzdWIiOiIxIn0.x",
      refresh_token: "x",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: dans,
      user: { id: "11111111-1111-1111-1111-111111111111", aud: "authenticated", email: "jules@example.com" },
    })
  );
});
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
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: pleinePage });
  console.log("capturé", nom);
}

// Une partie en duel bien avancée côté Jules.
await capture("01-dossiers-vide", "#/");
uid = JULES;
const partie = await rpc("enquete_nouvelle_partie", { p_mode: "duel" });
for (const q of ["ferrand-soir", "sauveur-retour", "irene-soucis", "irene-coffre", "lola-soir"]) {
  await rpc("enquete_poser_question", { p_partie: partie, p_question: q });
}
await rpc("enquete_fouiller", { p_partie: partie, p_lieu: "quai" });
await rpc("enquete_fouiller", { p_partie: partie, p_lieu: "bureau" });
await rpc("enquete_poser_question", { p_partie: partie, p_question: "ferrand-douille" });
await rpc("enquete_sauver_notes", { p_partie: partie, p_notes: "Ferrand ment sur l'heure ? Sauveur l'a vu revenir. Qui a un 7.65…" });

// Joséphine accuse la mauvaise personne.
uid = JO;
await rpc("enquete_poser_question", { p_partie: partie, p_question: "ferrand-qui" });
await rpc("enquete_accuser", { p_partie: partie, p_suspect: "irene", p_mobile: "heritage", p_preuve: "bijoux" });
uid = JULES;

await capture("02-dossiers", "#/");
await capture("03-telegramme", `#/p/${partie}`, false);
await page.evaluate((id) => localStorage.setItem(`enquete-telegramme-${id}`, "1"), partie);
await capture("04-scene", `#/p/${partie}`);
await capture("05-interrogatoire", `#/p/${partie}/suspect/ferrand`);
await capture("06-mur", `#/p/${partie}/mur`);
await capture("07-accusation", `#/p/${partie}/accuser`);

await rpc("enquete_accuser", { p_partie: partie, p_suspect: "ferrand", p_mobile: "silence", p_preuve: "pistolet" });
await capture("08-revelation", `#/p/${partie}`);

// Partie solo en cours, puis attente après accusation.
const solo = await rpc("enquete_nouvelle_partie", { p_mode: "solo" });
await rpc("enquete_fouiller", { p_partie: solo, p_lieu: "couloir" });
await capture("09-dossiers-fin", "#/");
const duel2 = await rpc("enquete_nouvelle_partie", { p_mode: "duel" });
await rpc("enquete_fouiller", { p_partie: duel2, p_lieu: "plateau" });
await rpc("enquete_accuser", { p_partie: duel2, p_suspect: "lucie", p_mobile: "vol", p_preuve: "page" });
await capture("10-attente", `#/p/${duel2}`, false);

await navigateur.close();
