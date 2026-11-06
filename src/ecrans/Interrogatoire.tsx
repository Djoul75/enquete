import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EntreeJournal, EtatPartie, Suspect } from "../lib/types";
import type { Actions } from "./Partie";
import { Visage } from "../composants/Visage";
import { Cigarette } from "../composants/Cigarette";
import { visageDe } from "../lib/visuels";
import { EnTete, Icone } from "../composants/NavPartie";
import {
  aUnePiste,
  aube,
  cout,
  echangesAvec,
  etatSuspect,
  heureNuit,
  minuteEvenement,
  nomCourt,
  piecesAMontrer,
  pronom,
  questionsDebloquees,
  questionsDisponibles,
} from "../lib/partie";
import { remplacer } from "../lib/routeur";
import { mouvementReduit, useGlisser, useMachine, vibrer } from "../lib/effets";

type EnAttente = { type: "question"; id: string; texte: string } | { type: "montrer"; piece: string; texte: string };

export function Interrogatoire({ etat, suspectId, actions }: { etat: EtatPartie; suspectId: string; actions: Actions }) {
  const pub = etat.affaire.public;
  const rang = pub.suspects.findIndex((s) => s.id === suspectId);
  const suspect = pub.suspects[rang];
  const echanges = echangesAvec(etat, suspectId);
  const disponibles = questionsDisponibles(etat, suspectId);
  const statut = etatSuspect(etat, suspectId);
  const pieces = piecesAMontrer(etat, suspectId);
  // Le geste en cours (en attente de réponse), puis la réponse qui s'écrit à la machine.
  const [enAttente, setEnAttente] = useState<EnAttente | null>(null);
  const [derniere, setDerniere] = useState<string | null>(null);
  const [montrer, setMontrer] = useState(false);
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

  const nom = nomCourt(suspect.nom);
  const il = pronom(etat, suspectId);
  const Il = il === "il" ? "Il" : "Elle";
  const e_ = il === "elle" ? "E" : "";
  const depart = pub.evenements.find((e) => e.suspect_absent === suspectId);

  async function agir(attente: EnAttente, action: () => Promise<void>, cleFin: string) {
    setEnAttente(attente);
    setDerniere(null);
    vibrer(10);
    await Promise.all([action(), new Promise((r) => setTimeout(r, mouvementReduit() ? 0 : 900))]);
    setEnAttente(null);
    setDerniere(cleFin);
  }
  const poser = (id: string, texte: string) => agir({ type: "question", id, texte }, () => actions.poser(id), `question:${id}`);
  const montrerPiece = (piece: string, texte: string) => {
    setMontrer(false);
    agir({ type: "montrer", piece, texte }, () => actions.montrer(suspectId, piece), `montrer:${suspectId}:${piece}`);
  };

  return (
    <main className="ecran jeu" {...glisser}>
      <EnTete etat={etat} retour={`#/p/${partie}`} libelleRetour="Scène" sansTitre dessous={<Trombinoscope etat={etat} actif={suspectId} />} />

      <div key={suspectId} className="vue-entree" style={{ display: "flex", flexDirection: "column" }}>
        {echanges.length === 0 && !enAttente ? (
          <div className={`salle-interrogatoire ${statut}`}>
            <div className="lampe" />
            <div className="visage-salle">
              <Visage v={visageDe(suspect)} label={`Portrait de ${suspect.nom}`} sansFond />
            </div>
            {statut === "parti" && <span className="machine tampon-salle">PARTI{e_}</span>}
          </div>
        ) : null}

        <div className="tete-suspect" style={{ marginTop: echanges.length || enAttente ? 14 : 0 }}>
          {(echanges.length > 0 || enAttente) && (
            <span style={{ width: 48, flexShrink: 0 }}>
              <Visage v={visageDe(suspect)} />
            </span>
          )}
          <h1 className="titre" style={{ fontSize: 36, lineHeight: 1, flex: 1, minWidth: 0, overflowWrap: "break-word" }}>{suspect.nom.toUpperCase()}</h1>
          <span className="patience">
            <span className="machine">{statut === "braque" ? "BRAQUÉ" + e_ : statut === "parti" ? `PARTI${e_}` : "PATIENCE"}</span>
            <Cigarette patience={etat.nuit.patience[suspectId] ?? 0} max={suspect.patience} etat={statut} nom={nom} />
          </span>
        </div>
        <p style={{ margin: "12px 0 0", color: "var(--gris-clair)", fontStyle: "italic", fontSize: 14 }}>{suspect.portrait}</p>

        <div ref={conversation} style={{ display: "flex", flexDirection: "column", gap: 22, padding: "20px 0" }}>
          {/* La réponse arrive souvent avant la fin du suspense : elle reste
              cachée derrière les « … » jusque-là, puis s'écrit à la machine. */}
          {echanges
            .filter((e) => !(enAttente && cle(e) === cleAttente(enAttente, suspectId)))
            .map((e) => (
              <Echange key={cle(e)} etat={etat} entree={e} suspect={suspect} tapee={cle(e) === derniere} Il={Il} />
            ))}
          {enAttente && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {enAttente.type === "montrer" ? <BullePiece texte={enAttente.texte} /> : <span className="bulle-moi apparait">{enAttente.texte}</span>}
              <span className="reponse-attente apparait" aria-label={`${nom} réfléchit`}>
                <span className="points"><span /><span /><span /></span>
              </span>
            </div>
          )}
        </div>
      </div>

      <section className="dock">
        {actions.erreur && <p className="erreur">{actions.erreur}</p>}
        {statut === "parti" ? (
          <p className="machine" style={{ margin: 0, fontSize: 13, color: "var(--gris-clair)" }}>
            {nom.toUpperCase()} EST PARTI{e_}
            {depart ? ` À ${heureNuit(pub.horloge, minuteEvenement(pub.horloge, depart)).toUpperCase()}` : ""}. TROP TARD.
          </p>
        ) : aube(etat) ? (
          <a href={`#/p/${partie}/accuser`} className="machine" style={{ fontSize: 13, color: "var(--rouge-texte)", minHeight: 44, display: "flex", alignItems: "center" }}>
            C'EST L'HEURE. SIGNE TON DOSSIER →
          </a>
        ) : (
          <>
            <span className="etiquette" style={{ color: statut === "braque" ? "var(--rouge-texte)" : undefined }}>
              {statut === "braque" ? `${nom} ne dit plus rien` : `Demander à ${nom}…`}
            </span>
            {statut === "braque" && (
              <span style={{ fontSize: 13, color: "var(--gris-clair)", marginTop: -4 }}>
                Seule une pièce qui {il === "elle" ? "la" : "le"} touche vraiment pourrait {il === "elle" ? "la" : "le"} faire parler.
              </span>
            )}
            {(disponibles.length > 0 || statut === "libre") && (
              <div className="dock-questions">
                {disponibles.map((q) => (
                  <button key={q.id} className={`bouton question ${q.genre}`} disabled={actions.occupe || !!enAttente} onClick={() => poser(q.id, q.texte)}>
                    <span className="question-ligne">
                      <span>
                        {q.genre === "relance" && <span className="machine etiquette-relance">RELANCE</span>}
                        {q.texte}
                      </span>
                      <span className="machine cout">{cout(etat, q)}&nbsp;MIN</span>
                    </span>
                    {q.genre === "piste" && q.requiert && (
                      <span className="machine grace">GRÂCE À : {etat.indices.find((i) => i.id === q.requiert)?.texte}</span>
                    )}
                  </button>
                ))}
                {disponibles.length === 0 && (
                  <p className="machine" style={{ margin: 0, fontSize: 13, color: "var(--gris)" }}>
                    RIEN DE PLUS À LUI DEMANDER… POUR L'INSTANT.
                  </p>
                )}
              </div>
            )}
            {pieces.length > 0 && (
              <button className="bouton montrer-piece" disabled={actions.occupe || !!enAttente} onClick={() => setMontrer(true)}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icone nom="punaise" taille={16} epaisseur={2} />
                  MONTRER UNE PIÈCE DU MUR
                </span>
                <span className="machine cout">{pub.horloge.couts.montrer}&nbsp;MIN</span>
              </button>
            )}
          </>
        )}
      </section>

      {montrer && (
        <MontrerPiece
          etat={etat}
          suspect={suspect}
          braque={statut === "braque"}
          onChoisir={(id, texte) => montrerPiece(id, texte)}
          onFermer={() => setMontrer(false)}
        />
      )}
    </main>
  );
}

