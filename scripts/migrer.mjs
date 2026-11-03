// Applique un fichier SQL à la base du jeu, par le mot de passe Postgres
// rangé dans ~/enquete/.env (le jeton de gestion Supabase est révoqué).
//   node scripts/migrer.mjs supabase/migrations/0003_tampons.sql
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import pg from "pg";

config({ path: "/home/ubuntu/enquete/.env", quiet: true });
const fichier = process.argv[2];
if (!fichier) throw new Error("Donne le fichier SQL à appliquer.");

const client = new pg.Client({
  host: "aws-1-eu-west-3.pooler.supabase.com",
  port: 5432,
  user: `postgres.${process.env.ENQUETE_REF}`,
  password: process.env.ENQUETE_DB_PASS,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(readFileSync(fichier, "utf8"));
  console.log("appliqué :", fichier);
} finally {
  await client.end();
}
