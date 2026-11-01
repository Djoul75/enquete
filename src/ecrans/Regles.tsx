// « Comment on joue ? », depuis l'accueil.
export function Regles() {
  return (
    <main className="ecran pluie">
      <a href="#/" className="lien-retour">← DOSSIERS</a>
      <h1 className="titre apparait" style={{ fontSize: 64 }}>
        COMMENT
        <br />
        ON <span className="rouge">JOUE</span>
      </h1>

      <Regle numero="1" titre="Lire la scène">
        Un meurtre, quatre suspects, des lieux. Le récit finit toujours sur un détail en rouge : il compte.
      </Regle>
      <Regle numero="2" titre="Interroger">
        Tu as <b>15 questions</b> en tout, à répartir entre les suspects. Chaque réponse peut cacher un indice, qui s'épingle sur ton mur.
      </Regle>
      <Regle numero="3" titre="Fouiller">
        Tu n'as que <b>3 fouilles</b> pour tous les lieux. Choisis bien : une fouille ne se rattrape pas.
      </Regle>
      <Regle numero="4" titre="Suivre les pistes">
        Certains indices ouvrent de nouvelles questions. Un point rouge sur un suspect veut dire qu'une piste t'attend.
      </Regle>
      <Regle numero="5" titre="Accuser">
        Qui, pourquoi, et l'indice qui le prouve. Une seule signature, pas de retour en arrière.
      </Regle>

      <div className="regles-points">
        <span className="etiquette">Les points</span>
        <span><b>50</b> le bon coupable, <b>+10</b> au plus si tu as économisé tes questions</span>
        <span><b>20</b> le bon mobile</span>
        <span><b>20</b> une preuve qui tient</span>
        <span className="petit" style={{ color: "var(--gris-clair)" }}>50 points ou plus : l'affaire est résolue. Sinon, classée.</span>
      </div>

      <Regle numero="VS" titre="En duel">
        Même affaire, chacun pour soi. Dès que l'un accuse, l'autre a 24 heures pour accuser à son tour. La vérité sort quand les deux ont signé.
      </Regle>

      <a href="#/" className="gros-bouton papier-fond" style={{ marginTop: "auto" }}>À L'ENQUÊTE</a>
    </main>
  );
}

function Regle({ numero, titre, children }: { numero: string; titre: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <span className="titre rouge" style={{ fontSize: 40, width: 34, flexShrink: 0, textAlign: "center" }}>{numero}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="titre" style={{ fontSize: 24 }}>{titre.toUpperCase()}</span>
        <span style={{ fontSize: 14, color: "var(--gris-clair)" }}>{children}</span>
      </span>
    </section>
  );
}
