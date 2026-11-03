import { useEffect, useState } from "react";
import { appareil, installationVue, installer, invitationDisponible, surInvitation } from "../lib/installation";

type Version = "iphone" | "android";

// Écran plein du premier passage sur téléphone : mettre le jeu sur l'écran
// d'accueil, avec les gestes dessinés pour iPhone et pour Android.
// Rouvert depuis le compte avec un bouton retour.
export function Installer({ onContinuer, depuisCompte }: { onContinuer: () => void; depuisCompte?: boolean }) {
  const [version, setVersion] = useState<Version>(appareil() === "android" ? "android" : "iphone");
  const [proposable, setProposable] = useState(invitationDisponible);
  const [installe, setInstalle] = useState(false);

  useEffect(() => surInvitation(() => setProposable(invitationDisponible())), []);

  function continuer() {
    installationVue();
    onContinuer();
  }

  const etapes = version === "iphone" ? ETAPES_IPHONE : ETAPES_ANDROID;

  return (
    <main className="ecran pluie installer">
      {depuisCompte && <a href="#/compte" className="lien-retour">← COMPTE</a>}
      <span className="etiquette apparait">Avant d'ouvrir l'agence</span>
      <h1 className="titre apparait" style={{ fontSize: 60 }}>
        L'AGENCE<br />DANS TA <span className="rouge">POCHE</span>
      </h1>
      <p className="apparait" style={{ margin: 0, fontSize: 14, color: "var(--gris-clair)", animationDelay: "60ms" }}>
        Ajoute le jeu à ton écran d'accueil : il s'ouvre en plein écran, comme une app, et te prévient quand un associé te donne rendez-vous.
      </p>

      <div className="segmente" role="tablist" aria-label="Téléphone">
        <span className="segmente-pastille" style={{ transform: version === "android" ? "translateX(100%)" : undefined }} />
        {(["iphone", "android"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={version === v} className={`machine${version === v ? " actif" : ""}`} onClick={() => setVersion(v)}>
            {v === "iphone" ? "IPHONE" : "ANDROID"}
          </button>
        ))}
      </div>

      {version === "android" && proposable && !installe && (
        <button className="gros-bouton papier-fond apparait" onClick={async () => setInstalle(await installer())}>
          INSTALLER ENQUÊTE
        </button>
      )}
      {installe && <p className="machine vert apparait" style={{ margin: 0 }}>INSTALLÉ. OUVRE ENQUÊTE DEPUIS TON ÉCRAN D'ACCUEIL.</p>}

      <ol key={version} className="etapes-installer">
        {etapes.map((e, i) => (
          <li key={i} className="vue-entree" style={{ animationDelay: `${i * 60}ms` }}>
            <span className="titre rouge numero">{i + 1}</span>
            <span className="illustration">{e.dessin}</span>
            <span className="legende">{e.texte}</span>
          </li>
        ))}
      </ol>

      <p className="petit" style={{ margin: 0 }}>
        {version === "iphone"
          ? "L'app et Safari ne partagent pas la connexion : dans l'app, tu demandes un nouveau code une fois, et c'est tout."
          : "Dans l'app, tu demandes un nouveau code une fois, et c'est tout."}
      </p>

      <button className="bouton" style={{ marginTop: "auto", textAlign: "center" }} onClick={continuer}>
        {depuisCompte ? "Retour" : "Plus tard, continuer dans le navigateur"}
      </button>
    </main>
  );
}

// --- Dessins des gestes ---------------------------------------------------
// Bouts d'écran de téléphone au trait, l'endroit à toucher en rouge.

const G = "#8a867e";
const T = "#3a3833";
const P = "#ede8dd";
const R = "#d7261e";

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 260 78" aria-hidden="true">
      <rect x="0.5" y="0.5" width="259" height="77" rx="10" fill="#141412" stroke={T} />
      {children}
    </svg>
  );
}

// Rond rouge sur l'endroit à toucher ; `largeur` l'étire autour d'un mot.
function Appui({ x, y, largeur = 26 }: { x: number; y: number; largeur?: number }) {
  const forme = { x: x - largeur / 2, y: y - 13, width: largeur, height: 26, rx: 13, fill: "none", stroke: R, strokeWidth: 2 };
  return (
    <g>
      <rect {...forme} className="appui-onde" />
      <rect {...forme} />
    </g>
  );
}

const IconeAjout = ({ x, y }: { x: number; y: number }) => (
  <g fill="none" stroke={P} strokeWidth="1.6" strokeLinecap="round">
    <rect x={x - 8} y={y - 8} width="16" height="16" rx="4" />
    <path d={`M${x} ${y - 4} v8 M${x - 4} ${y} h8`} />
  </g>
);

const Texte = ({ x, y, children, c = P, taille = 12, ancre }: { x: number; y: number; children: React.ReactNode; c?: string; taille?: number; ancre?: "middle" | "end" }) => (
  <text x={x} y={y} fill={c} fontSize={taille} fontFamily="-apple-system, system-ui, sans-serif" textAnchor={ancre}>
    {children}
  </text>
);

