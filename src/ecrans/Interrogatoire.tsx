import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EntreeJournal, EtatPartie, Suspect } from "../lib/types";
import type { Actions } from "./Partie";
import { Visage } from "../composants/Visage";
import { visageDe } from "../lib/visuels";
import { EnTete } from "../composants/NavPartie";
import { aUnePiste, compteurs, echangesAvec, indicesTrouves, nomCourt, questionsDebloquees, questionsDisponibles } from "../lib/partie";
import { remplacer } from "../lib/routeur";
import { mouvementReduit, useGlisser, useMachine, vibrer } from "../lib/effets";

export function Interrogatoire({ etat, suspectId, actions }: { etat: EtatPartie; suspectId: string; actions: Actions }) {
  const pub = etat.affaire.public;
  const rang = pub.suspects.findIndex((s) => s.id === suspectId);
  const suspect = pub.suspects[rang];
  const c = compteurs(etat);
  const echanges = echangesAvec(etat, suspectId);
  const disponibles = questionsDisponibles(etat, suspectId);
  const indices = indicesTrouves(etat);
  // La question posée à l'instant (en attente de réponse, puis tapée à la machine).
  const [enAttente, setEnAttente] = useState<string | null>(null);
  const [derniere, setDerniere] = useState<string | null>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const partie = etat.partie.id;
  const voisin = (pas: number) => pub.suspects[(rang + pas + pub.suspects.length) % pub.suspects.length];
  const glisser = useGlisser(
    () => remplacer(`/p/${partie}/suspect/${voisin(1).id}`),
    () => remplacer(`/p/${partie}/suspect/${voisin(-1).id}`)
  );

  // Comme une messagerie : on arrive en bas de la conversation, et on y reste
  // pendant que la réponse s'écrit.
  useLayoutEffect(() => {
    if (echanges.length > 0) window.scrollTo(0, document.documentElement.scrollHeight);
    // seulement à l'arrivée sur ce suspect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const el = conversation.current;
    if (!el || (!enAttente && !derniere)) return;
    const suivre = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: mouvementReduit() ? "auto" : "smooth" });
    suivre();
    const obs = new ResizeObserver(suivre);
    obs.observe(el);
    const arret = window.setTimeout(() => obs.disconnect(), 12_000);
    return () => {
      obs.disconnect();
      window.clearTimeout(arret);
    };
  }, [enAttente, derniere]);

  if (!suspect) {
    return (
      <main className="ecran">
        <a href={`#/p/${partie}`} className="lien-retour">← SCÈNE</a>
        <p>Personne de ce nom dans le dossier.</p>
      </main>
    );
  }

  async function poser(id: string) {
    setEnAttente(id);
    setDerniere(null);
    vibrer(10);
    await Promise.all([actions.poser(id), new Promise((r) => setTimeout(r, mouvementReduit() ? 0 : 900))]);
    setEnAttente(null);
    setDerniere(id);
  }

  const questionEnAttente = pub.questions.find((q) => q.id === enAttente);

  return (
    <main className="ecran jeu" {...glisser}>
      <EnTete
        etat={etat}
        retour={`#/p/${partie}`}
        libelleRetour="Scène"
        sansTitre
        dessous={<Trombinoscope etat={etat} actif={suspectId} />}
      />

      <div key={suspectId} className="vue-entree" style={{ display: "flex", flexDirection: "column" }}>
        {echanges.length === 0 && !enAttente ? (
          <div className="salle-interrogatoire">
            <div className="lampe" />
            <div style={{ position: "absolute", left: "50%", bottom: 0, width: 150, transform: "translateX(-50%)" }}>
              <Visage v={visageDe(suspect)} label={`Portrait de ${suspect.nom}`} sansFond />
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", borderBottom: "3px solid var(--rouge)", paddingBottom: 6, marginTop: echanges.length || enAttente ? 14 : 0 }}>
          {(echanges.length > 0 || enAttente) && (
            <span style={{ width: 48, flexShrink: 0 }}>
              <Visage v={visageDe(suspect)} />
            </span>
          )}
          <h1 className="titre" style={{ fontSize: 36, lineHeight: 1 }}>{suspect.nom.toUpperCase()}</h1>
        </div>
        <p style={{ margin: "12px 0 0", color: "var(--gris-clair)", fontStyle: "italic", fontSize: 14 }}>{suspect.portrait}</p>

        <div ref={conversation} style={{ display: "flex", flexDirection: "column", gap: 18, padding: "18px 0 20px" }}>
          {/* La réponse arrive souvent avant la fin du suspense : elle reste
              cachée derrière les « … » jusque-là, puis s'écrit à la machine. */}
          {echanges
            .filter((e) => e.ref !== enAttente)
            .map((e) => (
              <Echange key={e.ref} etat={etat} entree={e} suspect={suspect} tapee={e.ref === derniere} />
            ))}
          {questionEnAttente && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="bulle-moi apparait">{questionEnAttente.texte}</span>
              <span className="reponse-attente apparait" aria-label={`${nomCourt(suspect.nom)} réfléchit`}>
                <span className="points"><span /><span /><span /></span>
              </span>
            </div>
          )}
        </div>
      </div>

      <section className="dock">
        {actions.erreur && <p className="erreur">{actions.erreur}</p>}
        {c.questionsRestantes <= 0 ? (
          <a href={`#/p/${partie}/accuser`} className="machine" style={{ fontSize: 13, color: "var(--rouge-texte)", minHeight: 44, display: "flex", alignItems: "center" }}>
            PLUS DE QUESTIONS. IL EST TEMPS D'ACCUSER →
          </a>
        ) : disponibles.length === 0 ? (
          <p className="machine" style={{ margin: 0, fontSize: 13, color: "var(--gris)" }}>
            RIEN DE PLUS À LUI DEMANDER… POUR L'INSTANT.
          </p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <span className="etiquette">Demander à {nomCourt(suspect.nom)}…</span>
              <span className="machine" style={{ fontSize: 11, color: "var(--gris)" }}>{c.questionsRestantes} EN TOUT</span>
            </div>
            <div className="dock-questions">
              {disponibles.map((q) => {
                const grace = q.requiert ? indices.find((i) => i.id === q.requiert) : undefined;
                return (
                  <button key={q.id} className={`bouton question${grace ? " debloquee" : ""}`} disabled={actions.occupe || !!enAttente} onClick={() => poser(q.id)}>
                    <span>{q.texte}</span>
                    {grace && <span className="machine grace">GRÂCE À : {grace.texte}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

// Les visages des suspects en haut de l'écran, pour passer de l'un à l'autre.
function Trombinoscope({ etat, actif }: { etat: EtatPartie; actif: string }) {
  return (
    <nav className="trombinoscope" aria-label="Suspects">
      {etat.affaire.public.suspects.map((s) => (
        <a
          key={s.id}
          href={`#/p/${etat.partie.id}/suspect/${s.id}`}
          onClick={(e) => {
            e.preventDefault();
            remplacer(`/p/${etat.partie.id}/suspect/${s.id}`);
          }}
          className={s.id === actif ? "actif" : undefined}
          aria-current={s.id === actif ? "page" : undefined}
        >
          <span className="medaillon">
            <Visage v={visageDe(s)} cadrage="tete" />
          </span>
          {nomCourt(s.nom)}
          {s.id !== actif && aUnePiste(etat, s.id) && <span className="pastille" style={{ top: 0, right: 6 }} />}
        </a>
      ))}
    </nav>
  );
}

function Echange({ etat, entree, suspect, tapee }: { etat: EtatPartie; entree: EntreeJournal; suspect: Suspect; tapee: boolean }) {
  const pub = etat.affaire.public;
  const q = pub.questions.find((x) => x.id === entree.ref);
  const machine = useMachine(`« ${entree.texte} »`, tapee);
  const pret = machine.fini;
  // Questions débloquées chez les autres (celles de ce suspect sont dans le dock).
  const ailleurs = entree.indice ? questionsDebloquees(etat, entree.indice.id).filter((x) => x.suspect !== suspect.id) : [];

  useEffect(() => {
    if (tapee && pret && entree.indice) vibrer([20, 50, 40]);
  }, [tapee, pret, entree.indice]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }} onClick={machine.finir}>
      <span className="bulle-moi">{q?.texte}</span>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ width: 32, flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
          <Visage v={visageDe(suspect)} cadrage="tete" />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span>
            {machine.visible}
            {!pret && <span className="curseur" />}
          </span>
          {entree.didascalie && pret && <span className={`didascalie${tapee ? " apparait" : ""}`}>{entree.didascalie}</span>}
        </div>
      </div>
      {entree.indice && pret && (
        <div className={`note-mur couchee${tapee ? " epingle" : ""}`} style={{ animationDelay: "200ms" }}>
          <span className="punaise" />
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {entree.indice.texte}
            <span className="source">ÉPINGLÉ AU MUR</span>
          </span>
        </div>
      )}
      {pret &&
        ailleurs.map((x) => {
          const s = pub.suspects.find((y) => y.id === x.suspect);
          return s ? (
            <a key={x.id} href={`#/p/${etat.partie.id}/suspect/${s.id}`} className={`piste${tapee ? " apparait" : ""}`} style={{ animationDelay: "450ms" }}>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <span className="machine rouge-texte" style={{ fontSize: 11 }}>NOUVELLE QUESTION POUR {nomCourt(s.nom).toUpperCase()}</span>
                <span style={{ fontSize: 14 }}>« {x.texte} »</span>
              </span>
              <span className="rouge-texte" style={{ fontSize: 20 }}>→</span>
            </a>
          ) : null;
        })}
    </div>
  );
}
