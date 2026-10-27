import { useEffect, useRef } from "react";
import type { EtatPartie } from "../lib/types";
import type { Actions } from "./Partie";
import { Silhouette } from "../composants/Silhouette";
import { NavPartie } from "../composants/NavPartie";
import { compteurs, questionsDisponibles } from "../lib/partie";

export function Interrogatoire({ etat, suspectId, actions }: { etat: EtatPartie; suspectId: string; actions: Actions }) {
  const pub = etat.affaire.public;
  const suspect = pub.suspects.find((s) => s.id === suspectId);
  const c = compteurs(etat);
  const fin = useRef<HTMLDivElement>(null);
  const echanges = etat.journal.filter(
    (e) => e.type === "question" && pub.questions.find((q) => q.id === e.ref)?.suspect === suspectId
  );
  const disponibles = questionsDisponibles(etat, suspectId);
  const nbEchanges = echanges.length;

  useEffect(() => {
    if (nbEchanges > 0) fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [nbEchanges]);

  if (!suspect) {
    return (
      <main className="ecran">
        <a href={`#/p/${etat.partie.id}`} className="lien-retour">← SCÈNE</a>
        <p>Personne de ce nom dans le dossier.</p>
      </main>
    );
  }

  return (
    <main className="ecran" style={{ paddingTop: 0, gap: 0 }}>
      <header style={{ position: "relative", height: 210, margin: "0 -16px", overflow: "hidden", flexShrink: 0 }}>
        {/* La lampe de l'interrogatoire */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: 320,
            height: 230,
            transform: "translateX(-50%)",
            background: "linear-gradient(180deg, rgba(237,232,221,0.16), rgba(237,232,221,0.02))",
            clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0 100%)",
          }}
        />
        <div style={{ position: "absolute", left: "50%", bottom: 0, width: 150, transform: "translateX(-50%)" }}>
          <Silhouette variante={suspect.silhouette} fond="transparent" />
        </div>
        <a href={`#/p/${etat.partie.id}`} className="lien-retour" style={{ position: "absolute", left: 16, top: "calc(8px + env(safe-area-inset-top))" }}>
          ← SCÈNE
        </a>
        <span className="machine" style={{ position: "absolute", right: 16, top: "calc(20px + env(safe-area-inset-top))", fontSize: 12, color: "var(--gris)" }}>
          QUESTIONS {c.questions}/{etat.limites.questions}
        </span>
      </header>

      <div style={{ borderBottom: "3px solid var(--rouge)", paddingBottom: 4 }}>
        <h1 className="titre" style={{ fontSize: 40, lineHeight: 1.05 }}>{suspect.nom.toUpperCase()}</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 0" }}>
        <p style={{ margin: 0, color: "var(--gris-clair)", fontStyle: "italic", fontSize: 14 }}>{suspect.portrait}</p>

        {echanges.map((e) => {
          const q = pub.questions.find((x) => x.id === e.ref);
          return (
            <div key={e.ref} className="apparait" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="machine" style={{ fontSize: 12, color: "var(--gris)" }}>TOI</span>
                <span>{q?.texte}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 12, borderLeft: "2px solid var(--papier)" }}>
                <span className="machine" style={{ fontSize: 12, color: "var(--gris)" }}>{suspect.nom.toUpperCase()}</span>
                <span>« {e.texte} »</span>
                {e.didascalie && <span style={{ fontSize: 13, color: "var(--gris)", fontStyle: "italic" }}>{e.didascalie}</span>}
              </div>
              {e.indice && (
                <div style={{ display: "flex", gap: 10, alignItems: "center", border: "1px dashed var(--rouge)", padding: "10px 12px" }}>
                  <span className="machine rouge" style={{ fontSize: 12, flexShrink: 0 }}>INDICE</span>
                  <span style={{ fontSize: 13 }}>{e.indice.texte}</span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={fin} />
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--trait)", padding: "12px 0 16px" }}>
        {actions.erreur && <p className="erreur">{actions.erreur}</p>}
        {c.questionsRestantes <= 0 ? (
          <p className="machine" style={{ margin: 0, fontSize: 13, color: "var(--gris)" }}>
            PLUS DE QUESTIONS. IL EST TEMPS D'ACCUSER.
          </p>
        ) : disponibles.length === 0 ? (
          <p className="machine" style={{ margin: 0, fontSize: 13, color: "var(--gris)" }}>
            RIEN DE PLUS À LUI DEMANDER… POUR L'INSTANT.
          </p>
        ) : (
          <>
            <span className="etiquette">Demander… ({c.questionsRestantes} restante{c.questionsRestantes > 1 ? "s" : ""})</span>
            {disponibles.map((q) => (
              <button key={q.id} className="bouton" disabled={actions.occupe} onClick={() => actions.poser(q.id)}>
                {q.requiert ? <span className="rouge">{q.texte}</span> : q.texte}
              </button>
            ))}
          </>
        )}
      </section>

      <NavPartie partie={etat.partie.id} actif="scene" />
    </main>
  );
}