const cle = (e: EntreeJournal) => `${e.type}:${e.ref}`;
const cleAttente = (a: EnAttente, suspect: string) => (a.type === "question" ? `question:${a.id}` : `montrer:${suspect}:${a.piece}`);

// Les visages des suspects en haut de l'écran, pour passer de l'un à l'autre.
function Trombinoscope({ etat, actif }: { etat: EtatPartie; actif: string }) {
  return (
    <nav className="trombinoscope" aria-label="Suspects">
      {etat.affaire.public.suspects.map((s) => {
        const statut = etatSuspect(etat, s.id);
        return (
          <a
            key={s.id}
            href={`#/p/${etat.partie.id}/suspect/${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              remplacer(`/p/${etat.partie.id}/suspect/${s.id}`);
            }}
            className={`${s.id === actif ? "actif " : ""}${statut}`}
            aria-current={s.id === actif ? "page" : undefined}
          >
            <span className="medaillon">
              <Visage v={visageDe(s)} cadrage="tete" />
            </span>
            {nomCourt(s.nom)}
            {s.id !== actif && statut === "libre" && aUnePiste(etat, s.id) && <span className="pastille" style={{ top: 0, right: 6 }} />}
          </a>
        );
      })}
    </nav>
  );
}

function BullePiece({ texte }: { texte: string }) {
  return (
    <span className="bulle-piece apparait">
      <span className="punaise" />
      <span className="machine" style={{ fontSize: 10, color: "#55524c" }}>TU MONTRES</span>
      <span>{texte}</span>
    </span>
  );
}

function Echange({ etat, entree, suspect, tapee, Il }: { etat: EtatPartie; entree: EntreeJournal; suspect: Suspect; tapee: boolean; Il: string }) {
  const pub = etat.affaire.public;
  const machine = useMachine(`« ${entree.texte} »`, tapee);
  const pret = machine.fini;
  // Pistes ouvertes chez les autres (celles de ce suspect sont dans le dock).
  const ailleurs = entree.indice ? questionsDebloquees(etat, entree.indice.id).filter((x) => x.suspect !== suspect.id) : [];
  const anime = tapee ? " apparait" : "";

  useEffect(() => {
    if (!tapee || !pret) return;
    if (entree.braque) vibrer([60, 40, 120]);
    else if (entree.craque) vibrer([30, 30, 30, 30, 90]);
    else if (entree.indice) vibrer([20, 50, 40]);
    else if (entree.fache) vibrer(40);
  }, [tapee, pret, entree]);

  return (
    <div className="echange" onClick={machine.finir}>
      <span className="machine horodatage">{heureNuit(pub.horloge, entree.minute).toUpperCase()}</span>
      {entree.type === "montrer" ? <BullePiece texte={entree.piece?.texte ?? ""} /> : <span className="bulle-moi">{entree.question}</span>}
      <div className={`reponse${entree.ricane ? " ricane" : ""}`}>
        <span style={{ width: 32, flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
          <Visage v={visageDe(suspect)} cadrage="tete" />
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <span>
            {machine.visible}
            {!pret && <span className="curseur" />}
          </span>
          {entree.didascalie && pret && <span className={`didascalie${anime}`}>{entree.didascalie}</span>}
          {entree.fache && !entree.braque && pret && (
            <span className={`machine agace${anime}`} style={{ animationDelay: "150ms" }}>{Il.toUpperCase()} S'AGACE.</span>
          )}
        </div>
      </div>
      {entree.craque && pret && <span className={`machine tampon-interro craque${tapee ? " claque" : ""}`}>{Il === "Il" ? "IL A CRAQUÉ" : "ELLE A CRAQUÉ"}</span>}
      {entree.indice && pret && (
        <div className={`note-mur couchee${tapee ? " epingle" : ""}`} style={{ animationDelay: "200ms" }}>
          <span className="punaise" />
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {entree.indice.texte}
            <span className="source">ÉPINGLÉ AU MUR</span>
          </span>
        </div>
      )}
      {entree.braque && pret && (
        <div className="braquage">
          <span className={`machine tampon-interro${tapee ? " claque" : ""}`}>BRAQUÉ{Il === "Elle" ? "E" : ""}</span>
          <span className={`replique${anime}`} style={{ animationDelay: "350ms" }}>« {entree.braque} »</span>
        </div>
      )}
      {pret &&
        ailleurs.map((x) => {
          const s = pub.suspects.find((y) => y.id === x.suspect);
          return s ? (
            <a key={x.id} href={`#/p/${etat.partie.id}/suspect/${s.id}`} className={`piste${anime}`} style={{ animationDelay: "450ms" }}>
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

// Le mur en plein écran : on choisit la pièce à mettre sous le nez du suspect.
function MontrerPiece({
  etat,
  suspect,
  braque,
  onChoisir,
  onFermer,
}: {
  etat: EtatPartie;
  suspect: Suspect;
  braque: boolean;
  onChoisir: (id: string, texte: string) => void;
  onFermer: () => void;
}) {
  const pieces = piecesAMontrer(etat, suspect.id);
  const [choisie, setChoisie] = useState<string | null>(null);
  const elle = pronom(etat, suspect.id) === "elle";

  useEffect(() => {
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", echap);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", echap);
      document.body.style.overflow = "";
    };
  }, [onFermer]);

  function choisir(id: string, texte: string) {
    if (choisie) return;
    setChoisie(id);
    vibrer(12);
    window.setTimeout(() => onChoisir(id, texte), mouvementReduit() ? 0 : 380);
  }

  return (
    <div className="montrer-plein" role="dialog" aria-modal="true" aria-labelledby="titre-montrer">
      <div className="montrer-haut">
        <button className="bouton-rond" onClick={onFermer} aria-label="Fermer sans rien montrer">
          <Icone nom="fermer" taille={20} epaisseur={2} />
        </button>
        <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)" }}>{etat.affaire.public.horloge.couts.montrer} MIN</span>
      </div>
      <div className="montrer-titre">
        <span style={{ width: 56, flexShrink: 0 }}>
          <Visage v={visageDe(suspect)} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span className="etiquette">Mettre sous le nez de</span>
          <h1 id="titre-montrer" className="titre" style={{ fontSize: 40, overflowWrap: "break-word" }}>{suspect.nom.toUpperCase()}</h1>
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 14, color: "var(--gris-clair)" }}>
        {braque
          ? `${elle ? "Elle" : "Il"} ne répond plus. Seule une vraie preuve contre ${elle ? "elle" : "lui"} peut ${elle ? "la" : "le"} faire craquer.`
          : "Une pièce bien choisie délie les langues. Une autre peut agacer."}
      </p>
      <div className="mur montrer-mur">
        {pieces.map((p, i) => (
          <button
            key={p.id}
            className={`note-mur epingle${choisie === p.id ? " choisie" : choisie ? " ecartee" : ""}`}
            style={{ ["--r" as string]: `${[-3, 2, 4, -2, 1, -4][i % 6]}deg`, animationDelay: `${i * 50}ms`, marginTop: i % 2 ? 16 : 0 }}
            onClick={() => choisir(p.id, p.texte)}
          >
            <span className="punaise" />
            {p.texte}
            <span className="source">— {p.source.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
