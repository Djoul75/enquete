import { useEffect, useRef, useState } from "react";
import type { EtatPartie } from "../lib/types";
import { hhmm, minuteEvenement } from "../lib/partie";
import { mouvementReduit } from "../lib/effets";

// L'heure de la nuit, en haut de chaque écran de jeu. Quand un geste coûte
// du temps, les aiguilles tournent, les minutes défilent et le coût s'envole
// (« +10 MIN »). On retient la dernière heure vue de chaque partie pour
// rejouer l'avance en changeant d'écran (une fouille, puis retour à la scène).

const vues = new Map<number, number>();

function useHeureAnimee(partie: number, minutes: number) {
  const [affichee, setAffichee] = useState(() => vues.get(partie) ?? minutes);
  const [ecart, setEcart] = useState<{ n: number; cle: number } | null>(null);
  const image = useRef(0);

  useEffect(() => {
    const depart = vues.get(partie) ?? minutes;
    vues.set(partie, minutes);
    if (minutes <= depart || mouvementReduit()) {
      setAffichee(minutes);
      return;
    }
    setEcart({ n: minutes - depart, cle: Date.now() });
    const t0 = performance.now();
    const duree = 750;
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / duree);
      const e = 1 - Math.pow(1 - k, 3);
      setAffichee(Math.round(depart + (minutes - depart) * e));
      if (k < 1) image.current = requestAnimationFrame(pas);
    };
    image.current = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image.current);
  }, [partie, minutes]);

  return { affichee, ecart };
}

export function Horloge({ etat }: { etat: EtatPartie }) {
  const { horloge } = etat.affaire.public;
  const { affichee, ecart } = useHeureAnimee(etat.partie.id, etat.nuit.minutes);
  const jour = hhmm(horloge.debut) + affichee;
  const h = Math.floor(jour / 60) % 24;
  const m = jour % 60;
  const aube = etat.nuit.minutes >= etat.nuit.aube;
  // Les aiguilles tournent dans le sens des minutes écoulées, sans repartir en arrière à l'heure pile.
  const angleMinutes = (jour / 60) * 360;
  const angleHeures = (jour / 720) * 360;

  return (
    <span className={`horloge${aube ? " aube" : ""}`} role="timer" aria-label={`Il est ${h} heures ${m}${aube ? ", l'enquête est finie" : ""}`}>
      <svg className="cadran" width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="13" cy="13" r="12" fill="var(--carte)" stroke="currentColor" strokeWidth="1.2" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="13" y1="2.6" x2="13" y2={i % 3 ? 3.8 : 5} stroke="currentColor" strokeWidth={i % 3 ? 0.8 : 1.4} transform={`rotate(${i * 30} 13 13)`} />
        ))}
        <line className="aiguille" x1="13" y1="13" x2="13" y2="7.5" stroke="var(--papier)" strokeWidth="1.8" strokeLinecap="round" style={{ transform: `rotate(${angleHeures}deg)` }} />
        <line className="aiguille" x1="13" y1="13" x2="13" y2="4.5" stroke="var(--rouge)" strokeWidth="1.1" strokeLinecap="round" style={{ transform: `rotate(${angleMinutes}deg)` }} />
        <circle cx="13" cy="13" r="1.4" fill="var(--papier)" />
      </svg>
      <span className="titre heure-nuit">
        {h}:{String(m).padStart(2, "0")}
      </span>
      {ecart && (
        <span key={ecart.cle} className="machine cout-envole" aria-hidden="true">
          +{ecart.n} MIN
        </span>
      )}
    </span>
  );
}

// Le fil de la nuit, sous l'en-tête : ce qui est passé, et les événements à venir.
export function FilDeLaNuit({ etat }: { etat: EtatPartie }) {
  const { horloge, evenements } = etat.affaire.public;
  const part = Math.min(1, etat.nuit.minutes / etat.nuit.aube);
  return (
    <span className="fil-nuit" aria-hidden="true">
      <span className="fil-nuit-passe" style={{ transform: `scaleX(${part})` }} />
      {evenements.map((e) => {
        const p = minuteEvenement(horloge, e) / etat.nuit.aube;
        return <span key={e.heure} className={`fil-nuit-repere${p <= part ? " passe" : ""}`} style={{ left: `${p * 100}%` }} />;
      })}
    </span>
  );
}
