import { useEffect, useRef, useState } from "react";
import type { EtatPartie } from "../lib/types";
import type { Actions } from "./Partie";
import { NavPartie } from "../composants/NavPartie";
import { indicesTrouves } from "../lib/partie";

const ROTATIONS = [-3, 2, 4, -2, 1, -4, 3, -1];

export function Mur({ etat, actions }: { etat: EtatPartie; actions: Actions }) {
  const indices = indicesTrouves(etat);
  const [notes, setNotes] = useState(etat.moi.notes);
  const minuteur = useRef<number | undefined>(undefined);

  // Enregistre les notes une seconde après la dernière frappe.
  useEffect(() => {
    if (notes === etat.moi.notes) return;
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => actions.sauverNotes(notes), 1000);
    return () => window.clearTimeout(minuteur.current);
  }, [notes, etat.moi.notes, actions]);

  return (
    <main className="ecran">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href={`#/p/${etat.partie.id}`} className="lien-retour">← SCÈNE</a>
        <span className="machine" style={{ fontSize: 12, color: "var(--gris)" }}>
          {indices.length} INDICE{indices.length > 1 ? "S" : ""}
        </span>
      </div>
      <h1 className="titre" style={{ fontSize: 64 }}>LE MUR</h1>

      {indices.length === 0 ? (
        <div className="mur" style={{ display: "block", textAlign: "center", padding: "48px 16px" }}>
          <span className="machine" style={{ fontSize: 13, color: "var(--gris)" }}>
            RIEN D'ÉPINGLÉ. INTERROGE, FOUILLE.
          </span>
        </div>
      ) : (
        <div className="mur">
          {indices.map((indice, i) => (
            <div
              key={indice.id}
              className="note-mur epingle"
              style={{ transform: `rotate(${ROTATIONS[i % ROTATIONS.length]}deg)`, marginTop: i % 2 ? 18 : 0, animationDelay: `${i * 60}ms` }}
            >
              <span className="punaise" />
              {indice.texte}
              <span className="source">— {indice.source.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      <span className="petit">{etat.partie.mode === "duel" ? "Personne d'autre ne voit ton mur." : "Ton mur, tes notes."}</span>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor="notes" className="etiquette">Mes notes</label>
        <textarea
          id="notes"
          rows={5}
          value={notes}
          placeholder="Qui ment ? Sur quoi ?"
          onChange={(e) => setNotes(e.target.value)}
          style={{ resize: "vertical", lineHeight: 1.45 }}
        />
      </div>

      <NavPartie partie={etat.partie.id} actif="mur" />
    </main>
  );
}
