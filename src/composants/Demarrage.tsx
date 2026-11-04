import { useEffect, useState } from "react";
import rue from "./rue.html?raw";
import "./rue.css";

// La rue de l'agence à l'ouverture de l'app installée (maquette C bis validée).
// Elle prend le relais de l'image de lancement de l'iPhone, identique mais
// figée avec le O éteint : le O grésille, s'allume, et la rue s'efface sur
// l'accueil, déjà prêt dessous. Un toucher la fait partir tout de suite.
const DUREE = 1300;

// Le décor est dessiné sur 390 × 844 : il couvre un téléphone, il tient en
// entier sur un écran plus large.
function echelle() {
  const l = window.innerWidth / 390;
  const h = window.innerHeight / 844;
  return window.innerWidth / window.innerHeight > 0.7 ? Math.min(l, h) : Math.max(l, h);
}

export function Demarrage({ onFini }: { onFini: () => void }) {
  const [sortie, setSortie] = useState(false);

  useEffect(() => {
    const a = window.setTimeout(() => setSortie(true), DUREE - 320);
    const b = window.setTimeout(onFini, DUREE);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [onFini]);

  return (
    <div className={`demarrage${sortie ? " sortie" : ""}`} onClick={onFini} aria-hidden="true">
      <div className="rue" style={{ "--echelle": echelle() } as React.CSSProperties} dangerouslySetInnerHTML={{ __html: rue }} />
      <span className="rue-pied">DÉTECTIVES PRIVÉS · 2<sup>E</sup> ÉTAGE</span>
    </div>
  );
}
