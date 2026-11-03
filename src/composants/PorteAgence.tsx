// La porte vitrée de l'agence : verre dépoli, nom en lettres dorées.
export function PorteAgence({ pseudo, sousTitre, petite = false }: { pseudo: string; sousTitre?: string; petite?: boolean }) {
  return (
    <div className={`porte${petite ? " petite" : ""}`}>
      <span className="dore-petit">AGENCE</span>
      <span className="dore" style={{ fontSize: petite ? 36 : Math.max(34, 60 - Math.max(0, pseudo.length - 7) * 3.5) }}>
        {pseudo.toUpperCase()}
      </span>
      <span className="dore-petit">DÉTECTIVE PRIVÉ</span>
      {sousTitre && <span className="dore-petit sous-titre">{sousTitre.toUpperCase()}</span>}
    </div>
  );
}
