// Captures des écrans de compte, d'installation et du tuto, sur un Postgres
// en mémoire comme scripts/captures.mjs. Site servi par `npx vite preview`.
//   node scripts/captures-compte.mjs <dossier de sortie>
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium } = createRequire("/home/ubuntu/shots-tool/package.json")("playwright");
const SORTIE = process.argv[2] ?? "captures";
const SITE = "http://127.0.0.1:4173/";
mkdirSync(SORTIE, { recursive: true });

const JULES = "11111111-1111-1111-1111-111111111111";
const JO = "22222222-2222-2222-2222-222222222222";
const JOE = "33333333-3333-3333-3333-333333333333";
const JORDAN = "55555555-5555-5555-5555-555555555555";
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  insert into auth.users values ('${JULES}'), ('${JO}'), ('${JOE}'), ('${JORDAN}');
`);
for (const m of ["0001_agence.sql", "0002_compte.sql"]) await db.exec(readFileSync(new URL(`../supabase/migrations/${m}`, import.meta.url), "utf8"));
await db.exec(`insert into enquete_joueurs (user_id, pseudo, admin) values
  ('${JULES}', 'Jules', true), ('${JO}', 'Joséphine', false), ('${JOE}', 'Joe_Marlowe', false), ('${JORDAN}', 'Jordan', false);
  insert into enquete_amities (de, a, acceptee_at) values ('${JULES}', '${JO}', now()), ('${JULES}', '${JOE}', null);`);

async function rpc(fn, args) {
  await db.exec(`set test.uid = '${JULES}'`);
  const noms = Object.keys(args);
  const { rows } = await db.query(`select ${fn}(${noms.map((n, i) => `${n} => $${i + 1}`).join(", ")}) as r`, Object.values(args));
  return rows[0]?.r ?? null;
}

const navigateur = await chromium.launch();
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

async function nouvellePage(userAgent) {
  const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, userAgent });
  await page.addInitScript((id) => {
    localStorage.setItem("enquete-agence", JSON.stringify({ access_token: "x.eyJzdWIiOiIxIn0.x", refresh_token: "x", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id, aud: "authenticated", email: "jules.gorce@gmail.com" } }));
  }, JULES);
  await page.route("**/rest/v1/rpc/**", async (route) => {
    const fn = route.request().url().split("/rpc/")[1].split("?")[0];
    try {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(await rpc(fn, JSON.parse(route.request().postData() || "{}"))) });
    } catch (e) {
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ message: e.message, code: "P0001" }) });
    }
  });
  await page.route("**/auth/v1/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  page.on("pageerror", (e) => console.error("erreur page :", e.message));
  return page;
}

// Premier passage sur iPhone : l'écran d'installation, avant tout.
const iphone = await nouvellePage(IPHONE);
await iphone.goto(SITE);
await iphone.waitForTimeout(1200);
await iphone.screenshot({ path: `${SORTIE}/i1-installer-iphone.png`, fullPage: true });
await iphone.click("text=ANDROID");
await iphone.waitForTimeout(900);
await iphone.screenshot({ path: `${SORTIE}/i2-installer-android.png`, fullPage: true });
await iphone.close();

const page = await nouvellePage();
async function capture(nom, hash, pleinePage = true) {
  await page.goto(SITE + hash);
  await page.reload();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: pleinePage });
  console.log("capturé", nom);
}

await capture("t0-dossiers", "#/");
await capture("t1", "#/tuto", false);
for (let i = 2; i <= 7; i++) {
  await page.click("text=SUIVANT →");
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${SORTIE}/t${i}.png` });
}
await capture("k1-compte", "#/compte");
await page.click("text=Changer le nom de mon agence");
await page.fill("#nouveau-nom", "Sherlock");
await page.waitForTimeout(900);
await page.screenshot({ path: `${SORTIE}/k2-compte-renommer.png` });
await capture("s1-associes", "#/associes", false);
await page.fill("#associe", "jo");
await page.waitForTimeout(900);
await page.screenshot({ path: `${SORTIE}/s2-suggestions.png` });
await navigateur.close();
