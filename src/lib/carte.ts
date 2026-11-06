// La carte résultat à partager, façon une de journal (maquette A validée) :
// dessinée sur un canvas en 1080 × 1350, le format portrait des réseaux.
// Elle ne dévoile rien de l'affaire : ni coupable, ni mobile, ni preuve.

import type { Verdict } from "./types";

export type DonneesCarte = {
  partie: number;
  titre: string;
  ville?: string;
  annee?: number | string;
  pseudo: string;
  verdict: Verdict | null; // null : pas de dossier signé
  heure: string | null; // heure de signature dans la nuit, « 3 h 55 »
  aube: string; // l'heure de fin, « 6 h 00 »
  fin: string; // « l'aube », « le nyassa »…
  avance: number; // minutes d'avance sur la fin
  rang: number;
  joueurs: number;
  coupable: boolean | null; // null : pas d'accusation
  mobile: boolean;
  occasion: boolean;
  preuve: boolean;
  braques: number;
};

const L = 432;
const H = 540;
const ECHELLE = 2.5;
const ENCRE = "#0b0b0b";
const PAPIER = "#ede8dd";
const ROUGE = "#a51d17";
const TITRE = '"Bebas Neue", sans-serif';
const MACHINE = '"Special Elite", monospace';
const TEXTE = '"Courier Prime", monospace';
const SITE = "AGENCENOIRE.FR";

export function verdict(d: DonneesCarte): string {
  if (d.verdict === "condamne") return "FAIT CONDAMNER SON COUPABLE";
  if (d.verdict === "relache") return "TENAIT LE COUPABLE, PAS LA PREUVE";
  if (d.verdict === "erreur") return "ENVOIE UN INNOCENT AU BAGNE";
  return "ARRIVE TROP TARD";
}

function duree(m: number): string {
  const h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
}

function chapeau(d: DonneesCarte): string {
  if (d.joueurs > 1) {
    const tete = d.rang === 1 ? "Celle-ci arrive en tête." : `${d.rang - 1 === 1 ? "Une autre a" : `${d.rang - 1} autres ont`} fait mieux.`;
    return `${d.joueurs} agences sur la même affaire. ${tete}`;
  }
  if (d.coupable === null) return "Seule sur l'affaire, et le délai a filé.";
  const braques = d.braques ? ` ${d.braques} suspect${d.braques > 1 ? "s" : ""} braqué${d.braques > 1 ? "s" : ""} en route.` : " Sans braquer personne.";
  return d.avance > 0 ? `Seule sur l'affaire, dossier bouclé ${duree(d.avance)} avant l'heure.${braques}` : `Seule sur l'affaire, jusqu'à la dernière minute.${braques}`;
}

// Découpe en lignes ; chaque mot garde sa couleur.
function lignes(ctx: CanvasRenderingContext2D, mots: { t: string; c: string }[], largeur: number) {
  const res: { t: string; c: string }[][] = [];
  let ligne: { t: string; c: string }[] = [];
  const mesure = (l: { t: string; c: string }[]) => ctx.measureText(l.map((m) => m.t).join(" ")).width;
  for (const m of mots) {
    if (ligne.length && mesure([...ligne, m]) > largeur) {
      res.push(ligne);
      ligne = [];
    }
    ligne.push(m);
  }
  if (ligne.length) res.push(ligne);
  return res;
}

function texteEnLignes(ctx: CanvasRenderingContext2D, texte: string, largeur: number): string[] {
  return lignes(ctx, texte.split(" ").map((t) => ({ t, c: "" })), largeur).map((l) => l.map((m) => m.t).join(" "));
}

