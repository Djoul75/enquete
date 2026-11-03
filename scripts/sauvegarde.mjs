// Sauvegarde de la base du jeu, chaque nuit depuis la crontab du VPS :
// toutes les tables enquete_* plus les adresses des comptes, dans un fichier
// JSON compressé. On garde les 30 derniers. L'offre gratuite de Supabase ne
// garde presque pas d'historique, d'où cette copie à part.
//   node scripts/sauvegarde.mjs            → ~/sauvegardes/enquete/AAAA-MM-JJ.json.gz
// Restaurer : les tables se recréent avec supabase/migrations, puis on
// réinsère les lignes de chaque table dans l'ordre du fichier.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { gzipSync } from "node:zlib";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

config({ path: "/home/ubuntu/enquete/.env", quiet: true });
const DOSSIER = join(homedir(), "sauvegardes", "enquete");
const GARDER = 30;
// Dans l'ordre où il faut les réinsérer (clés étrangères).
const TABLES = [
  "enquete_joueurs", "enquete_amities", "enquete_affaires", "enquete_affaires_secret", "enquete_parties",
  "enquete_participants", "enquete_journal", "enquete_demandes", "enquete_abonnements_push",
];

const base = createClient(process.env.ENQUETE_SUPABASE_URL, process.env.ENQUETE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function toutLire(table) {
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await base.from(table).select("*").range(debut, debut + 999);
    if (error) throw new Error(`${table} : ${error.message}`);
    lignes.push(...data);
    if (data.length < 1000) return lignes;
  }
}

const copie = { date: new Date().toISOString(), comptes: [], tables: {} };
for (let page = 1; ; page++) {
  const { data, error } = await base.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`comptes : ${error.message}`);
  copie.comptes.push(...data.users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at })));
  if (data.users.length < 1000) break;
}
for (const t of TABLES) copie.tables[t] = await toutLire(t);

mkdirSync(DOSSIER, { recursive: true });
const fichier = join(DOSSIER, `${copie.date.slice(0, 10)}.json.gz`);
writeFileSync(fichier, gzipSync(JSON.stringify(copie)), { mode: 0o600 });

const anciens = readdirSync(DOSSIER).filter((f) => f.endsWith(".json.gz")).sort().slice(0, -GARDER);
for (const f of anciens) rmSync(join(DOSSIER, f));

const resume = TABLES.map((t) => `${t.replace("enquete_", "")} ${copie.tables[t].length}`).join(", ");
console.log(`${copie.date} sauvegarde ${fichier} : ${copie.comptes.length} comptes, ${resume}`);
