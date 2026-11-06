import type { EtatAncien } from "../lib/types";

// Une enquête jouée avec l'ancienne règle (questions comptées, points) :
// elle reste aux archives, et sa une se relit telle quelle.
export function RevelationAncienne({ etat }: { etat: EtatAncien }) {
  const pub = etat.affaire.public;
  const sol = etat.revelation.solution;
  const nom = (id: string | null) => pub.suspects.find((s) => s.id === id)?.nom ?? "—";
  const mots = sol.une.toUpperCase().split(" ");
  const dernier = mots.pop();

  return (
    <main className="ecran journal" style={{ background: "var(--papier)", color: "var(--encre)", maxWidth: "none" }}>
      <div style={{ maxWidth: 448, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <a href="#/archives" className="lien-retour">← ARCHIVES</a>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, borderBottom: "3px double var(--encre)", paddingBottom: 8 }}>
          <span className="titre" style={{ fontSize: 40, letterSpacing: 2, lineHeight: 1 }}>{pub.journal.nom.toUpperCase()}</span>
          <span className="machine" style={{ fontSize: 11 }}>{pub.journal.date.toUpperCase()} · ANCIENNE RÈGLE</span>
        </div>
        <h1 className="titre" style={{ fontSize: 58, lineHeight: 0.86, textAlign: "center" }}>
          {mots.join(" ")} <span className="rouge-sombre">{dernier}</span>
        </h1>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{sol.recit}</p>
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--encre)" }}>
          {etat.revelation.joueurs.map((j) => (
            <div key={j.nom} className="ligne-preuve" style={{ gridTemplateColumns: "minmax(0, 1fr) auto" }}>
              <span>
                <b>{j.moi ? "Toi" : j.nom}</b> · {j.suspect ? nom(j.suspect) : "pas d'accusation"}
              </span>
              <span className="titre" style={{ fontSize: 22 }}>{j.score ?? 0} PTS</span>
            </div>
          ))}
        </div>
        <div className="detail-trahi">
          <b>Le détail qui trahissait :</b> {sol.rate}
        </div>
        <p className="petit" style={{ color: "#55524c", margin: 0 }}>
          Cette affaire a été réécrite pour la règle de la nuit : tu peux la rejouer comme une nouvelle.
        </p>
      </div>
    </main>
  );
}
