import { DEFINITIONS, dateTampon, type EtatTampon } from "../lib/tampons";

// Un tampon encreur, comme un visa de passeport. Toutes les mesures sont en
// em : la taille de police du parent règle la taille du tampon (10 px pour
// le passeport, plus grand pour le coup de tampon).
export function Tampon({ etat, pseudo }: { etat: EtatTampon; pseudo?: string }) {
  const d = DEFINITIONS[etat.cle];
  if (!d) return null;
  return (
    <span className={`visa ${d.forme} encre-${d.encre}`} role="img" aria-label={`Tampon ${d.nom}${etat.obtenu_at ? `, obtenu le ${dateTampon(etat.obtenu_at)}` : ""}`}>
      <span className="visa-haut">{d.forme === "rond" && pseudo ? `★ ${pseudo.toUpperCase()} ★` : d.haut}</span>
      <span className="visa-nom">{d.nom}</span>
      {etat.obtenu_at && <span className="visa-date">{dateTampon(etat.obtenu_at)}</span>}
    </span>
  );
}