function EcranAccueil() {
  return (
    <svg viewBox="0 0 260 78" aria-hidden="true">
      <rect x="0.5" y="0.5" width="259" height="77" rx="10" fill="#141412" stroke={T} />
      {[0, 1, 2, 4].map((i) => (
        <rect key={i} x={22 + i * 46} y="14" width="34" height="34" rx="9" fill="#24231f" />
      ))}
      <g className="icone-arrive">
        <image href={`${import.meta.env.BASE_URL}icone-180.png`} x="206" y="14" width="34" height="34" style={{ clipPath: "inset(0 round 9px)" }} />
        <Texte x={223} y={62} taille={9} ancre="middle">Enquête</Texte>
      </g>
      <Appui x={223} y={31} />
    </svg>
  );
}

const ETAPES_IPHONE: { dessin: React.ReactNode; texte: React.ReactNode }[] = [
  {
    dessin: (
      <Cadre>
        <rect x="14" y="20" width="196" height="38" rx="19" fill="#24231f" />
        <Texte x={112} y={43} c={G} ancre="middle">djoul75.github.io</Texte>
        <circle cx="234" cy="39" r="19" fill="#24231f" />
        <Texte x={234} y={43} ancre="middle" taille={14}>•••</Texte>
        <Appui x={234} y={39} />
      </Cadre>
    ),
    texte: <>Dans Safari, touche <b>•••</b> au bout de la barre d'adresse, puis <b>Partager</b>. Sur un iPhone plus ancien, touche directement <b>Partager</b>.</>,
  },
  {
    dessin: (
      <Cadre>
        <Texte x={16} y={24} c={G} taille={10}>Copier</Texte>
        <line x1="14" y1="34" x2="246" y2="34" stroke={T} />
        <rect x="8" y="38" width="244" height="32" rx="8" fill="#24231f" />
        <Texte x={20} y={58}>Sur l'écran d'accueil</Texte>
        <IconeAjout x={230} y={54} />
        <Appui x={230} y={54} />
      </Cadre>
    ),
    texte: <>Fais défiler la liste et touche <b>Sur l'écran d'accueil</b>.</>,
  },
  {
    dessin: (
      <Cadre>
        <Texte x={16} y={28} c="#4c8dff">Annuler</Texte>
        <Texte x={130} y={28} ancre="middle">Sur l'écran d'accueil</Texte>
        <Texte x={244} y={28} c="#4c8dff" ancre="end">Ajouter</Texte>
        <Appui x={224} y={24} largeur={54} />
        <Texte x={16} y={60} c={G} taille={11}>Ouvrir comme app web</Texte>
        <rect x="206" y="48" width="36" height="20" rx="10" fill="#34c759" />
        <circle cx="232" cy="58" r="8" fill={P} />
      </Cadre>
    ),
    texte: <>Laisse <b>Ouvrir comme app web</b> activé et touche <b>Ajouter</b>.</>,
  },
  {
    dessin: <EcranAccueil />,
    texte: <>Ouvre <b>Enquête</b> depuis ton écran d'accueil, puis autorise les notifications.</>,
  },
];

const ETAPES_ANDROID: { dessin: React.ReactNode; texte: React.ReactNode }[] = [
  {
    dessin: (
      <Cadre>
        <rect x="14" y="20" width="196" height="38" rx="19" fill="#24231f" />
        <Texte x={112} y={43} c={G} ancre="middle">djoul75.github.io</Texte>
        <g fill={P}>
          <circle cx="234" cy="31" r="2" />
          <circle cx="234" cy="39" r="2" />
          <circle cx="234" cy="47" r="2" />
        </g>
        <Appui x={234} y={39} />
      </Cadre>
    ),
    texte: <>Dans Chrome, touche <b>⋮</b> en haut à droite.</>,
  },
  {
    dessin: (
      <Cadre>
        <Texte x={16} y={24} c={G} taille={10}>Partager…</Texte>
        <line x1="14" y1="34" x2="246" y2="34" stroke={T} />
        <rect x="8" y="38" width="244" height="32" rx="8" fill="#24231f" />
        <IconeAjout x={26} y={54} />
        <Texte x={44} y={58}>Ajouter à l'écran d'accueil</Texte>
        <Appui x={130} y={54} largeur={236} />
      </Cadre>
    ),
    texte: <>Touche <b>Ajouter à l'écran d'accueil</b> (ou <b>Installer l'application</b>).</>,
  },
  {
    dessin: (
      <Cadre>
        <Texte x={16} y={30}>Installer l'application ?</Texte>
        <Texte x={16} y={48} c={G} taille={11}>Enquête · djoul75.github.io</Texte>
        <Texte x={150} y={66} c="#8ab4f8" ancre="end">Annuler</Texte>
        <Texte x={236} y={66} c="#8ab4f8" ancre="end">Installer</Texte>
        <Appui x={213} y={62} largeur={60} />
      </Cadre>
    ),
    texte: <>Confirme avec <b>Installer</b>.</>,
  },
  {
    dessin: <EcranAccueil />,
    texte: <>Ouvre <b>Enquête</b> depuis ton écran d'accueil, puis autorise les notifications.</>,
  },
];
