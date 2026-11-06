import type { EtatPartie } from "../lib/types";
import { finDeNuit, heureNuit, hhmm, minuteEvenement } from "../lib/partie";

// La nuit en une règle graduée, sur la scène : du crime à l'aube, l'aiguille
// à l'heure qu'il est, et les événements annoncés, barrés une fois passés.
export function LaNuit({ etat }: { etat: EtatPartie }) {
  const { horloge, evenements } = etat.affaire.public;
  const { minutes, aube } = etat.nuit;
  const debut = hhmm(horloge.debut);
  const pos = (m: number) => `${(Math.min(m, aube) / aube) * 100}%`;
  // Une graduation à chaque quart d'heure de la montre, plus longue à l'heure pile.
  const premier = Math.ceil(debut / 15) * 15 - debut;
  const graduations = Array.from({ length: Math.floor((aube - premier) / 15) + 1 }, (_, i) => premier + i * 15);
  const restant = aube - minutes;

  return (
    <section className="la-nuit" aria-label="La nuit">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="etiquette">L'horloge</span>
        <span className="machine" style={{ fontSize: 12, color: restant <= 60 ? "var(--rouge-texte)" : "var(--gris-clair)" }}>
          {restant <= 0
            ? "C'EST L'HEURE"
            : `${finDeNuit(horloge).court} DANS ${Math.floor(restant / 60) ? `${Math.floor(restant / 60)} H ` : ""}${String(restant % 60).padStart(2, "0")}${Math.floor(restant / 60) ? "" : " MIN"}`}
        </span>
      </div>

      <div className="regle-nuit">
        <span className="regle-passe" style={{ width: pos(minutes) }} />
        {graduations.map((g) => {
          const pile = (debut + g) % 60 === 0;
          return (
            <span key={g} className={`graduation${pile ? " pile" : ""}`} style={{ left: pos(g) }}>
              {pile && <span className="machine">{Math.floor((debut + g) / 60) % 24}</span>}
            </span>
          );
        })}
        {evenements.map((e) => (
          <span key={e.heure} className={`regle-evenement${minuteEvenement(horloge, e) <= minutes ? " passe" : ""}`} style={{ left: pos(minuteEvenement(horloge, e)) }} />
        ))}
        <span className="aiguille-nuit" style={{ left: pos(minutes) }}>
          <span className="titre">{heureNuit(horloge, minutes).replace(" h ", ":")}</span>
        </span>
        <span className="regle-aube" />
      </div>

      {evenements.length > 0 && (
        <ul className="evenements">
          {evenements.map((e) => {
            const passe = minuteEvenement(horloge, e) <= minutes;
            return (
              <li key={e.heure} className={passe ? "passe" : undefined}>
                <span className="titre">{heureNuit(horloge, minuteEvenement(horloge, e))}</span>
                <span>{e.texte}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
