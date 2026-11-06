import { useEffect, useState } from "react";
import type { EtatPartie } from "../lib/types";
import { cleAlerte, type Alerte } from "../lib/alertes";
import { finDeNuit, heureNuit, minuteEvenement } from "../lib/partie";
import { mouvementReduit, vibrer } from "../lib/effets";

// Ce qui interrompt l'enquête, en plein écran : un événement de la nuit
// (télégramme sur papier, l'heure tamponnée) ou l'aube (le ciel pâlit, il
// faut signer). Chacun ne s'affiche qu'une fois par partie.

export function AlerteNuit({
  etat,
  alerte,
  onLu,
}: {
  etat: EtatPartie;
  alerte: Alerte;
  onLu: (versAccusation: boolean) => void;
}) {
  const pub = etat.affaire.public;
  const lire = (versAccusation: boolean) => {
    try {
      localStorage.setItem(cleAlerte(etat.partie.id, alerte.type === "aube" ? "aube" : alerte.e.heure), "1");
    } catch {
      // stockage interdit : l'alerte reviendra, tant pis
    }
    onLu(versAccusation);
  };

  // On laisse d'abord la réponse en cours finir de s'écrire.
  const [visible, setVisible] = useState(mouvementReduit());
  useEffect(() => {
    const id = window.setTimeout(() => {
      setVisible(true);
      vibrer(alerte.type === "aube" ? [60, 80, 60] : [30, 40, 30]);
    }, mouvementReduit() ? 0 : 2400);
    return () => window.clearTimeout(id);
    // une seule fois par alerte (le composant est remonté pour la suivante)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!visible) return null;

  const fin = finDeNuit(pub.horloge);
  if (alerte.type === "aube") {
    return (
      <div className="alerte-nuit aube" role="dialog" aria-modal="true" aria-labelledby="titre-aube">
        <div className="ciel-aube" aria-hidden="true" />
        <div className="alerte-corps">
          <span className="machine" style={{ fontSize: 13, letterSpacing: 2 }}>{pub.cadre.ville.toUpperCase()} · {heureNuit(pub.horloge, etat.nuit.aube).toUpperCase()}</span>
          <h1 id="titre-aube" className="titre">
            {fin.titre.map((l, i) => (
              <span key={i} style={{ display: "block" }}>{l}</span>
            ))}
          </h1>
          <p style={{ margin: 0, fontSize: 16, maxWidth: 320 }}>{fin.texte}</p>
          <button className="gros-bouton encre-fond" style={{ marginTop: "auto" }} onClick={() => lire(true)}>
            SIGNER LE DOSSIER →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alerte-nuit evenement" role="dialog" aria-modal="true" aria-labelledby="titre-evenement">
      <div className="alerte-corps">
        <div className="telegramme-papier">
          <span className="machine" style={{ fontSize: 11, letterSpacing: 2 }}>TÉLÉGRAMME · {pub.cadre.ville.toUpperCase()}</span>
          <span id="titre-evenement" className="titre heure-tampon">{heureNuit(pub.horloge, minuteEvenement(pub.horloge, alerte.e)).toUpperCase()}</span>
          <p className="machine">{alerte.e.texte.toUpperCase().replace(/\.$/, "")} STOP</p>
        </div>
        <button className="gros-bouton papier-fond" style={{ marginTop: "auto" }} onClick={() => lire(false)}>
          CONTINUER L'ENQUÊTE
        </button>
      </div>
    </div>
  );
}
