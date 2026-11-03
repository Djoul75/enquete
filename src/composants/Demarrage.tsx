import { useEffect, useState } from "react";

// L'enseigne au néon à l'ouverture de l'app installée (maquette B validée).
// Elle prend le relais de l'image de lancement de l'iPhone, identique mais
// figée avec le T éteint : le T grésille, s'allume, et l'enseigne s'efface
// sur l'accueil, déjà prêt dessous. Un toucher la fait partir tout de suite.
const DUREE = 1100;

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
    <div className={`demarrage pluie${sortie ? " sortie" : ""}`} onClick={onFini} aria-hidden="true">
      <div className="enseigne">
        <span className="titre enseigne-mot">
          <span className="allume">ENQUÊ</span>
          <span className="t-neon">T</span>
          <span className="allume">E</span>
        </span>
        <span className="machine allume enseigne-sous">· OUVERT LA NUIT ·</span>
      </div>
      <div className="flaque" />
      <span className="machine enseigne-pied">AGENCE DE DÉTECTIVES PRIVÉS</span>
    </div>
  );
}
