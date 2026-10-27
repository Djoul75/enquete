import type { EtatPartie } from "../lib/types";
import { compteARebours, useMaintenant } from "../lib/routeur";
import { compteurs } from "../lib/partie";

export function Telegramme({ etat, onLu }: { etat: EtatPartie; onLu: () => void }) {
  const maintenant = useMaintenant();
  const accusateur = etat.autres.find((a) => a.a_accuse);
  const c = compteurs(etat);
  const echeance = etat.partie.echeance;
  const ecoule = echeance ? 1 - (new Date(echeance).getTime() - maintenant) / 86_400_000 : 0;
  const heure = accusateur?.accuse_at
    ? new Date(accusateur.accuse_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " H ")
    : "";

  return (
    <main className="ecran" style={{ background: "var(--rouge)", color: "var(--encre)", overflow: "hidden", maxWidth: "none" }}>
      <div style={{ maxWidth: 448, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 14, flex: 1, position: "relative" }}>
        <div
          aria-hidden="true"
          style={{ position: "absolute", right: -100, top: 110, width: 300, height: 300, borderRadius: "50%", border: "40px solid rgba(11,11,11,0.12)" }}
        />
        <span className="machine" style={{ fontSize: 13, marginTop: 8 }}>TÉLÉGRAMME · {heure}</span>
        <h1 className="titre apparait" style={{ fontSize: 76, lineHeight: 0.86, position: "relative" }}>
          {accusateur?.nom.toUpperCase()}
          <br />A DÉSIGNÉ
          <br />UN COUPABLE.
        </h1>
        <p style={{ margin: 0, fontSize: 16, maxWidth: 300, position: "relative" }}>
          Tu ne sauras pas qui avant d'avoir accusé à ton tour. Passé ce délai, ton dossier sera classé.
        </p>

        {echeance && (
          <div style={{ background: "var(--encre)", color: "var(--papier)", padding: 18, display: "flex", flexDirection: "column", gap: 6, marginTop: 20, position: "relative" }}>
            <span className="etiquette">Temps restant</span>
            <span className="titre" style={{ fontSize: 84, letterSpacing: 2 }}>{compteARebours(echeance, maintenant)}</span>
            <div style={{ height: 4, background: "var(--trait)" }}>
              <div style={{ width: `${Math.min(100, Math.max(0, ecoule * 100))}%`, height: 4, background: "var(--rouge)" }} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 14, position: "relative" }}>
          <span>
            Toi : {c.questions} questions sur {etat.limites.questions}.
          </span>
          <span>
            Il te reste {c.fouillesRestantes} fouille{c.fouillesRestantes > 1 ? "s" : ""}.
          </span>
        </div>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
          <button className="gros-bouton encre-fond" onClick={onLu}>CONTINUER L'ENQUÊTE</button>
          <a
            className="gros-bouton contour"
            href={`#/p/${etat.partie.id}/accuser`}
            onClick={() => localStorage.setItem(`enquete-telegramme-${etat.partie.id}`, "1")}
            style={{ color: "var(--encre)" }}
          >
            ACCUSER MAINTENANT
          </a>
        </div>
      </div>
    </main>
  );
}
