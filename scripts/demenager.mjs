// Déménage le jeu de la base de la plateforme vers sa propre base :
// comptes de Jules et Joséphine (mêmes adresses, nouveaux identifiants),
// affaires, parties, journal, notes, abonnements aux notifications.
// Les identifiants des affaires et des parties sont gardés, pour que les
// liens #/p/12 restent bons. Ne touche pas à l'ancienne base.
//   node scripts/demenager.mjs           montre ce qui sera copié
//   node scripts/demenager.mjs --go      copie (refuse si la nouvelle base a déjà des parties)
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: "/home/ubuntu/enquete/.env", quiet: true });
const PLATEFORME = config({ path: "/home/ubuntu/plateforme-perso/.env.local", quiet: true, processEnv: {} }).parsed;
const GO = process.argv.includes("--go");

const PSEUDOS = { "Jules": "Jules", "Joséphine": "Joséphine" };
const ADMIN = "jules.gorce@gmail.com";

const auth = { persistSession: false };
const ancienne = createClient(PLATEFORME.NEXT_PUBLIC_SUPABASE_URL, PLATEFORME.SUPABASE_SERVICE_ROLE_KEY, { auth });

async function verif(promesse) {
  const { data, error } = await promesse;
  if (error) throw new Error(error.message);
  return data;
}

const joueurs = await verif(ancienne.from("enquete_joueurs").select("*").order("nom"));
const affaires = await verif(ancienne.from("enquete_affaires").select("*").order("id"));
const secrets = await verif(ancienne.from("enquete_affaires_secret").select("*"));
const parties = await verif(ancienne.from("enquete_parties").select("*").order("id"));
const participants = await verif(ancienne.from("enquete_participants").select("*").order("partie_id"));
const journal = await verif(ancienne.from("enquete_journal").select("*").order("id"));
const abonnements = await verif(ancienne.from("enquete_abonnements_push").select("*").order("id"));

const emails = {};
for (const j of joueurs) {
  const { data, error } = await ancienne.auth.admin.getUserById(j.user_id);
  if (error) throw new Error(error.message);
  emails[j.user_id] = data.user.email;
}

console.log("À copier :");
for (const j of joueurs) console.log(`  ${j.nom} <${emails[j.user_id]}> → agence « ${PSEUDOS[j.nom] ?? j.nom} »${emails[j.user_id] === ADMIN ? " (admin)" : ""}`);
console.log(`  ${affaires.length} affaires, ${parties.length} parties, ${journal.length} questions et fouilles, ${abonnements.length} abonnements push`);

if (!GO) {
  console.log("\nRien n'est copié. Relance avec --go pour déménager.");
  process.exit(0);
}

const nouvelle = createClient(process.env.ENQUETE_SUPABASE_URL, process.env.ENQUETE_SERVICE_ROLE_KEY, { auth });
const deja = await verif(nouvelle.from("enquete_parties").select("id").limit(1));
if (deja.length) throw new Error("La nouvelle base a déjà des parties : déménagement déjà fait ?");

// Comptes : même adresse, connexion par code dans la nouvelle base.
const ids = {};
const existants = (await verif(nouvelle.auth.admin.listUsers({ perPage: 1000 }))).users;
for (const j of joueurs) {
  const email = emails[j.user_id];
  const trouve = existants.find((u) => u.email === email);
  const user = trouve ?? (await verif(nouvelle.auth.admin.createUser({ email, email_confirm: true }))).user;
  ids[j.user_id] = user.id;
}
const id = (ancien) => {
  if (!ids[ancien]) throw new Error(`Joueur inconnu ${ancien}`);
  return ids[ancien];
};

await verif(nouvelle.from("enquete_joueurs").upsert(
  joueurs.map((j) => ({ user_id: id(j.user_id), pseudo: PSEUDOS[j.nom] ?? j.nom, admin: emails[j.user_id] === ADMIN }))
));

// Ceux qui jouaient ensemble sont associés d'office.
const nouveauxIds = joueurs.map((j) => id(j.user_id));
const amities = [];
for (let i = 0; i < nouveauxIds.length; i++)
  for (let k = i + 1; k < nouveauxIds.length; k++)
    amities.push({ de: nouveauxIds[i], a: nouveauxIds[k], acceptee_at: new Date().toISOString(), notifie: true });
if (amities.length) await verif(nouvelle.from("enquete_amities").upsert(amities));

await verif(nouvelle.from("enquete_affaires").insert(affaires));
await verif(nouvelle.from("enquete_affaires_secret").insert(secrets));

await verif(nouvelle.from("enquete_parties").insert(parties.map((p) => ({
  id: p.id,
  affaire_id: p.affaire_id,
  mode: p.mode === "duel" ? "groupe" : "solo",
  cree_par: id(p.cree_par),
  lancee_at: p.created_at,
  echeance: p.echeance,
  revelee_at: p.revelee_at,
  notifie_lancement: true,
  notifie_revelation: p.notifie_revelation,
  created_at: p.created_at,
}))));

await verif(nouvelle.from("enquete_participants").insert(participants.map((pa) => ({
  ...pa,
  user_id: id(pa.user_id),
  statut: "present",
  notifie_invitation: true,
}))));

for (let i = 0; i < journal.length; i += 500) {
  await verif(nouvelle.from("enquete_journal").insert(journal.slice(i, i + 500).map((j) => ({ ...j, user_id: id(j.user_id) }))));
}

if (abonnements.length) {
  await verif(nouvelle.from("enquete_abonnements_push").insert(abonnements.map((a) => ({ ...a, user_id: id(a.user_id) }))));
}

// Les compteurs d'identifiants repartent après les ids copiés.
const r = await fetch(`https://api.supabase.com/v1/projects/${process.env.ENQUETE_REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    query: ["enquete_affaires", "enquete_parties", "enquete_journal", "enquete_demandes", "enquete_abonnements_push"]
      .map((t) => `select setval(pg_get_serial_sequence('${t}', 'id'), coalesce((select max(id) from ${t}), 0) + 1, false);`)
      .join("\n"),
  }),
});
if (!r.ok) throw new Error(`compteurs : ${r.status} ${await r.text()}`);

console.log("Déménagement fait.");
