import { useEffect, useState } from "react";
import type { EtatPartie } from "../lib/types";
import { BarreOnglets, EnTete } from "../composants/NavPartie";
import { indicesTrouves, nomCourt } from "../lib/partie";

const ROTATIONS = [-3, 2, 4, -2, 1, -4, 3, -1];

// Le mur des indices. `dejaVus` : combien d'indices étaient là à la dernière
// visite ; les suivants portent l'étiquette « nouveau ».
export function Mur({ etat, dejaVus, onVu, lectureSeule }: { etat: EtatPartie; dejaVus: number; onVu: () => void; lectureSeule?: boolean }) {
  const pub = etat.affaire.public;
  const indices = indicesTrouves(etat);
  const [filtre, setFiltre] = useState<string>("tout");
  // On garde le compte de l'arrivée : les étiquettes « nouveau » restent
  // affichées pendant la visite même si on marque le mur comme vu.
  const [nouveauxDes] = useState(dejaVus);

  useEffect(() => {
    onVu();
  }, [onVu]);

  const filtres = [
    { id: "tout", nom: "TOUT", n: indices.length },
    ...pub.suspects
      .map((s) => ({ id: s.id, nom: nomCourt(s.nom).toUpperCase(), n: indices.filter((i) => i.type === "question" && i.cible === s.id).length }))
      .filter((f) => f.n > 0)
      .sort((a, b) => b.n - a.n),
    { id: "lieux", nom: "LIEUX", n: indices.filter((i) => i.type === "fouille").length },
  ].filter((f) => f.id === "tout" || f.n > 0);

  const visibles = indices
    .map((indice, rang) => ({ indice, rang }))
    .filter(({ indice }) => filtre === "tout" || (filtre === "lieux" ? indice.type === "fouille" : indice.cible === filtre))
    .reverse(); // le plus récent en haut

  return (
    <main className="ecran jeu">
      <EnTete
        etat={etat}
        retour={lectureSeule ? `#/p/${etat.partie.id}` : "#/"}
        libelleRetour={lectureSeule ? "Retour" : "Dossiers"}
      />

      <div className="vue-entree" style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h1 className="titre" style={{ fontSize: 48 }}>LE MUR</h1>
          <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)" }}>
            {indices.length} INDICE{indices.length > 1 ? "S" : ""}
          </span>
        </div>

        {indices.length > 1 && (
          <div className="filtres machine" role="group" aria-label="Filtrer les indices">
            {filtres.map((f) => (
              <button key={f.id} aria-pressed={filtre === f.id} onClick={() => setFiltre(f.id)}>
                {f.nom} {f.n}
              </button>
            ))}
          </div>
        )}

        {indices.length === 0 ? (
          <div className="mur" style={{ display: "block", textAlign: "center", padding: "48px 16px" }}>
            <span className="machine" style={{ fontSize: 13, color: "var(--gris)" }}>RIEN D'ÉPINGLÉ. INTERROGE, FOUILLE.</span>
          </div>
        ) : (
          <div className="mur" key={filtre}>
            {visibles.map(({ indice, rang }, i) => (
              <div
                key={indice.id}
                className="note-mur epingle"
                style={{ transform: `rotate(${ROTATIONS[rang % ROTATIONS.length]}deg)`, marginTop: i % 2 ? 18 : 0, animationDelay: `${i * 60}ms` }}
              >
                {rang >= nouveauxDes && <span className="machine etiquette-nouveau">NOUVEAU</span>}
                <span className="punaise" />
                {indice.texte}
                {lectureSeule ? (
                  <span className="source">— {indice.source.toUpperCase()}</span>
                ) : (
                  <a
                    className="source"
                    href={indice.type === "fouille" ? `#/p/${etat.partie.id}/lieu/${indice.cible}` : `#/p/${etat.partie.id}/suspect/${indice.cible}`}
                  >
                    — {indice.source.toUpperCase()} →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <span className="petit">{etat.partie.mode === "duel" ? "Personne d'autre ne voit ton mur." : "Ton mur, tes indices."}</span>
      </div>

      {!lectureSeule && <BarreOnglets etat={etat} actif="mur" />}
    </main>
  );
}
