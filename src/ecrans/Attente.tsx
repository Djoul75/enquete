import { useState } from "react";
import type { EtatPartie } from "../lib/types";
import { heuresRestantes, useMaintenant } from "../lib/routeur";
import { indicesTrouves, pluriel } from "../lib/partie";
import { Visage } from "../composants/Visage";
import { visageDe } from "../lib/visuels";
import { activerNotifications, etatNotifications } from "../lib/push";

// J'ai accusé, l'autre joueur pas encore : on attend la révélation. En
// attendant, le mur et le carnet restent lisibles.
export function Attente({ etat }: { etat: EtatPartie }) {
  const maintenant = useMaintenant(30_000);
  const [notifs, setNotifs] = useState(etatNotifications());
  const pub = etat.affaire.public;
  const a = etat.moi.accusation!;
  const autres = etat.autres.filter((x) => !x.a_accuse).map((x) => x.nom);
  const indices = indicesTrouves(etat);
  const preuve = indices.find((i) => i.id === a.preuve)?.texte;
  const suspect = pub.suspects.find((s) => s.id === a.suspect);
  const mobile = pub.mobiles.find((m) => m.id === a.mobile)?.texte;
  const echeance = etat.partie.echeance;
  const ecoule = echeance ? 1 - (new Date(echeance).getTime() - maintenant) / 86_400_000 : 0;
  const partie = etat.partie.id;

  return (
    <main className="ecran pluie">
      <a href="#/" className="lien-retour">← DOSSIERS</a>
      <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)", marginTop: -8 }}>{etat.affaire.titre.toUpperCase()}</span>
      <h1 className="titre apparait" style={{ fontSize: 64 }}>
        ACCUSATION
        <br />
        <span className="rouge">SIGNÉE.</span>
      </h1>

      <div className="deposition">
        {suspect && (
          <span style={{ width: 44, flexShrink: 0 }}>
            <Visage v={visageDe(suspect)} />
          </span>
        )}
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span className="titre" style={{ fontSize: 24 }}>{suspect?.nom.toUpperCase()}</span>
          <span className="machine" style={{ fontSize: 11, color: "#55524c" }}>{mobile}</span>
          <span className="machine" style={{ fontSize: 11, color: "#55524c" }}>{preuve}</span>
        </span>
        <span className="machine tampon-scelle">SCELLÉ</span>
      </div>

      {autres.length > 0 && (
        <div style={{ border: "1px solid var(--trait-fort)", padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="etiquette">{autres.join(", ")} enquête encore</span>
          <span className="titre" style={{ fontSize: 64, letterSpacing: 2 }}>{echeance ? heuresRestantes(echeance, maintenant).toUpperCase() : "EN ATTENTE"}</span>
          {echeance && (
            <span style={{ display: "block", height: 4, background: "var(--trait)" }}>
              <span style={{ display: "block", height: 4, width: `${Math.min(100, Math.max(0, ecoule * 100))}%`, background: "var(--rouge)" }} />
            </span>
          )}
          {notifs === "active" ? (
            <span style={{ fontSize: 13, color: "var(--gris-clair)" }}>Tu recevras une notification à la révélation.</span>
          ) : notifs === "inactive" ? (
            <button className="lien-retour" style={{ fontSize: 13, textDecoration: "underline", minHeight: 32 }} onClick={async () => setNotifs(await activerNotifications())}>
              Être prévenu de la révélation
            </button>
          ) : (
            <span style={{ fontSize: 13, color: "var(--gris-clair)" }}>La vérité sortira quand tout le monde aura accusé, ou à la fin du délai.</span>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="etiquette">En attendant</span>
        <div className="grille-2" style={{ gap: 8 }}>
          <a href={`#/p/${partie}/mur`} className="carte-lien">
            <span className="titre" style={{ fontSize: 24 }}>RELIRE LE MUR</span>
            <span style={{ fontSize: 12, color: "var(--gris-clair)" }}>{pluriel(indices.length, "indice")}</span>
          </a>
          <a href={`#/p/${partie}/carnet`} className="carte-lien">
            <span className="titre" style={{ fontSize: 24 }}>MON CARNET</span>
            <span style={{ fontSize: 12, color: "var(--gris-clair)" }}>notes et réponses</span>
          </a>
        </div>
      </div>

      <a href="#/" className="lien-suite">
        <span className="titre" style={{ fontSize: 22 }}>OUVRIR UN AUTRE DOSSIER</span>
        <span className="rouge" style={{ fontSize: 22 }}>→</span>
      </a>
    </main>
  );
}
