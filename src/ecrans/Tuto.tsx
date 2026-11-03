import { useState } from "react";
import { aller } from "../lib/routeur";
import { useGlisser, vibrer } from "../lib/effets";
import { PorteAgence } from "../composants/PorteAgence";
import { Visage } from "../composants/Visage";
import { Decor } from "../composants/Decor";
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
    texte: <>Le récit finit toujours sur un détail en rouge. Il compte.</>,
    dessin: () => (
      <div className="tuto-scene">
        <Decor id="quai" cadrage="slice" />
        <p className="machine">… et sa montre, brisée, marquait <span className="rouge-texte">23 h 10</span>.</p>
      </div>
    ),
  },
  {
    etiquette: "2 · Les suspects",
    titre: <>INTERROGE</>,
    texte: <><b>15 questions</b> en tout, à partager entre les suspects. Une réponse peut cacher un indice.</>,
    dessin: () => (
      <div className="tuto-suspects">
        {SUSPECTS.map((v, i) => (
          <span key={i} className={i === 1 ? "choisi" : undefined}><Visage v={v} cadrage="tete" /></span>
        ))}
        <p className="bulle machine">« Ce soir-là ? J'étais au Cintra, demandez au barman. »</p>
      </div>
    ),
  },
  {
    etiquette: "3 · Les lieux",
    titre: <>FOUILLE,<br />MAIS <span className="rouge">PEU</span></>,
    texte: <><b>3 fouilles</b> seulement, pour tous les lieux. Une fouille ne se rattrape pas.</>,
    dessin: () => (
      <div className="tuto-fouille">
        <Decor id="bureau" cadrage="slice" assombri />
        <span className="machine">FOUILLES <b>●</b><b>●</b><b>●</b></span>
      </div>
    ),
  },
  {
    etiquette: "4 · Le mur",
    titre: <>ÉPINGLE,<br />SUIS LES <span className="rouge">PISTES</span></>,
    texte: <>Chaque indice s'épingle sur ton mur. Certains ouvrent de nouvelles questions : un point rouge te le signale.</>,
    dessin: () => (
      <div className="tuto-mur">
        {["Le ticket du Cintra est daté de mardi.", "Une tache de cambouis sur le gant.", "Le barman ne l'a jamais vu."].map((t, i) => (
          <span key={i} className="note-mur epingle" style={{ transform: `rotate(${[-4, 3, -1][i]}deg)`, animationDelay: `${200 + i * 140}ms` }}>
            <span className="punaise" />
            {t}
          </span>
        ))}
      </div>
    ),
  },
  {
    etiquette: "5 · L'accusation",
    titre: <>SIGNE TON<br /><span className="rouge">RAPPORT</span></>,
    texte: <>Une seule signature, pas de retour en arrière. 50 points ou plus : l'affaire est résolue.</>,
    dessin: () => (
      <div className="carte-papier tuto-rapport">
        <span className="machine" style={{ fontSize: 11, letterSpacing: 2 }}>RAPPORT D'ENQUÊTE PRIVÉE</span>
        {[["QUI", "50"], ["POURQUOI", "20"], ["LA PREUVE", "20"]].map(([q, p], i) => (
          <span key={q} className="ligne-rapport" style={{ animationDelay: `${200 + i * 140}ms` }}>
            <span className="titre">{q}</span>
            <span className="titre rouge-sombre">+{p}</span>
          </span>
        ))}
        <span className="machine petit" style={{ color: "#55524c" }}>+10 si tu as économisé tes questions</span>
      </div>
    ),
  },
  {
    etiquette: "6 · À plusieurs",
    titre: <>DONNE<br /><span className="rouge">RENDEZ-VOUS</span></>,
    texte: <>Invite jusqu'à cinq associés à ton bureau. Quand tout le monde est assis, tu ouvres l'enveloppe : même affaire, chacun pour soi. Dès qu'un privé accuse, les autres ont 24 heures.</>,
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
