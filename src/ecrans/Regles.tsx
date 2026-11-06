// « Comment on joue ? », depuis l'accueil.
export function Regles() {
  return (
    <main className="ecran">
      <a href="#/" className="lien-retour">← DOSSIERS</a>
      <h1 className="titre apparait" style={{ fontSize: 64 }}>
        COMMENT
        <br />
        ON <span className="rouge">JOUE</span>
      </h1>

      <Regle numero="1" titre="Lire la scène">
        Un meurtre, des suspects, des lieux. Le récit finit toujours sur un détail en rouge, et il annonce ce qui va se passer cette nuit.
      </Regle>
      <Regle numero="2" titre="La nuit tourne">
        Tu arrives sur les lieux et <b>il te reste environ quatre heures</b> : jusqu'à l'aube, ou jusqu'à ce que le train entre en gare. Chaque geste prend du temps. À l'heure dite, tu signes avec ce que tu as.
      </Regle>
      <Regle numero="3" titre="Interroger">
        Chaque suspect a quelques questions de départ. Ses réponses ouvrent des <b>relances</b>, et tes indices ouvrent des <b>pistes</b> (point rouge).
      </Regle>
      <Regle numero="4" titre="La cigarette">
        C'est la patience du suspect. Une question qui fâche en brûle un bout ; quand elle est finie, il <b>se braque</b> et ne répond plus.
      </Regle>
      <Regle numero="5" titre="Montrer une pièce">
        Mets un indice de ton mur sous le nez d'un suspect. Face à une vraie preuve contre lui, un suspect braqué peut <b>craquer</b>, une seule fois.
      </Regle>
      <Regle numero="6" titre="Fouiller">
        Une demi-heure par lieu, et tous ne parlent pas. Les témoins te disent où chercher. Certains lieux sont nettoyés à heure fixe.
      </Regle>
      <Regle numero="7" titre="Le dossier">
        Qui, pourquoi, l'occasion, la preuve. Une seule signature, pas de retour en arrière.
      </Regle>

      <div className="regles-points">
        <span className="etiquette">L'heure de chaque geste</span>
        <span><b>10</b> min par question</span>
        <span><b>5</b> min pour une relance ou pour montrer une pièce</span>
        <span><b>30</b> min par fouille</span>
      </div>

      <div className="regles-points">
        <span className="etiquette">Le verdict</span>
        <span><b>Condamné</b> le bon coupable, avec une preuve qui tient</span>
        <span><b>Relâché</b> le bon coupable, mais pas de preuve</span>
        <span><b>Erreur</b> tu as accusé un innocent</span>
        <span className="petit" style={{ color: "var(--gris-clair)" }}>À plusieurs : le meilleur verdict gagne, puis le dossier signé le plus tôt dans la nuit.</span>
      </div>

      <Regle numero="+" titre="À plusieurs">
        Donne rendez-vous à tes associés dans ton bureau, jusqu'à six privés. Quand tout le monde est assis, tu ouvres l'enveloppe : même affaire pour tous, chacun pour soi. Dès que quelqu'un signe, les autres ont 24 heures pour signer à leur tour. La vérité sort quand tout le monde a signé.
      </Regle>

      <Regle numero="★" titre="Tes associés">
        Ajoute un ami avec le nom exact de son agence, dans l'onglet Associés. Il doit accepter. Sur iPhone, ajoute le jeu à l'écran d'accueil (Partager, puis Sur l'écran d'accueil) pour recevoir les rendez-vous en notification.
      </Regle>

      <a href="#/" className="gros-bouton papier-fond" style={{ marginTop: "auto" }}>AU BUREAU</a>
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
