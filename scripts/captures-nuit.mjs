// Captures d'écran de la règle de la nuit, sans toucher à Supabase : les
// appels RPC sont joués sur un Postgres en mémoire (PGlite) avec les vraies
// migrations. Une nuit au Vieux-Port, du premier interrogatoire à la une.
// Usage (site servi par `npx vite preview`) :
//   node scripts/captures-nuit.mjs <dossier de sortie> [affaires/v2/x.json]
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { charger } from "../worker/affaire.mjs";

const { chromium } = createRequire("/home/ubuntu/shots-tool/package.json")("playwright");
const SORTIE = process.argv[2] ?? "captures-nuit";
const SITE = "http://127.0.0.1:4173/";
mkdirSync(SORTIE, { recursive: true });

const JULES = "11111111-1111-1111-1111-111111111111";
const JO = "22222222-2222-2222-2222-222222222222";
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  insert into auth.users values ('${JULES}'), ('${JO}');
`);
for (const m of ["0001_agence.sql", "0002_compte.sql", "0003_tampons.sql", "0004_nuit.sql"]) {
  await db.exec(readFileSync(new URL(`../supabase/migrations/${m}`, import.meta.url), "utf8"));
}
await db.exec(`insert into enquete_joueurs (user_id, pseudo, admin) values ('${JULES}', 'Jules', true), ('${JO}', 'Joséphine', false);
  insert into enquete_amities (de, a, acceptee_at) values ('${JULES}', '${JO}', now());`);

// Une ancienne affaire déjà jouée (archives), puis la nuit.
const ancienne = JSON.parse(readFileSync(new URL("../affaires/01-vieux-port.json", import.meta.url), "utf8"));
await db.query("insert into enquete_affaires (id, titre, public) overriding system value values (1, $1, $2)", [ancienne.titre, ancienne.public]);
await db.query("insert into enquete_affaires_secret values (1, $1)", [ancienne.secret]);
await db.exec(`insert into enquete_parties (id, affaire_id, mode, cree_par, lancee_at, revelee_at) overriding system value
  values (500, 1, 'solo', '${JULES}', now() - interval '9 days', now() - interval '9 days');
  insert into enquete_participants (partie_id, user_id, accuse_suspect, accuse_at, score) values (500, '${JULES}', 'ferrand', now() - interval '9 days', 92);`);
const fichier = process.argv[3] ?? new URL("../affaires/v2/01-vieux-port.json", import.meta.url);
const affaire = charger(fichier);
await db.query("insert into enquete_affaires (id, titre, public, regle) overriding system value values (2, $1, $2, 2)", [affaire.titre, affaire.public]);
await db.query("insert into enquete_affaires_secret values (2, $1)", [affaire.secret]);

let uid = JULES;
async function rpc(fn, args = {}) {
  await db.exec(`set test.uid = '${uid}'`);
  const noms = Object.keys(args);
  const sql = `select ${fn}(${noms.map((n, i) => `${n} => $${i + 1}`).join(", ")}) as r`;
  const { rows } = await db.query(sql, Object.values(args));
  return rows[0]?.r ?? null;
}

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript((id) => {
  localStorage.setItem(
    "enquete-agence",
    JSON.stringify({
      access_token: "x.eyJzdWIiOiIxIn0.x",
      refresh_token: "x",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id, aud: "authenticated", email: "jules@example.com" },
    })
  );
  // L'installation et le tutoriel ont déjà été vus.
  localStorage.setItem("enquete-installer-vu", "1");
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
page.on("console", (m) => m.type() === "error" && console.error("console :", m.text()));

async function aller(hash, attente = 1400) {
  await page.goto(SITE + hash);
  await page.reload();
  await page.waitForTimeout(attente);
  // Les tampons gagnés tombent : on les fait défiler puis on referme.
  for (let i = 0; i < 12 && (await page.locator(".coup-tampon").count()); i++) {
    const suivant = page.locator(".coup-tampon >> text=TAMPON SUIVANT");
    if (await suivant.count()) await suivant.first().click({ force: true });
    else await page.locator(".coup-tampon button.lien-retour, .coup-tampon >> text=CONTINUER").first().click({ force: true });
    await page.waitForTimeout(600);
  }
}
async function capture(nom, pleinePage = false) {
  await page.screenshot({ path: `${SORTIE}/${nom}.png`, fullPage: pleinePage });
  console.log("capturé", nom);
}
// Les alertes de la nuit déjà vues ne reviennent pas.
const alertesVues = (partie, quoi) => page.evaluate(([p, q]) => q.forEach((x) => localStorage.setItem(`enquete-nuit-${p}-${x}`, "1")), [partie, quoi]);

const partie = await rpc("enquete_nouvelle_partie", { p_mode: "solo" });
const poser = (q) => rpc("enquete_poser_question", { p_partie: partie, p_question: q });

await aller(`#/p/${partie}`);
await capture("n01-scene");
await capture("n01-scene-entiere", true);

