// Images de lancement de l'app sur iPhone (apple-touch-startup-image) :
// la rue de l'agence, figée, le O éteint, une image par taille d'écran.
// L'app reprend ensuite avec la rue animée (composants/Demarrage.tsx).
//   node scripts/images-demarrage.mjs   → public/demarrage/*.png + balises à coller dans index.html
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire("/home/ubuntu/shots-tool/package.json")("playwright");
const ECRANS = [
  [440, 956, 3], [430, 932, 3], [428, 926, 3], [414, 896, 3], [414, 896, 2], [402, 874, 3],
  [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2],
];
const polices = (f) => `data:font/woff2;base64,${readFileSync(new URL(`../src/polices/${f}`, import.meta.url)).toString("base64")}`;
const sortie = fileURLToPath(new URL("../public/demarrage/", import.meta.url));
mkdirSync(sortie, { recursive: true });

const rue = readFileSync(new URL("../src/composants/rue.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/composants/rue.css", import.meta.url), "utf8");
const decor = (echelle) => `<!doctype html><html><head><style>
@font-face { font-family: "Bebas Neue"; src: url("${polices("bebas-neue.woff2")}"); }
@font-face { font-family: "Special Elite"; src: url("${polices("special-elite.woff2")}"); }
html, body { margin: 0; height: 100%; }
body { background: #0e0f14; position: relative; overflow: hidden; }
${css}
.rue-o { animation: none; color: #3a1412; }
.rue-reflet-rouge { animation: none; opacity: 0.1; }
</style></head><body>
<div class="rue" style="--echelle: ${echelle}">${rue}</div>
<span class="rue-pied">DÉTECTIVES PRIVÉS · 2<sup>E</sup> ÉTAGE</span>
</body></html>`;

const navigateur = await chromium.launch();
const balises = [];
for (const [l, h, r] of ECRANS) {
  const page = await navigateur.newPage({ viewport: { width: l, height: h }, deviceScaleFactor: r });
  await page.setContent(decor(Math.max(l / 390, h / 844)));
  await page.evaluate(() => document.fonts.ready);
  const nom = `${l * r}x${h * r}.png`;
  await page.screenshot({ path: sortie + nom });
  await page.close();
  balises.push(`    <link rel="apple-touch-startup-image" media="(device-width: ${l}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="./demarrage/${nom}" />`);
}
await navigateur.close();
console.log(balises.join("\n"));
