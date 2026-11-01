import { useEffect, useState } from "react";
import type { EtatPartie } from "../lib/types";
import { compteurs } from "../lib/partie";
import { heuresRestantes, useMaintenant } from "../lib/routeur";

const TRACES = {
  retour: <path d="M15 5l-7 7 7 7" />,
  fermer: <path d="M6 6l12 12M18 6L6 18" />,
  bulle: <path d="M4 5h16v11H9l-5 4z" />,
  loupe: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  lampe: <path d="M8 3h8l3 7H5zM12 10v8M8 21h8" />,
  punaise: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M12 12v9" />
    </>
  ),
  carnet: (
    <>
      <rect x="5" y="3" width="14" height="18" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </>
  ),
  cible: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  coche: <path d="M5 12l5 5 9-10" />,
};

export function Icone({ nom, taille = 22, epaisseur = 1.8 }: { nom: keyof typeof TRACES; taille?: number; epaisseur?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={epaisseur} aria-hidden="true" style={{ flexShrink: 0 }}>
      {TRACES[nom]}
    </svg>
  );
}

// En-tête collé en haut de chaque écran de jeu : retour, titre, questions et
// fouilles restantes, et le bandeau du duel quand l'autre a accusé.
export function EnTete({
  etat,
  retour,
  libelleRetour,
  titreAuDefilement,
  sansTitre,
  dessous,
}: {
  etat: EtatPartie;
  retour: string;
  libelleRetour: string;
  titreAuDefilement?: boolean;
  sansTitre?: boolean; // retour avec son libellé, sans le titre de l'affaire
  dessous?: React.ReactNode;
}) {
  const c = compteurs(etat);
  const maintenant = useMaintenant(30_000);
  const [defile, setDefile] = useState(() => window.scrollY > 180);
  const accusateur = etat.autres.find((a) => a.a_accuse);
  const enJeu = !etat.moi.accusation && !etat.revelation;

  useEffect(() => {
    if (!titreAuDefilement) return;
    const surDefilement = () => setDefile(window.scrollY > 180);
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, [titreAuDefilement]);

  const titreVisible = !sansTitre && (!titreAuDefilement || defile);

  return (
    <header className={`entete${defile ? " defile" : ""}`}>
      <div className="entete-ligne">
        <a href={retour} className="entete-retour" aria-label={libelleRetour}>
          <Icone nom="retour" />
          {!titreVisible && <span className="machine" style={{ fontSize: 12 }}>{libelleRetour.toUpperCase()}</span>}
        </a>
        <span className={`titre entete-titre${titreVisible ? " visible" : ""}`} aria-hidden={!titreVisible}>
          {etat.affaire.titre.toUpperCase()}
        </span>
        {enJeu && (
          <span className="machine entete-compteurs">
            <span title="Questions restantes" aria-label={`${c.questionsRestantes} questions restantes`}>
              <Icone nom="bulle" taille={13} epaisseur={2} />
              {c.questionsRestantes}
            </span>
            <span
              className={c.fouillesRestantes > 0 ? "rouge-trait" : undefined}
              title="Fouilles restantes"
              aria-label={`${c.fouillesRestantes} fouilles restantes`}
            >
              <Icone nom="loupe" taille={13} epaisseur={2} />
              {c.fouillesRestantes}
            </span>
          </span>
        )}
      </div>
      {dessous}
      {enJeu && accusateur && etat.partie.echeance && (
        <a href={`#/p/${etat.partie.id}/telegramme`} className="machine bandeau-duel">
          <span>
            <span className="clignote">●</span> {accusateur.nom.toUpperCase()} A ACCUSÉ
          </span>
          <span>IL TE RESTE {heuresRestantes(etat.partie.echeance, maintenant).toUpperCase()}</span>
        </a>
      )}
    </header>
  );
}

const ONGLETS = [
  { vue: "scene", nom: "SCÈNE", icone: "lampe" },
  { vue: "mur", nom: "MUR", icone: "punaise" },
  { vue: "carnet", nom: "CARNET", icone: "carnet" },
  { vue: "accuser", nom: "J'ACCUSE", icone: "cible" },
] as const;

export type Onglet = (typeof ONGLETS)[number]["vue"];

export function BarreOnglets({ etat, actif, nouveaux = 0 }: { etat: EtatPartie; actif: Onglet; nouveaux?: number }) {
  const indices = new Set(etat.journal.map((e) => e.indice?.id).filter(Boolean)).size;
  return (
    <nav className="onglets" aria-label="Enquête">
      {ONGLETS.map((o) => (
        <a
          key={o.vue}
          href={o.vue === "scene" ? `#/p/${etat.partie.id}` : `#/p/${etat.partie.id}/${o.vue}`}
          className={`machine${o.vue === actif ? " actif" : ""}${o.vue === "accuser" ? " accuser" : ""}`}
          aria-current={o.vue === actif ? "page" : undefined}
        >
          <span style={{ position: "relative" }}>
            <Icone nom={o.icone} />
            {o.vue === "mur" && nouveaux > 0 && <span className="pastille" aria-label={`${nouveaux} nouveaux indices`} />}
          </span>
          {o.vue === "mur" && indices > 0 ? `MUR · ${indices}` : o.nom}
        </a>
      ))}
    </nav>
  );
}