await poser("sauveur-comptoir");
await poser("sauveur-retour");
await poser("ferrand-soir");
await aller(`#/p/${partie}/suspect/ferrand`);
// La question qui fâche, posée à l'écran : la cendre tombe.
await page.click("text=Sauveur vous a vu remonter le quai");
await page.waitForTimeout(5200);
await capture("n02-ferrand-agace");
await page.click("text=MONTRER UNE PIÈCE DU MUR");
await page.waitForTimeout(900);
await capture("n03-montrer");
await page.keyboard.press("Escape");

await poser("lola-soir");
await poser("lola-tel");
await poser("lola-ferrand");
await poser("ferrand-enveloppes");
await aller(`#/p/${partie}/suspect/ferrand`);
await capture("n04-ferrand-braque");

await aller(`#/p/${partie}/lieu/quai`);
await capture("n05-quai-avant");
await page.click(".bouton-fouiller");
await page.waitForTimeout(2600);
await capture("n06-quai-apres");

await aller(`#/p/${partie}/suspect/ferrand`);
await page.click("text=MONTRER UNE PIÈCE DU MUR");
await page.waitForTimeout(700);
await page.click(".montrer-mur >> text=Une douille");
await page.waitForTimeout(6500);
await capture("n07-ferrand-craque");

await aller(`#/p/${partie}/mur`);
await capture("n08-mur");
await aller(`#/p/${partie}`);
await capture("n09-scene-plus-tard", true);

// On avance jusqu'au départ d'Irène : le télégramme tombe.
for (const q of ["irene-alibi", "irene-soucis", "irene-coffre", "irene-ferrand", "sauveur-vu", "sauveur-coup"]) await poser(q);
await rpc("enquete_fouiller", { p_partie: partie, p_lieu: "bar" });
await aller(`#/p/${partie}`, 3600);
await capture("n10-telegramme-evenement");
await alertesVues(partie, ["04:30"]);
await aller("#/");
await capture("n11-accueil-en-cours");

// Jusqu'à l'aube.
for (const q of ["lola-alibi", "lola-rapports", "sauveur-ennemis", "ferrand-marchetti", "ferrand-qui"]) await poser(q).catch(() => {});
await rpc("enquete_fouiller", { p_partie: partie, p_lieu: "loge" }).catch(() => {});
await rpc("enquete_fouiller", { p_partie: partie, p_lieu: "bureau" }).catch(() => {});
await aller(`#/p/${partie}`, 3600);
await alertesVues(partie, ["05:00"]);
await aller(`#/p/${partie}`, 4800);
await capture("n12-aube");
await alertesVues(partie, ["aube"]);

await aller(`#/p/${partie}/accuser`);
await capture("n13-accusation-qui");
await page.evaluate((p) => sessionStorage.setItem(`enquete-accuser-${p}`, JSON.stringify({ etape: 2, suspect: "ferrand", mobile: "silence", occasion: null, preuve: null })), partie);
await aller(`#/p/${partie}/accuser`);
await capture("n14-accusation-occasion");
await page.evaluate((p) => sessionStorage.setItem(`enquete-accuser-${p}`, JSON.stringify({ etape: 4, suspect: "ferrand", mobile: "silence", occasion: "retour", preuve: "lapsus" })), partie);
await aller(`#/p/${partie}/accuser`);
await capture("n15-proces-verbal", true);

await rpc("enquete_accuser", { p_partie: partie, p_suspect: "ferrand", p_mobile: "silence", p_occasion: "retour", p_preuve: "lapsus" });
await aller(`#/p/${partie}`, 3200);
await capture("n16-revelation", true);
await page.click("text=PARTAGER MA UNE");
await page.waitForTimeout(1500);
await capture("n17-partage");
await aller("#/archives");
await capture("n18-archives");
await aller("#/p/500");
await capture("n19-ancienne", true);
await aller("#/regles");
await capture("n20-regles", true);
await aller("#/tuto");
for (let i = 0; i < 3; i++) {
  await page.click("text=SUIVANT");
  await page.waitForTimeout(700);
  await capture(`n2${1 + i}-tuto-${i + 2}`);
}

await navigateur.close();
