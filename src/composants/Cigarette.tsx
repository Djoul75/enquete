import { useEffect, useRef, useState } from "react";
import type { EtatSuspect } from "../lib/partie";

// La patience d'un suspect : une cigarette qui raccourcit d'un cran à
// chaque question qui fâche. Quand un cran part, la cendre tombe. Braqué,
// il l'écrase ; parti, il n'en reste qu'un mégot froid.
//   « grande » : en tête de l'interrogatoire ; « petite » : cartes de la scène.

const FILTRE = 20;
const CORPS = 84;

export function Cigarette({
  patience,
  max,
  etat,
  taille = "grande",
  nom,
}: {
  patience: number;
  max: number;
  etat: EtatSuspect;
  taille?: "grande" | "petite";
  nom: string;
}) {
  // Un cran vient de partir : on garde l'ancienne longueur le temps que la
  // cendre tombe, puis la cigarette raccourcit.
  const precedente = useRef(patience);
  const [chute, setChute] = useState<{ de: number; a: number } | null>(null);
  useEffect(() => {
    if (patience < precedente.current) {
      setChute({ de: precedente.current, a: patience });
      const id = window.setTimeout(() => setChute(null), 1400);
      precedente.current = patience;
      return () => window.clearTimeout(id);
    }
    precedente.current = patience;
  }, [patience]);

  const echelle = taille === "grande" ? 1 : 0.62;
  const largeur = Math.round((FILTRE + CORPS + 14) * echelle);
  const hauteur = Math.round(44 * echelle);
  const libelle =
    etat === "braque" ? `${nom} s'est braqué` : etat === "parti" ? `${nom} est parti` : `Patience de ${nom} : ${patience} sur ${max}`;

  if (etat !== "libre") {
    return (
      <svg className={`cigarette ${etat}`} width={largeur} height={hauteur} viewBox="0 0 118 44" role="img" aria-label={libelle}>
        {/* Le mégot, écrasé et plié, et sa traînée de cendre. */}
        <path d="M30 37 q14 -2 26 1" stroke="#4a4740" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.7" />
        <g transform="rotate(-9 20 33)">
          <rect x="2" y="29" width={FILTRE} height="8" fill="url(#cig-liege)" />
          <rect x={2 + FILTRE} y="29" width="2" height="8" fill="#d8b46a" />
          <path d={`M${4 + FILTRE} 29 h7 l3 2 -2 2 3 2 -4 2 h-7 z`} fill="var(--papier)" opacity={etat === "parti" ? 0.4 : 0.85} />
          <path d={`M${13 + FILTRE} 30 l2 1.5 -2 2 2 2 -2 1.5`} stroke="#2a2925" strokeWidth="1.5" fill="none" />
        </g>
        <DefsCigarette />
      </svg>
    );
  }

  const part = Math.max(0, patience) / max;
  const cran = CORPS / max;
  // Pendant la chute, le corps garde l'ancienne longueur ; ensuite il se
  // raccourcit et la tête (cendre, braise, fumée) recule avec lui.
  const longueur = (chute ? chute.de / max : part) * CORPS;
  const depart = 2 + FILTRE;

  return (
    <svg className="cigarette" width={largeur} height={hauteur} viewBox="0 0 118 44" role="img" aria-label={libelle}>
      <DefsCigarette />
      <rect x="2" y="27" width={FILTRE} height="9" fill="url(#cig-liege)" />
      <rect className="cig-corps" x={depart} y="27" width={CORPS} height="9" fill="url(#cig-papier)" style={{ transform: `scaleX(${longueur / CORPS})` }} />
      <rect x={depart} y="27" width="2" height="9" fill="#d8b46a" />
      {chute && (
        <rect className="cig-chute" x={depart + (chute.a / max) * CORPS} y="27" width={cran * (chute.de - chute.a)} height="9" fill="#8a867e" />
      )}
      <g className="cig-tete" style={{ transform: `translateX(${longueur}px)` }}>
        <g className="cig-fumee" aria-hidden="true">
          <path d={`M${depart + 4} 27 c -6 -6, 6 -10, 0 -16 s 5 -7, 1 -10`} />
          <path d={`M${depart + 4} 27 c 5 -5, -5 -9, 1 -14 s -4 -6, 0 -9`} />
        </g>
        <path d={`M${depart} 27 h3 l1.5 1.5 -1 2 1.2 2.2 -1 2 -0.7 1.3 h-3 z`} fill="#77736b" />
        <rect className="cig-braise" x={depart + 3} y="28" width="2.4" height="7" fill="var(--rouge)" />
        <circle className="cig-lueur" cx={depart + 4.5} cy="31.5" r="7" fill="url(#cig-lueur)" />
      </g>
    </svg>
  );
}

function DefsCigarette() {
  return (
    <defs>
      <linearGradient id="cig-papier" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbf8f1" />
        <stop offset="0.55" stopColor="#ede8dd" />
        <stop offset="1" stopColor="#b5b0a7" />
      </linearGradient>
      <pattern id="cig-liege" width="5" height="5" patternUnits="userSpaceOnUse">
        <rect width="5" height="5" fill="#c4955a" />
        <circle cx="1.2" cy="1.5" r="0.6" fill="#8e6232" />
        <circle cx="3.6" cy="3.8" r="0.5" fill="#9c6e3c" />
      </pattern>
      <radialGradient id="cig-lueur">
        <stop offset="0" stopColor="#ff6a2b" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ff6a2b" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}
