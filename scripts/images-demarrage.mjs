// Images de lancement de l'app sur iPhone (apple-touch-startup-image) :
// l'enseigne au néon, figée, le T éteint, une image par taille d'écran.
// L'app reprend ensuite avec l'enseigne animée (composants/Demarrage.tsx).
//   node scripts/images-demarrage.mjs   → public/demarrage/*.png + balises à coller dans index.html
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const { chromium } = createRequire("/home/ubuntu/shots-tool/package.json")("playwright");
const ECRANS = [
  [440, 956, 3], [430, 932, 3], [428, 926, 3], [414, 896, 3], [414, 896, 2], [402, 874, 3],
  [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2],
];
const polices = (f) => new URL(`../src/polices/${f}`, import.meta.url).href;
const sortie = fileURLToPath(new URL("../public/demarrage/", import.meta.url));
mkdirSync(sortie, { recursive: true });

const html = `<!doctype html><html><head><style>
@font-face { font-family: "Bebas Neue"; src: url("${polices("bebas-neue.woff2")}"); }
@font-face { font-family: "Special Elite"; src: url("${polices("special-elite.woff2")}"); }
html, body { margin: 0; height: 100%; }
body { background-color: #0b0b0b; background-image: repeating-linear-gradient(100deg, rgba(237,232,221,.05) 0 1px, transparent 1px 9px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.enseigne { border: 2px solid #3a3833; padding: 26px 22px 18px; display: flex; flex-direction: column; align-items: center; gap: 4px; background: rgba(11,11,11,.85); box-shadow: 0 0 80px rgba(215,38,30,.18); }
.mot { font-family: "Bebas Neue"; font-size: 108px; line-height: .85; letter-spacing: 4px; }
.sous { font-family: "Special Elite"; font-size: 13px; letter-spacing: 6px; }
.allume { color: #ff4a3d; text-shadow: 0 0 6px #ff4a3d, 0 0 22px rgba(215,38,30,.9), 0 0 60px rgba(215,38,30,.6); }
.eteint { color: #3a1412; }
.flaque { width: 340px; max-width: 90%; height: 160px; margin-top: 40px; background: radial-gradient(ellipse at 50% 0%, rgba(215,38,30,.35), transparent 65%); filter: blur(6px); }
.pied { position: absolute; bottom: 44px; font-family: "Special Elite"; font-size: 11px; letter-spacing: 2px; color: #8a867e; }
</style></head><body>
<div class="enseigne"><span class="mot"><span class="allume">ENQUÊ</span><span class="eteint">T</span><span class="allume">E</span></span><span class="sous allume">· OUVERT LA NUIT ·</span></div>
<div class="flaque"></div><span class="pied">AGENCE DE DÉTECTIVES PRIVÉS</span>
</body></html>`;

const navigateur = await chromium.launch();
const balises = [];
for (const [l, h, r] of ECRANS) {
  const page = await navigateur.newPage({ viewport: { width: l, height: h }, deviceScaleFactor: r });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const nom = `${l * r}x${h * r}.png`;
  await page.screenshot({ path: sortie + nom });
  await page.close();
  balises.push(`    <link rel="apple-touch-startup-image" media="(device-width: ${l}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" href="./demarrage/${nom}" />`);
}
await navigateur.close();
console.log(balises.join("\n"));