export async function dessinerCarte(d: DonneesCarte): Promise<Blob> {
  await Promise.all([`40px ${TITRE}`, `12px ${MACHINE}`, `13px ${TEXTE}`].map((f) => document.fonts.load(f)));

  const canvas = document.createElement("canvas");
  canvas.width = L * ECHELLE;
  canvas.height = H * ECHELLE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(ECHELLE, ECHELLE);
  ctx.textBaseline = "alphabetic";

  // Papier tramé.
  ctx.fillStyle = PAPIER;
  ctx.fillRect(0, 0, L, H);
  ctx.fillStyle = "rgba(11,11,11,0.06)";
  for (let y = 2.5; y < H; y += 5) for (let x = 2.5; x < L; x += 5) ctx.fillRect(x - 0.5, y - 0.5, 1, 1);

  const G = 24;
  const D = L - 24;
  ctx.fillStyle = ENCRE;
  ctx.strokeStyle = ENCRE;

  // Bandeau du haut.
  ctx.font = `10px ${MACHINE}`;
  const lieu = [d.ville, d.annee].filter(Boolean).join(", ").toUpperCase() || "ÉDITION SPÉCIALE";
  ctx.textAlign = "left";
  ctx.fillText(lieu, G, 32);
  ctx.textAlign = "center";
  ctx.fillText("ÉDITION DU SOIR", L / 2, 32);
  ctx.textAlign = "right";
  ctx.fillText(`N° ${d.partie}`, D, 32);
  ctx.fillRect(G, 39, D - G, 1);

  // Titre du journal.
  ctx.textAlign = "center";
  ctx.font = `58px ${TITRE}`;
  ctx.fillText("L'ÉCHO DES PRIVÉS", L / 2, 96);
  ctx.fillRect(G, 103, D - G, 1);
  ctx.fillRect(G, 106, D - G, 1);

  // Gros titre : l'affaire, puis le verdict, l'agence en rouge.
  ctx.textAlign = "left";
  let taille = 40;
  const mots = [
    ...`${d.titre.toUpperCase()} :`.split(" ").map((t) => ({ t, c: ENCRE })),
    { t: "L'AGENCE", c: ENCRE },
    { t: d.pseudo.toUpperCase(), c: ROUGE },
    ...verdict(d).split(" ").map((t) => ({ t, c: ENCRE })),
  ];
  let decoupe = [] as ReturnType<typeof lignes>;
  for (; taille >= 28; taille -= 2) {
    ctx.font = `${taille}px ${TITRE}`;
    decoupe = lignes(ctx, mots, D - G);
    if (decoupe.length <= 3) break;
  }
  let y = 112 + taille * 0.9;
  for (const ligne of decoupe) {
    let x = G;
    for (const m of ligne) {
      ctx.fillStyle = m.c;
      ctx.fillText(m.t, x, y);
      x += ctx.measureText(m.t + " ").width;
    }
    y += taille * 0.9;
  }
  ctx.fillStyle = ENCRE;

  // Les cases se calent au-dessus du pied de page ; l'heure de signature se
  // centre dans la place qui reste sous le gros titre.
  const yc = H - 52 - 74;
  const libre = yc - (y - taille * 0.9);
  const haut = y - taille * 0.9 + Math.max(16, (libre - 104) / 2);
  const larg = (D - G - 14) / 2;
  ctx.lineWidth = 2;
  ctx.strokeRect(G + 1, haut + 1, larg - 2, 104);
  ctx.textAlign = "center";
  const heure = (d.heure ?? d.aube).toUpperCase();
  for (let t = 76; t >= 40; t -= 4) {
    ctx.font = `${t}px ${TITRE}`;
    if (ctx.measureText(heure).width <= larg - 20) break;
  }
  ctx.fillText(heure, G + larg / 2, haut + 74);
  ctx.font = `11px ${MACHINE}`;
  ctx.fillText(d.heure ? "D O S S I E R   S I G N É" : "S I G N É   À   L A   F I N", G + larg / 2, haut + 94);

  const xd = G + larg + 14;
  ctx.textAlign = "left";
  ctx.font = `26px ${TITRE}`;
  ctx.fillText(d.joueurs > 1 ? `${d.rang}${d.rang === 1 ? "ER" : "E"} SUR ${d.joueurs} PRIVÉS` : "EN SOLITAIRE", xd, haut + 22);
  ctx.font = `13px ${TEXTE}`;
  texteEnLignes(ctx, chapeau(d), larg).slice(0, 5).forEach((l, i) => ctx.fillText(l, xd, haut + 44 + i * 17));

  // Les quatre cases du dossier : rouge pleine si juste, pointillés sinon.
  const cases = [
    { nom: "QUI", ok: d.coupable === true },
    { nom: "POURQUOI", ok: d.coupable !== null && d.mobile },
    { nom: "L'OCCASION", ok: d.coupable !== null && d.occasion },
    { nom: "LA PREUVE", ok: d.coupable !== null && d.preuve },
  ];
  const lc = (D - G - 24) / 4;
  cases.forEach((c, i) => {
    const x = G + i * (lc + 8);
    if (c.ok) {
      ctx.fillStyle = ROUGE;
      ctx.fillRect(x, yc, lc, 34);
    } else {
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(x + 1, yc + 1, lc - 2, 32);
      ctx.setLineDash([]);
    }
    ctx.fillStyle = ENCRE;
    ctx.font = `10px ${MACHINE}`;
    ctx.textAlign = "center";
    ctx.fillText(c.nom, x + lc / 2, yc + 50);
  });

  // Pied de page.
  ctx.fillRect(G, H - 52, D - G, 1);
  ctx.textAlign = "left";
  ctx.font = `10px ${MACHINE}`;
  ctx.fillText("À TON TOUR, PRIVÉ :", G, H - 34);
  ctx.fillText(SITE, G, H - 21);
  ctx.textAlign = "right";
  // AGENCE / NOIRE, le O en rouge comme sur l'enseigne.
  ctx.font = `24px ${TITRE}`;
  ctx.fillText("AGENCE", D, H - 31);
  const fin = "IRE";
  const wFin = ctx.measureText(fin).width;
  const wO = ctx.measureText("O").width;
  ctx.fillText(fin, D, H - 11);
  ctx.fillStyle = ROUGE;
  ctx.fillText("O", D - wFin, H - 11);
  ctx.fillStyle = ENCRE;
  ctx.fillText("N", D - wFin - wO, H - 11);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image impossible"))), "image/png"));
}

// Partage natif (iPhone, Android) avec l'image ; sinon, téléchargement.
export async function partagerCarte(blob: Blob, d: DonneesCarte): Promise<"partage" | "telecharge" | "annule"> {
  const fichier = new File([blob], `agence-noire-${d.partie}.png`, { type: "image/png" });
  const texte = `${d.titre} : ${verdict(d).toLowerCase()}${d.heure ? `, dossier signé à ${d.heure}` : ""}. À ton tour, privé : https://agencenoire.fr/`;
  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], text: texte });
      return "partage";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "annule";
    }
  }
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = fichier.name;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(lien.href), 10_000);
  return "telecharge";
}
