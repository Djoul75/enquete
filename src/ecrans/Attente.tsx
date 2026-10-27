import type { EtatPartie } from "../lib/types";
import { compteARebours, useMaintenant } from "../lib/routeur";
import { indicesTrouves } from "../lib/partie";

// J'ai accusé, l'autre joueur pas encore : on attend la révélation.
export function Attente({ etat }: { etat: EtatPartie }) {
  const maintenant = useMaintenant();
  const pub = etat.affaire.public;
  const a = etat.moi.accusation!;
  const autres = etat.autres.filter((x) => !x.a_accuse).map((x) => x.nom);
  const preuve = indicesTrouves(etat).find((i) => i.id === a.preuve)?.texte;

  return (
    <main className="ecran pluie">
      <a href="#/" className="lien-retour">← DOSSIERS</a>
      <span className="machine" style={{ fontSize: 12, color: "var(--gris)" }}>{etat.affaire.titre.toUpperCase()}</span>
      <h1 className="titre apparait" style={{ fontSize: 72 }}>
        ACCUSATION
        <br />
        <span className="rouge">SIGNÉE.</span>
      </h1>

      <div style={{ border: "1px solid var(--trait-fort)", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="etiquette">Ta déposition</span>
        <span className="titre" style={{ fontSize: 32 }}>{pub.suspects.find((s) => s.id === a.suspect)?.nom.toUpperCase()}</span>
        <span style={{ fontSize: 14 }}>Mobile : {pub.mobiles.find((m) => m.id === a.mobile)?.texte}</span>
        <span style={{ fontSize: 14 }}>Preuve : {preuve}</span>
      </div>

      {autres.length > 0 && (
        <div style={{ background: "var(--papier)", color: "var(--encre)", padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="machine" style={{ fontSize: 12 }}>{autres.join(", ").toUpperCase()} ENQUÊTE ENCORE</span>
          {etat.partie.echeance ? (
            <span className="titre" style={{ fontSize: 64, letterSpacing: 2 }}>{compteARebours(etat.partie.echeance, maintenant)}</span>
          ) : (
            <span className="titre" style={{ fontSize: 40 }}>EN ATTENTE</span>
          )}
          <span style={{ fontSize: 13 }}>La vérité sortira quand tout le monde aura accusé, ou à la fin du délai.</span>
        </div>
      )}
    </main>
  );
}
