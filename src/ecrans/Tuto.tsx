import { useEffect, useState } from "react";
import { marquerRegleNuitVue } from "../lib/accueil";
import { aller } from "../lib/routeur";
import { useGlisser, vibrer } from "../lib/effets";
import { PorteAgence } from "../composants/PorteAgence";
import { Visage } from "../composants/Visage";
import { Decor } from "../composants/Decor";
import { Cigarette } from "../composants/Cigarette";
import type { Visage as V } from "../lib/visuels";

// « Comment jouer », en plein écran : une page par geste du jeu, qu'on fait
// défiler du doigt. Montré une fois après le choix du nom d'agence, puis
// toujours accessible depuis l'accueil et le compte.

const SUSPECTS: V[] = [
  { femme: true, carrure: "fine", age: "jeune", coiffure: "longs", chapeau: "aucun", pilosite: "aucune", tenue: "robe", accessoire: "perles", rouge_levres: true, ombre: "droite" },
  { femme: false, carrure: "forte", age: "mur", coiffure: "degarni", chapeau: "feutre", pilosite: "moustache", tenue: "imper", accessoire: "cigarette", rouge_levres: false, ombre: "gauche" },
  { femme: false, carrure: "fine", age: "vieux", coiffure: "courts", chapeau: "aucun", pilosite: "aucune", tenue: "costume", accessoire: "monocle", rouge_levres: false, ombre: "droite" },
];

type Page = { etiquette: string; titre: React.ReactNode; texte: React.ReactNode; dessin: (pseudo: string) => React.ReactNode };

