import { useRef, useState } from "react";
import type { EtatPartie } from "../lib/types";
import type { Actions } from "./Partie";
import { Decor } from "../composants/Decor";
import { Icone } from "../composants/NavPartie";
import { Visage } from "../composants/Visage";
import { decorDe, visageDe } from "../lib/visuels";
import { compteurs, nomCourt, questionsDebloquees } from "../lib/partie";
import { remplacer } from "../lib/routeur";
import { mouvementReduit, useGlisser, vibrer } from "../lib/effets";

// Un lieu en plein écran. Avant la fouille, une lampe torche balaie le décor
// (et suit le doigt) ; après, le résultat s'affiche sur place avec l'indice
// épinglé et les questions qu'il débloque.
export function Lieu({ etat, lieuId, actions }: { etat: EtatPartie; lieuId: string; actions: Actions }) {
  const pub = etat.affaire.public;
  const c = compteurs(etat);
  const rang = Math.max(0, pub.lieux.findIndex((l) => l.id === lieuId));
  const lieu = pub.lieux[rang];
  const entree = etat.journal.find((e) => e.type === "fouille" && e.ref === lieu.id);
  const [enCours, setEnCours] = useState(false);
  const [vientDeFouiller, setVientDeFouiller] = useState(false);
  const decor = useRef<HTMLDivElement>(null);
  const partie = etat.partie.id;
  const suivant = pub.lieux[(rang + 1) % pub.lieux.length];
  const precedent = pub.lieux[(rang - 1 + pub.lieux.length) % pub.lieux.length];
  const changer = (id: string) => {
    setVientDeFouiller(false);
    remplacer(`/p/${partie}/lieu/${id}`);
  };
  const glisser = useGlisser(() => changer(suivant.id), () => changer(precedent.id));

  async function fouiller() {
    setEnCours(true);
    vibrer(15);
    // Un temps de suspense, même quand la base répond vite.
    await Promise.all([actions.fouiller(lieu.id), new Promise((r) => setTimeout(r, mouvementReduit() ? 0 : 1100))]);
    setEnCours(false);
    setVientDeFouiller(true);
    vibrer([30, 60, 90]);
  }

  function suivreDoigt(e: React.PointerEvent) {
    const r = decor.current?.getBoundingClientRect();
    if (!r) return;
    decor.current!.style.setProperty("--tx", `${((e.clientX - r.left) / r.width) * 100}%`);
    decor.current!.style.setProperty("--ty", `${((e.clientY - r.top) / r.height) * 100}%`);
    decor.current!.classList.add("suit");
  }

  const debloquees = entree?.indice ? questionsDebloquees(etat, entree.indice.id) : [];

  return (
    <main className="ecran plein" {...glisser}>
      <div
        ref={decor}
        key={lieu.id}
        className={`decor-lieu${entree ? " fouille" : " torche"}${enCours ? " en-cours" : ""}`}
        style={{ height: entree ? 250 : "46dvh" }}
        onPointerMove={entree ? undefined : suivreDoigt}
      >
        <Decor id={decorDe(lieu)} cadrage="slice" label={lieu.nom} />
        <div className="decor-fondu" />
        <a href={`#/p/${partie}`} className="bouton-rond" style={{ position: "absolute", left: 12, top: "calc(8px + env(safe-area-inset-top))" }} aria-label="Fermer et revenir à la scène">
          <Icone nom="fermer" taille={20} epaisseur={2} />
        </a>
        <span className="machine" style={{ position: "absolute", right: 16, top: "calc(20px + env(safe-area-inset-top))", fontSize: 12, background: "var(--encre)", padding: "3px 8px", zIndex: 2 }}>
          LIEU {rang + 1} / {pub.lieux.length}
        </span>
        {entree && <span className={`machine tampon-fouille${vientDeFouiller ? " claque" : ""}`}>FOUILLÉ</span>}
      </div>
      {vientDeFouiller && <div className="flash" aria-hidden="true" />}

      <div key={`texte-${lieu.id}`} className="lieu-corps vue-entree">
        <h1 className="titre" style={{ fontSize: entree ? 56 : 72 }}>{lieu.nom.toUpperCase()}</h1>

        {entree ? (
          <>
            <p style={{ margin: 0, fontSize: 15 }} className={vientDeFouiller ? "apparait" : undefined}>{entree.texte}</p>
            {entree.indice && (
              <div className={`note-mur grande${vientDeFouiller ? " epingle" : ""}`} style={{ animationDelay: "350ms" }}>
                <span className="punaise" />
                {entree.indice.texte}
                <span className="source">ÉPINGLÉ AU MUR</span>
              </div>
            )}
            {debloquees.map((q, i) => {
              const s = pub.suspects.find((x) => x.id === q.suspect);
              if (!s) return null;
              return (
                <a
                  key={q.id}
                  href={`#/p/${partie}/suspect/${s.id}`}
                  className={`piste${vientDeFouiller ? " apparait" : ""}`}
                  style={{ animationDelay: `${700 + i * 80}ms` }}
                >
                  <span style={{ width: 40, flexShrink: 0 }}>
                    <Visage v={visageDe(s)} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                    <span className="machine rouge-texte" style={{ fontSize: 11 }}>NOUVELLE QUESTION POUR {nomCourt(s.nom).toUpperCase()}</span>
                    <span style={{ fontSize: 14 }}>« {q.texte} »</span>
                  </span>
                  <span className="rouge-texte" style={{ fontSize: 20 }}>→</span>
                </a>
              );
            })}
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 15, color: "var(--gris-clair)" }}>
              {enCours ? "Tu fouilles…" : c.fouillesRestantes > 0 ? "Personne ne l'a encore fouillé." : "Tu as utilisé toutes tes fouilles."}
            </p>
            <Pastilles total={pub.lieux.length} rang={rang} onChoisir={(i) => changer(pub.lieux[i].id)} />
          </>
        )}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10, paddingTop: 12 }}>
          {actions.erreur && <p className="erreur">{actions.erreur}</p>}
          {entree ? (
            <>
              <div className="grille-2" style={{ gap: 8 }}>
                <a href={`#/p/${partie}`} className="gros-bouton papier-fond" style={{ fontSize: 22 }}>← LA SCÈNE</a>
                <button className="gros-bouton contour" style={{ fontSize: 22 }} onClick={() => changer(suivant.id)}>LIEU SUIVANT →</button>
              </div>
              <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)", textAlign: "center" }}>
                {c.fouillesRestantes > 0 ? `${c.fouillesRestantes} FOUILLE${c.fouillesRestantes > 1 ? "S" : ""} RESTANTE${c.fouillesRestantes > 1 ? "S" : ""}` : "PLUS DE FOUILLE"}
              </span>
            </>
          ) : (
            <>
              <button className="bouton-fouiller" disabled={enCours || actions.occupe || c.fouillesRestantes <= 0} onClick={fouiller}>
                <span className="titre" style={{ fontSize: 30 }}>{enCours ? "FOUILLE EN COURS…" : `FOUILLER ${lieu.nom.toUpperCase()}`}</span>
                <span style={{ display: "flex", gap: 4 }} aria-label={`${c.fouillesRestantes} fouilles restantes sur ${etat.limites.fouilles}`}>
                  {Array.from({ length: etat.limites.fouilles }, (_, i) => (
                    <span key={i} className={i < c.fouillesRestantes ? "jeton plein" : "jeton"} />
                  ))}
                </span>
              </button>
              <span style={{ fontSize: 12, color: "var(--gris-clair)", textAlign: "center" }}>
                {c.fouillesRestantes > 0
                  ? `Il t'en reste ${c.fouillesRestantes} sur ${etat.limites.fouilles}. Une fouille ne se rattrape pas.`
                  : "Glisse pour relire les lieux déjà fouillés."}
              </span>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Pastilles({ total, rang, onChoisir }: { total: number; rang: number; onChoisir: (i: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ display: "flex", gap: 2 }}>
        {Array.from({ length: total }, (_, i) => (
          <button key={i} className="pastille-lieu" aria-label={`Lieu ${i + 1}`} aria-current={i === rang} onClick={() => onChoisir(i)}>
            <span />
          </button>
        ))}
      </span>
      <span className="machine" style={{ fontSize: 11, color: "var(--gris)" }}>‹ GLISSE POUR CHANGER ›</span>
    </div>
  );
}
