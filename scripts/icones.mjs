// Génère les icônes PNG à partir de public/icone.svg (sharp de la plateforme).
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const sharp = createRequire("/home/ubuntu/plateforme-perso/package.json")("sharp");
const svg = readFileSync("public/icone.svg");
for (const [taille, nom] of [[180, "icone-180.png"], [192, "icone-192.png"], [512, "icone-512.png"]]) {
  writeFileSync(`public/${nom}`, await sharp(svg).resize(taille, taille).png().toBuffer());
}
