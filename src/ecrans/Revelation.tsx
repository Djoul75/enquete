import { useEffect, useState } from "react";
import type { EtatPartie } from "../lib/types";
import { indicesTrouves } from "../lib/partie";
import { api } from "../lib/api";
import { aller } from "../lib/routeur";
import { mouvementReduit } from "../lib/effets";

export function Revelation({ etat }: { etat: EtatPartie }) {
  const pub = etat.affaire.public;
  const r = etat.revelation!;
  const sol = r.solution;
  const mesIndices = new Set(indicesTrouves(etat).map((i) => i.id));
  const nom = (id: string | null) => pub.suspects.find((s) => s.id === id)?.nom ?? "—";
  const mots = sol.une.toUpperCase().split(" ");
  const dernier = mots.pop();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Le journal arrive en tournoyant, comme dans les vieux films, la première fois.
  const cle = `enquete-revele-${etat.partie.id}`;
  const [tourne] = useState(() => !localStorage.getItem(cle) && !mouvementReduit());
  useEffect(() => localStorage.setItem(cle, "1"), [cle]);

  // Colonnes du tableau des preuves : moi toujours, les autres si la base
  // donne leurs indices (migration 0002).
  const colonnes = r.joueurs
    .filter((j) => j.moi || j.indices)
    .sort((a, b) => Number(b.moi) - Number(a.moi))
    .map((j) => ({ nom: j.moi ? "TOI" : j.nom.split(" ")[0].toUpperCase(), trouves: j.moi ? mesIndices : new Set(j.indices) }));

  async function revanche() {
    setOccupe(true);
    try {
      aller(`/p/${await api.nouvellePartie(etat.partie.mode)}`);
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(false);
    }
  }

  return (
    <main className="ecran journal" style={{ background: "var(--papier)", color: "var(--encre)", maxWidth: "none" }}>
      <div className={tourne ? "journal-tourne" : undefined} style={{ maxWidth: 448, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <a href="#/" className="lien-retour">← DOSSIERS</a>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, borderBottom: "3px double var(--encre)", paddingBottom: 8 }}>
          <span className="titre" style={{ fontSize: 40, letterSpacing: 2, lineHeight: 1 }}>{pub.journal.nom.toUpperCase()}</span>
          <span className="machine" style={{ fontSize: 11 }}>
            ÉDITION SPÉCIALE · {pub.journal.date.toUpperCase()} · {pub.journal.prix.toUpperCase()}
          </span>
        </div>

        <h1 className="titre" style={{ fontSize: 58, lineHeight: 0.86, textAlign: "center" }}>
          {mots.join(" ")} <span className="rouge-sombre">{dernier}</span>
        </h1>

        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{sol.recit}</p>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(2, r.joueurs.length)}, minmax(0, 1fr))`, gap: 10 }}>
          {r.joueurs.map((j, i) => {
            const juste = j.suspect === sol.coupable;
            const premier = i === 0 && j.score > 0;
            return (
              <div
                key={j.nom}
                className="carte-score"
                style={{
                  background: premier ? "var(--encre)" : undefined,
                  color: premier ? "var(--papier)" : undefined,
                  border: premier ? undefined : "2px solid var(--encre)",
                  animationDelay: `${(tourne ? 1300 : 0) + i * 150}ms`,
                }}
              >
                <span className="machine" style={{ fontSize: 12, opacity: 0.75 }}>{j.moi ? "TOI" : j.nom.toUpperCase()}</span>
                <span className="titre" style={{ fontSize: 24, lineHeight: 1, textDecoration: juste || !j.suspect ? undefined : "line-through" }}>
                  {j.suspect ? nom(j.suspect).toUpperCase() : "PAS D'ACCUSATION"}
                </span>
                <span className="titre" style={{ fontSize: 30, color: premier ? "var(--rouge-texte)" : undefined }}>{j.score} PTS</span>
                <span className="machine" style={{ fontSize: 11, lineHeight: 1.35 }}>
                  {j.suspect
                    ? `${juste ? "RÉSOLUE" : "CLASSÉE"} · MOBILE ${j.mobile === sol.mobile ? "JUSTE" : "FAUX"} · ${j.questions} Q.`
                    : "DÉLAI DÉPASSÉ"}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--encre)", paddingTop: 10 }}>
          <div className="ligne-preuve" style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${colonnes.length}, 64px)`, paddingTop: 0 }}>
            <span className="machine" style={{ fontSize: 12 }}>LES PREUVES</span>
            {colonnes.map((c) => (
              <span key={c.nom} className="machine" style={{ fontSize: 10, textAlign: "center", overflowWrap: "anywhere" }}>{c.nom}</span>
            ))}
          </div>
          {sol.preuves.map((id) => (
            <div key={id} className="ligne-preuve" style={{ gridTemplateColumns: `minmax(0, 1fr) repeat(${colonnes.length}, 64px)` }}>
              <span>{r.indices[id]?.texte}</span>
              {colonnes.map((c) => (
                <span key={c.nom} style={{ textAlign: "center", fontWeight: 700, color: c.trouves.has(id) ? undefined : "var(--rouge-sombre)" }}>
                  {c.trouves.has(id) ? "✓" : "✗"}
                </span>
              ))}
            </div>
          ))}
          <div className="detail-trahi">
            <b>Le détail qui trahissait :</b> {sol.rate}
          </div>
        </div>

        {erreur && <p className="erreur">{erreur}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
          <a href={`#/p/${etat.partie.id}/carnet`} className="gros-bouton contour" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            REVOIR L'ENQUÊTE
            <span style={{ fontFamily: "var(--texte)", fontSize: 12, letterSpacing: 0, color: "#55524c" }}>tes notes et réponses, avec la solution en tête</span>
          </a>
          <button className="gros-bouton encre-fond" onClick={revanche} disabled={occupe}>
            {occupe ? "…" : etat.partie.mode === "duel" ? "REVANCHE : NOUVEAU DUEL →" : "AFFAIRE SUIVANTE →"}
          </button>
        </div>
      </div>
    </main>
  );
}
