// Crée et règle la base Supabase du jeu, à part de celle de la plateforme,
// avec l'API de gestion de Supabase (jeton dans ~/enquete/.env, rangé par
// scripts/cles.sh). Peut se relancer : chaque étape déjà faite est sautée.
//   node scripts/nouvelle-base.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";

const ENV = "/home/ubuntu/enquete/.env";
config({ path: ENV, quiet: true });
const JETON = process.env.SUPABASE_ACCESS_TOKEN;
const GMAIL = process.env.GMAIL_APP_PASSWORD;
if (!JETON || !GMAIL) throw new Error("Lance d'abord ~/cles (jeton Supabase et mot de passe Gmail).");

const SITE = "https://agencenoire.fr/";
const EXPEDITEUR = "jules.gorce@gmail.com";

async function api(chemin, options = {}) {
  const r = await fetch(`https://api.supabase.com/v1${chemin}`, {
    ...options,
    headers: { Authorization: `Bearer ${JETON}`, "Content-Type": "application/json", ...options.headers },
  });
  const texte = await r.text();
  if (!r.ok) throw new Error(`${options.method ?? "GET"} ${chemin} : ${r.status} ${texte}`);
  return texte ? JSON.parse(texte) : null;
}

function ranger(nom, valeur) {
  process.env[nom] = valeur;
  const lignes = readFileSync(ENV, "utf8").split("\n").filter((l) => l && !l.startsWith(`${nom}=`));
  writeFileSync(ENV, [...lignes, `${nom}=${valeur}`].join("\n") + "\n", { mode: 0o600 });
}

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Le projet ------------------------------------------------------------
let ref = process.env.ENQUETE_REF;
if (!ref) {
  // Selon le jeton, la liste des organisations peut revenir vide : on prend
  // alors celle du projet de la plateforme.
  const orga = (await api("/organizations"))[0] ?? { id: (await api("/projects"))[0].organization_id, name: "de la plateforme" };
  const motDePasse = randomBytes(24).toString("base64url");
  const projet = await api("/projects", {
    method: "POST",
    body: JSON.stringify({ name: "enquete", organization_id: orga.id, region: "eu-west-3", db_pass: motDePasse }),
  });
  ref = projet.id ?? projet.ref;
  ranger("ENQUETE_REF", ref);
  ranger("ENQUETE_DB_PASS", motDePasse);
  console.log("projet créé :", ref, "(organisation", orga.name + ")");
}
ranger("ENQUETE_SUPABASE_URL", `https://${ref}.supabase.co`);

for (let i = 0; ; i++) {
  const { status } = await api(`/projects/${ref}`);
  if (status === "ACTIVE_HEALTHY") break;
  if (i === 0) console.log("démarrage du projet…");
  if (i > 60) throw new Error(`Le projet ne démarre pas (état ${status}).`);
  await attendre(10_000);
}
console.log("projet prêt");

// 2. Les clés ---------------------------------------------------------------
const cles = await api(`/projects/${ref}/api-keys?reveal=true`);
const publique = cles.find((c) => c.type === "publishable") ?? cles.find((c) => c.name === "anon");
const serveur = cles.find((c) => c.type === "secret") ?? cles.find((c) => c.name === "service_role");
ranger("ENQUETE_PUBLISHABLE_KEY", publique.api_key);
ranger("ENQUETE_SERVICE_ROLE_KEY", serveur.api_key);

const configSite = new URL("../src/lib/config.ts", import.meta.url);
writeFileSync(
  configSite,
  readFileSync(configSite, "utf8")
    .replace(/SUPABASE_URL = ".*?"/, `SUPABASE_URL = "https://${ref}.supabase.co"`)
    .replace(/SUPABASE_PUBLISHABLE_KEY = ".*?"/, `SUPABASE_PUBLISHABLE_KEY = "${publique.api_key}"`)
);
console.log("clés rangées, src/lib/config.ts à jour");

// 3. Les tables et fonctions -------------------------------------------------
async function sql(requete) {
  return api(`/projects/${ref}/database/query`, { method: "POST", body: JSON.stringify({ query: requete }) });
}
const [{ existe }] = await sql("select to_regclass('public.enquete_joueurs') is not null as existe");
if (!existe) {
  await sql(readFileSync(new URL("../supabase/migrations/0001_agence.sql", import.meta.url), "utf8"));
  console.log("migration appliquée");
} else {
  console.log("migration déjà en place");
}

// 4. Connexion par code, mails envoyés depuis Gmail ---------------------------
const mail = (titre) => `<div style="font-family:Courier New,monospace;background:#0b0b0b;color:#ede8dd;padding:32px;max-width:420px">
<p style="letter-spacing:2px;font-size:12px;color:#8a867e;margin:0 0 12px">${titre}</p>
<p style="font-size:14px;margin:0 0 20px">Ton code pour entrer dans l'agence :</p>
<p style="font-size:40px;letter-spacing:10px;margin:0 0 20px;color:#ede8dd"><b>{{ .Token }}</b></p>
<p style="font-size:12px;color:#8a867e;margin:0">Valable une heure. Si tu n'as rien demandé, ignore ce message.</p>
</div>`;

await api(`/projects/${ref}/config/auth`, {
  method: "PATCH",
  body: JSON.stringify({
    site_url: SITE,
    uri_allow_list: SITE,
    disable_signup: false,
    external_email_enabled: true,
    mailer_autoconfirm: false,
    mailer_otp_length: 6,
    mailer_otp_exp: 3600,
    smtp_host: "smtp.gmail.com",
    smtp_port: "465",
    smtp_user: EXPEDITEUR,
    smtp_pass: GMAIL,
    smtp_admin_email: EXPEDITEUR,
    smtp_sender_name: "Agence Noire",
    smtp_max_frequency: 30,
    rate_limit_email_sent: 100,
    mailer_subjects_magic_link: "{{ .Token }} · ton code Agence Noire",
    mailer_subjects_confirmation: "{{ .Token }} · ton code Agence Noire",
    mailer_templates_magic_link_content: mail("TÉLÉGRAMME · CONFIDENTIEL"),
    mailer_templates_confirmation_content: mail("TÉLÉGRAMME · NOUVELLE AGENCE"),
  }),
});
console.log("connexion par code réglée (mails depuis", EXPEDITEUR + ")");
console.log("Base prête.");
