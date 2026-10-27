import type { EtatPartie } from "../lib/types";
import { indicesTrouves } from "../lib/partie";

export function Revelation({ etat }: { etat: EtatPartie }) {
  const pub = etat.affaire.public;
  const r = etat.revelation!;
  const sol = r.solution;
  const trouves = new Set(indicesTrouves(etat).map((i) => i.id));
  const ratees = sol.preuves.filter((p) => !trouves.has(p));
  const nom = (id: string | null) => pub.suspects.find((s) => s.id === id)?.nom ?? "—";
  const mots = sol.une.toUpperCase().split(" ");
  const dernier = mots.pop();

  return (
    <main className="ecran" style={{ background: "var(--papier)", color: "var(--encre)", maxWidth: "none" }}>
      <div style={{ maxWidth: 448, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <a href="#/" className="lien-retour">← DOSSIERS</a>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, borderBottom: "3px double var(--encre)", paddingBottom: 8 }}>
          <span className="titre" style={{ fontSize: 40, letterSpacing: 2, lineHeight: 1 }}>{pub.journal.nom.toUpperCase()}</span>
          <span className="machine" style={{ fontSize: 11 }}>
            ÉDITION SPÉCIALE · {pub.journal.date.toUpperCase()} · {pub.journal.prix.toUpperCase()}
          </span>
        </div>

        <h1 className="titre apparait" style={{ fontSize: 60, lineHeight: 0.86, textAlign: "center" }}>
          {mots.join(" ")} <span className="rouge">{dernier}</span>
        </h1>

        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, }}>{sol.recit}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(2, r.joueurs.length)}, minmax(0, 1fr))`,
            gap: 10,
          }}
        >
          {r.joueurs.map((j, i) => {
            const juste = j.suspect === sol.coupable;
            const premier = i === 0 && j.score > 0;
            return (
              <div
                key={j.nom}
                style={{
                  background: premier ? "var(--encre)" : undefined,
                  color: premier ? "var(--papier)" : undefined,
                  border: premier ? undefined : "2px solid var(--encre)",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span className="machine" style={{ fontSize: 12, opacity: 0.7 }}>{j.moi ? "TOI" : j.nom.toUpperCase()}</span>
                <span className="titre" style={{ fontSize: 26, lineHeight: 1, textDecoration: juste || !j.suspect ? undefined : "line-through" }}>
                  {j.suspect ? nom(j.suspect).toUpperCase() : "PAS D'ACCUSATION"}
                </span>
                <span style={{ fontSize: 12, lineHeight: 1.35 }}>
                  {j.suspect ? (
                    <>
                      Mobile {j.mobile === sol.mobile ? "juste" : "faux"} · preuve {sol.preuves.includes(j.preuve ?? "") ? "juste" : "faible"}
                      <br />
                      {j.questions} question{j.questions > 1 ? "s" : ""}
                    </>
                  ) : (
                    "Délai dépassé."
                  )}
                </span>
                <span className="titre" style={{ fontSize: 22, color: premier ? "var(--rouge)" : undefined }}>
                  {juste ? "RÉSOLU" : "CLASSÉ"} · {j.score} PTS
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: "1px solid var(--encre)", paddingTop: 10, fontSize: 13 }}>
          <span className="machine" style={{ fontSize: 12 }}>LE DÉTAIL QUI TRAHISSAIT</span>
          <span>{sol.rate}</span>
        </div>

        {ratees.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            <span className="machine" style={{ fontSize: 12 }}>CE QUE TU N'AS PAS TROUVÉ</span>
            {ratees.map((id) => (
              <span key={id} style={{ borderLeft: "2px solid var(--rouge)", paddingLeft: 8 }}>{r.indices[id]?.texte}</span>
            ))}
          </div>
        )}

        <a href="#/" className="gros-bouton encre-fond" style={{ marginTop: 8 }}>
          {r.joueurs.length > 1 ? "REVANCHE" : "AUTRE AFFAIRE"}
        </a>
      </div>
    </main>
  );
}
