import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { aller } from "../lib/routeur";
import { vibrer } from "../lib/effets";
import { DEFINITIONS, type EtatTampon } from "../lib/tampons";
import { Tampon } from "./Tampon";

// Le coup de tampon : à chaque nouveau succès, le manche en bois s'abat en
// plein écran, l'encre marque le papier, le téléphone vibre. Plusieurs
// nouveaux tampons défilent l'un après l'autre ; une fois vus, ils ne
// retombent plus (enquete_tampons_vus).
const IMPACT = 380;

export function CoupsDeTampon({
  nouveaux,
  total,
  gagnes,
  pseudo,
  onVus,
  delai = 0,
}: {
  nouveaux: EtatTampon[];
  total: number;
  gagnes: number;
  pseudo: string;
  onVus: (cles: string[]) => void;
  delai?: number;
}) {
  const [pret, setPret] = useState(delai === 0);
  const [rang, setRang] = useState(0);
  // Les tampons ne sont marqués vus qu'à la fermeture : la file ne bouge pas
  // pendant qu'on la fait défiler.
  const file = pret ? nouveaux : [];
  const courant = file[rang];

  useEffect(() => {
    if (delai === 0) return;
    const id = window.setTimeout(() => setPret(true), delai);
    return () => window.clearTimeout(id);
  }, [delai]);

  useEffect(() => {
    if (!courant) return;
    const id = window.setTimeout(() => vibrer([30, 40, 15]), IMPACT);
    return () => window.clearTimeout(id);
  }, [courant]);

  if (!courant) return null;

  const d = DEFINITIONS[courant.cle];
  const dernier = rang === file.length - 1;
  const fermer = (ensuite?: () => void) => {
    onVus(file.map((t) => t.cle));
    setRang(0);
    ensuite?.();
  };

  return createPortal(
    <div className="coup-tampon" role="dialog" aria-modal="true" aria-label={`Nouveau tampon : ${d.nom}`}>
      <div key={courant.cle} className="coup-scene">
        <span className="machine coup-etiquette">NOUVEAU TAMPON{file.length > 1 ? ` · ${rang + 1}/${file.length}` : ""}</span>
        <div className="coup-zone">
          <span className="coup-manche" aria-hidden="true"><i /><b /></span>
          <span className="coup-empreinte">
            <Tampon etat={courant} pseudo={pseudo} />
          </span>
          <span className="coup-gouttes" aria-hidden="true"><i /><i /><i /><i /></span>
        </div>
        <div className="coup-texte">
          <span className="titre" style={{ fontSize: 34 }}>{d.nom}</span>
          <span style={{ fontSize: 14, color: "#55524c" }}>{d.regle}.</span>
          <span className="machine" style={{ fontSize: 12, color: "#55524c" }}>
            {Math.min(gagnes - (file.length - 1 - rang), total)} SUR {total} DANS TON PASSEPORT
          </span>
        </div>
        <div className="coup-boutons">
          {dernier ? (
            <>
              <button className="gros-bouton encre-fond" onClick={() => fermer(() => aller("/tampons"))}>VOIR LE PASSEPORT</button>
              <button className="lien-retour" style={{ alignSelf: "center" }} onClick={() => fermer()}>CONTINUER</button>
            </>
          ) : (
            <button className="gros-bouton encre-fond" onClick={() => setRang(rang + 1)}>TAMPON SUIVANT →</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