const PAGES: Page[] = [
  {
    etiquette: "Bienvenue",
    titre: <>TU ES<br />DÉTECTIVE <span className="rouge">PRIVÉ</span></>,
    texte: <>Chaque dossier : un meurtre, quatre suspects, et un menteur. Trouve <b>qui</b>, <b>pourquoi</b>, et <b>prouve-le</b>.</>,
    dessin: (pseudo) => <PorteAgence pseudo={pseudo} sousTitre="Filatures · disparitions · affaires délicates" />,
  },
  {
    etiquette: "1 · La scène",
    titre: <>LIS LA<br /><span className="rouge">SCÈNE</span></>,
    texte: <>Le récit finit toujours sur un détail en rouge. Il annonce aussi ce qui va arriver cette nuit : un départ, un lieu nettoyé.</>,
    dessin: () => (
      <div className="tuto-scene">
        <Decor id="quai" cadrage="slice" />
        <p className="machine">… elle a un billet pour le bateau de <span className="rouge-texte">5 heures</span>.</p>
      </div>
    ),
  },
  {
    etiquette: "2 · L'horloge",
    titre: <>LA NUIT<br /><span className="rouge">TOURNE</span></>,
    texte: <>Tu arrives sur les lieux. <b>Il te reste environ quatre heures</b>, jusqu'à l'aube ou au départ du dernier bateau, et chaque geste prend du temps. À l'heure dite, tu signes avec ce que tu as.</>,
    dessin: () => (
      <div className="tuto-horloge">
        <svg viewBox="0 0 120 120" width="150" height="150" aria-hidden="true">
          <circle cx="60" cy="60" r="56" fill="var(--carte)" stroke="var(--gris)" strokeWidth="2" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="60" y1="8" x2="60" y2={i % 3 ? 14 : 20} stroke="var(--gris-clair)" strokeWidth={i % 3 ? 2 : 4} transform={`rotate(${i * 30} 60 60)`} />
          ))}
          <line className="tuto-aiguille-h" x1="60" y1="60" x2="60" y2="32" stroke="var(--papier)" strokeWidth="5" strokeLinecap="round" />
          <line className="tuto-aiguille-m" x1="60" y1="60" x2="60" y2="16" stroke="var(--rouge)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="60" r="5" fill="var(--papier)" />
        </svg>
        <div className="tuto-couts machine">
          {[["QUESTION", "10"], ["RELANCE", "5"], ["MONTRER", "5"], ["FOUILLE", "30"]].map(([n, m], i) => (
            <span key={n} className="apparait" style={{ animationDelay: `${300 + i * 120}ms` }}>
              <b className="titre">{m}</b> MIN · {n}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    etiquette: "3 · Les suspects",
    titre: <>CREUSE,<br />SANS <span className="rouge">BRUSQUER</span></>,
    texte: <>Une réponse ouvre souvent une <b>relance</b>. Mais une question qui fâche brûle un bout de la cigarette : quand elle est finie, <b>le suspect se braque</b> et ne dit plus rien.</>,
    dessin: () => (
      <div className="tuto-suspects">
        {SUSPECTS.map((v, i) => (
          <span key={i} className={i === 1 ? "choisi" : undefined}><Visage v={v} cadrage="tete" /></span>
        ))}
        <p className="bulle machine">« Encore une question comme ça, et j'appelle mon avocat. »</p>
        <span className="tuto-cigarette">
          <Cigarette patience={1} max={3} etat="libre" nom="le suspect" />
        </span>
      </div>
    ),
  },
  {
    etiquette: "4 · Les pièces",
    titre: <>FOUILLE,<br />MONTRE TES <span className="rouge">PIÈCES</span></>,
    texte: <>Tous les lieux ne parlent pas : écoute les témoins, ils te disent où chercher. Mets une vraie preuve sous le nez d'un suspect braqué, et il peut <b>craquer</b>.</>,
    dessin: () => (
      <div className="tuto-mur">
        {["Une douille sous la fenêtre du bureau.", "Le barman l'a vu revenir par le quai.", "Il a parlé d'un carnet, sans qu'on lui dise."].map((t, i) => (
          <span key={i} className="note-mur epingle" style={{ transform: `rotate(${[-4, 3, -1][i]}deg)`, animationDelay: `${200 + i * 140}ms` }}>
            <span className="punaise" />
            {t}
          </span>
        ))}
      </div>
    ),
  },
  {
    etiquette: "5 · Le dossier",
    titre: <>SIGNE TON<br /><span className="rouge">DOSSIER</span></>,
    texte: <>Qui, pourquoi, l'occasion, et <b>la preuve</b> : sans elle, ton coupable est relâché. À plusieurs, le meilleur verdict gagne, puis <b>le plus tôt signé dans la nuit</b>.</>,
    dessin: () => (
      <div className="carte-papier tuto-rapport">
        <span className="machine" style={{ fontSize: 11, letterSpacing: 2 }}>RAPPORT D'ENQUÊTE PRIVÉE</span>
        {["QUI", "POURQUOI", "L'OCCASION", "LA PREUVE"].map((q, i) => (
          <span key={q} className="ligne-rapport" style={{ animationDelay: `${200 + i * 120}ms` }}>
            <span className="titre">{q}</span>
            <span className="titre rouge-sombre">✓</span>
          </span>
        ))}
        <span className="tampon-verdict condamne tuto-tampon">
          <span>CONDAMNÉ</span>
        </span>
        <span className="machine petit" style={{ color: "#55524c" }}>Signé à 3 h 55, deux heures avant l'aube.</span>
      </div>
    ),
  },
  {
    etiquette: "6 · À plusieurs",
    titre: <>DONNE<br /><span className="rouge">RENDEZ-VOUS</span></>,
    texte: <>Invite jusqu'à cinq associés à ton bureau. Quand tout le monde est assis, tu ouvres l'enveloppe : même affaire, chacun sa nuit. Dès qu'un privé signe, les autres ont 24 heures.</>,
    dessin: (pseudo) => (
      <div className="tuto-bureau">
        {[pseudo, "Joséphine", "Marco"].map((p, i) => (
          <span key={i} className="siege apparait" style={{ animationDelay: `${200 + i * 160}ms` }}>
            <span className="initiale">{p[0]?.toUpperCase()}</span>
            <span className="titre nom">{p.toUpperCase()}</span>
            <span className="etat machine"><span className="point-vert" />ASSIS</span>
          </span>
        ))}
      </div>
    ),
  },
];

export function Tuto({ pseudo }: { pseudo: string }) {
  const [page, setPage] = useState(0);
  const [sens, setSens] = useState<"droite" | "gauche">("droite");
  const derniere = page === PAGES.length - 1;
  useEffect(marquerRegleNuitVue, []);

  function tourner(n: number) {
    if (n < 0 || n >= PAGES.length) return;
    setSens(n > page ? "droite" : "gauche");
    setPage(n);
    vibrer(8);
  }

  const glisser = useGlisser(() => tourner(page + 1), () => tourner(page - 1));
  const p = PAGES[page];

  return (
    <main className="ecran tuto" {...glisser}>
      <div className="tuto-haut">
        <div className="tuto-progression" aria-hidden="true">
          {PAGES.map((_, i) => (
            <button key={i} className={i <= page ? "fait" : undefined} onClick={() => tourner(i)} tabIndex={-1} />
          ))}
        </div>
        <a href="#/" className="lien-retour machine" style={{ fontSize: 12 }}>{derniere ? "FERMER" : "PASSER"}</a>
      </div>

      <div key={page} className={`tuto-page tuto-${sens}`}>
        <div className="tuto-dessin">{p.dessin(pseudo)}</div>
        <span className="etiquette">{p.etiquette}</span>
        <h1 className="titre" style={{ fontSize: 56 }}>{p.titre}</h1>
        <p className="tuto-texte">{p.texte}</p>
      </div>

      <div className="tuto-bas">
        {page > 0 && (
          <button className="bouton discret" onClick={() => tourner(page - 1)} aria-label="Page précédente">←</button>
        )}
        {derniere ? (
          <button className="gros-bouton papier-fond" style={{ flex: 1 }} onClick={() => aller("/")}>AU BUREAU</button>
        ) : (
          <button className="gros-bouton papier-fond" style={{ flex: 1 }} onClick={() => tourner(page + 1)}>SUIVANT →</button>
        )}
      </div>
      {derniere && (
        <a href="#/regles" className="lien-retour" style={{ fontSize: 12, alignSelf: "center", textDecoration: "underline" }}>Toutes les règles, en détail</a>
      )}
    </main>
  );
}
