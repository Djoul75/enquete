import { useEffect, useRef, useState } from "react";
import type { EtatPartie } from "../lib/types";
import type { Actions } from "./Partie";
import { Visage } from "../composants/Visage";
import { Icone } from "../composants/NavPartie";
import { visageDe } from "../lib/visuels";
import { aube, finDeNuit, heureNuit, indicesTrouves } from "../lib/partie";
import { heuresRestantes, useMaintenant } from "../lib/routeur";
import { mouvementReduit, useMemoire, vibrer } from "../lib/effets";

// L'occasion et la preuve sont des pièces du mur, ou RIEN (dossier vide).
const RIEN = "_rien";
type Choix = { etape: number; suspect: string | null; mobile: string | null; occasion: string | null; preuve: string | null };
type Champ = "suspect" | "mobile" | "occasion" | "preuve";
const ETAPES = ["QUI", "POURQUOI", "L'OCCASION", "LA PREUVE"];
const QUESTIONS = ["", "POUR QUELLE RAISON ?", "QU'EST-CE QUI MONTRE QU'IL A PU LE FAIRE ?", "QU'EST-CE QUI LE FERA CONDAMNER ?"];

// Le dossier en quatre étapes (qui, pourquoi, l'occasion, la preuve) puis un
// procès-verbal à signer d'un appui long, daté de l'heure de la nuit. Les
// choix sont gardés pendant la session : on peut repartir vérifier le mur et
// revenir.
export function Accusation({ etat, actions }: { etat: EtatPartie; actions: Actions }) {
  const pub = etat.affaire.public;
  const indices = indicesTrouves(etat);
  const maintenant = useMaintenant(30_000);
  const cle = `enquete-accuser-${etat.partie.id}`;
  const [choix, setChoix] = useMemoire<Choix>(cle, { etape: 0, suspect: null, mobile: null, occasion: null, preuve: null });
  const [sens, setSens] = useState<"avant" | "arriere">("avant");
  const [signe, setSigne] = useState(false);
  const suspect = pub.suspects.find((s) => s.id === choix.suspect);
  const mobile = pub.mobiles.find((m) => m.id === choix.mobile);
  const piece = (id: string | null) => (id === RIEN ? { id: RIEN, texte: "Rien de solide" } : indices.find((i) => i.id === id));
  const occasion = piece(choix.occasion);
  const preuve = piece(choix.preuve);
  const partie = etat.partie.id;
  const heure = heureNuit(pub.horloge, etat.nuit.minutes);

  const aller = (etape: number) => {
    setSens(etape > choix.etape ? "avant" : "arriere");
    setChoix({ ...choix, etape });
    window.scrollTo(0, 0);
  };
  const choisir = (champ: Champ, id: string) => {
    vibrer(8);
    setChoix({ ...choix, [champ]: id });
  };

  async function signer() {
    setSigne(true);
    vibrer([40, 30, 90]);
    await new Promise((r) => setTimeout(r, mouvementReduit() ? 0 : 900));
    const nul = (id: string | null) => (id === RIEN ? null : id);
    await actions.accuser(choix.suspect!, choix.mobile!, nul(choix.occasion), nul(choix.preuve));
    sessionStorage.removeItem(cle);
  }

  // Une étape dont le choix manque (indice disparu, stockage effacé) ramène à ce choix.
  const manque = !choix.suspect ? 0 : !choix.mobile ? 1 : !occasion ? 2 : !preuve ? 3 : 4;
  const etape = Math.min(choix.etape, manque);
  const groupes = Array.from(new Set(indices.map((i) => (i.type === "fouille" ? "Lieux" : i.source)))).map((nom) => ({
    nom,
    indices: indices.filter((i) => (i.type === "fouille" ? "Lieux" : i.source) === nom),
  }));

  return (
    <main className="ecran accusation">
      <div className="accusation-haut">
        {etape === 0 ? (
          <a href={`#/p/${partie}`} className="lien-retour" style={{ gap: 6 }}>
            <Icone nom="fermer" taille={18} epaisseur={2} /> PAS ENCORE
          </a>
        ) : (
          <button className="lien-retour" style={{ gap: 6 }} onClick={() => aller(etape - 1)} disabled={signe}>
            <Icone nom="retour" taille={20} epaisseur={2} /> {ETAPES[etape - 1]}
          </button>
        )}
        <span className="machine" style={{ fontSize: 12, display: "flex", gap: 10 }}>
          <span style={{ color: aube(etat) ? "var(--rouge-texte)" : "var(--gris-clair)" }}>{aube(etat) ? finDeNuit(pub.horloge).court : `IL EST ${heure.toUpperCase()}`}</span>
          {etat.partie.echeance && <span className="rouge-texte">{heuresRestantes(etat.partie.echeance, maintenant).toUpperCase()}</span>}
        </span>
      </div>

      {etape < 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="progression" aria-hidden="true">
            {ETAPES.map((_, i) => (
              <span key={i} className={i <= etape ? "faite" : undefined} />
            ))}
          </div>
          <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)" }}>
            {etape + 1} / 4 · {etape === 0 ? `QUI A TUÉ ${pub.victime.toUpperCase()} ?` : QUESTIONS[etape]}
          </span>
          {etape > 0 && (
            <div className="machine" style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11 }}>
              {suspect && <button className="puce" onClick={() => aller(0)}>{suspect.nom.toUpperCase()} ✎</button>}
              {etape > 1 && mobile && <button className="puce" onClick={() => aller(1)}>{mobile.texte.toUpperCase()} ✎</button>}
              {etape > 2 && occasion && <button className="puce" onClick={() => aller(2)}>{occasion.id === RIEN ? "SANS OCCASION" : "OCCASION ✓"} ✎</button>}
            </div>
          )}
        </div>
      )}

      <div key={etape} className={`etape ${sens}`} style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {etape === 0 && (
          <>
            <h1 className="titre" style={{ fontSize: 64 }}>J'ACCUSE…</h1>
            <div className="grille-2" style={{ gap: 10 }}>
              {pub.suspects.map((s) => {
                const choisi = s.id === choix.suspect;
                return (
                  <button key={s.id} className={`choix-suspect${choisi ? " choisi" : ""}`} aria-pressed={choisi} onClick={() => choisir("suspect", s.id)}>
                    <span className="choix-visage">
                      <Visage v={visageDe(s)} />
                      {choisi && (
                        <span className="coche">
                          <Icone nom="coche" taille={16} epaisseur={3} />
                        </span>
                      )}
                    </span>
                    <span className="titre" style={{ fontSize: 21, lineHeight: 1 }}>{s.nom.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {etape === 1 && (
          <>
            <h1 className="titre" style={{ fontSize: 56 }}>POURQUOI</h1>
            {pub.mobiles.map((m) => (
              <button key={m.id} className={m.id === choix.mobile ? "bouton plein" : "bouton"} aria-pressed={m.id === choix.mobile} onClick={() => choisir("mobile", m.id)}>
                {m.texte}
              </button>
            ))}
          </>
        )}

        {etape === 2 && (
          <ChoixPiece
            titre="L'OCCASION"
            aide="Ce qui montre qu'il a pu le faire : un retour, une porte, une heure."
            groupes={groupes}
            choisie={choix.occasion}
            onChoisir={(id) => choisir("occasion", id)}
          />
        )}

        {etape === 3 && (
          <ChoixPiece
            titre="LA PREUVE"
            aide="La pièce qui le fera condamner. Sans elle, il sera relâché."
            groupes={groupes}
            choisie={choix.preuve}
            onChoisir={(id) => choisir("preuve", id)}
          />
        )}

        {etape === 4 && suspect && mobile && occasion && preuve && (
          <div className={`proces-verbal${signe ? " signe" : ""}`}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, borderBottom: "3px double var(--encre)", paddingBottom: 8 }}>
              <span className="titre" style={{ fontSize: 26, letterSpacing: 2 }}>PROCÈS-VERBAL</span>
              <span className="machine" style={{ fontSize: 10 }}>RAPPORT D'ENQUÊTE PRIVÉE · {pub.cadre.ville.toUpperCase()} · {pub.journal.date.toUpperCase()}</span>
            </div>
            <span className="machine" style={{ fontSize: 13 }}>Je soussigné accuse</span>
            <Ligne onModifier={() => aller(0)} signe={signe}>
              <span className="titre" style={{ fontSize: 36, color: "var(--rouge-sombre)" }}>{suspect.nom.toUpperCase()}</span>
            </Ligne>
            <span className="machine" style={{ fontSize: 13, marginTop: -6 }}>d'avoir tué {pub.victime}</span>
            <Ligne onModifier={() => aller(1)} signe={signe} trait>
              <span className="machine" style={{ fontSize: 13 }}><span style={{ color: "#55524c" }}>MOBILE :</span> {mobile.texte}</span>
            </Ligne>
            <Ligne onModifier={() => aller(2)} signe={signe} trait>
              <span className="machine" style={{ fontSize: 13 }}><span style={{ color: "#55524c" }}>OCCASION :</span> {occasion.texte}</span>
            </Ligne>
            <Ligne onModifier={() => aller(3)} signe={signe} trait>
              <span className="machine" style={{ fontSize: 13 }}><span style={{ color: "#55524c" }}>PREUVE :</span> {preuve.texte}</span>
            </Ligne>
            <span className="machine" style={{ fontSize: 12, color: "#55524c", textAlign: "right" }}>
              Fait à {pub.cadre.ville}, à {heure}.
            </span>
            <BoutonSigner signe={signe} occupe={actions.occupe} onSigne={signer} />
            {signe && <span className="machine tampon-pv">SIGNÉ</span>}
          </div>
        )}
      </div>

      {actions.erreur && <p className="erreur">{actions.erreur}</p>}

      {etape < 4 && (
        <button
          className="gros-bouton papier-fond suivant"
          disabled={(etape === 0 && !choix.suspect) || (etape === 1 && !choix.mobile) || (etape === 2 && !choix.occasion) || (etape === 3 && !choix.preuve)}
          onClick={() => aller(etape + 1)}
        >
          <span>{etape < 3 ? `SUIVANT : ${ETAPES[etape + 1]}` : "RELIRE ET SIGNER"}</span>
          <span className="rouge">→</span>
        </button>
      )}
    </main>
  );
}

// Une pièce du mur à verser au dossier, rangée par provenance, ou rien.
function ChoixPiece({
  titre,
  aide,
  groupes,
  choisie,
  onChoisir,
}: {
  titre: string;
  aide: string;
  groupes: { nom: string; indices: { id: string; texte: string }[] }[];
  choisie: string | null;
  onChoisir: (id: string) => void;
}) {
  return (
    <>
      <h1 className="titre" style={{ fontSize: 52 }}>{titre}</h1>
      <span style={{ fontSize: 13, color: "var(--gris-clair)", marginTop: -6 }}>{aide}</span>
      {groupes.length === 0 && <span className="petit">Ton mur est vide.</span>}
      {groupes.map((g) => (
        <div key={g.nom} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="etiquette" style={{ marginTop: 4 }}>{g.nom}</span>
          {g.indices.map((i) => (
            <BoutonPiece key={i.id} texte={i.texte} choisi={i.id === choisie} onClick={() => onChoisir(i.id)} />
          ))}
        </div>
      ))}
      <BoutonPiece texte="Rien de solide" choisi={choisie === RIEN} onClick={() => onChoisir(RIEN)} vide />
    </>
  );
}

function BoutonPiece({ texte, choisi, onClick, vide }: { texte: string; choisi: boolean; onClick: () => void; vide?: boolean }) {
  return (
    <button className={`choix-preuve${choisi ? " choisi" : ""}${vide ? " vide" : ""}`} aria-pressed={choisi} onClick={onClick}>
      <span className="rond">{choisi && <Icone nom="coche" taille={14} epaisseur={3} />}</span>
      <span>{texte}</span>
    </button>
  );
}

function Ligne({ children, onModifier, signe, trait }: { children: React.ReactNode; onModifier: () => void; signe: boolean; trait?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, borderTop: trait ? "1px dashed #8a867e" : undefined, paddingTop: trait ? 10 : 0 }}>
      {children}
      {!signe && (
        <button className="machine modifier" onClick={onModifier}>modifier</button>
      )}
    </div>
  );
}

const DUREE = 1400;

// Appui long : la signature se trace pendant qu'on maintient, lâcher annule.
function BoutonSigner({ signe, occupe, onSigne }: { signe: boolean; occupe: boolean; onSigne: () => void }) {
  const [avance, setAvance] = useState(signe ? 1 : 0);
  const debut = useRef<number | null>(null);
  const image = useRef(0);

  useEffect(() => () => cancelAnimationFrame(image.current), []);

  function commencer() {
    if (signe || occupe || debut.current !== null) return;
    debut.current = performance.now();
    vibrer(10);
    const pas = (t: number) => {
      if (debut.current === null) return;
      const a = Math.min(1, (t - debut.current) / DUREE);
      setAvance(a);
      if (a >= 1) {
        debut.current = null;
        onSigne();
        return;
      }
      image.current = requestAnimationFrame(pas);
    };
    image.current = requestAnimationFrame(pas);
  }

  function arreter() {
    if (debut.current === null) return;
    debut.current = null;
    cancelAnimationFrame(image.current);
    setAvance(0);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 6 }}>
        <span className="machine" style={{ fontSize: 11, color: "#55524c" }}>SIGNATURE</span>
        <span style={{ flex: 1, borderBottom: "1px solid var(--encre)", height: 34, position: "relative" }}>
          <svg width="150" height="40" viewBox="0 0 150 40" fill="none" stroke="#0b0b0b" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ position: "absolute", left: 10, bottom: -6 }}>
            <path d="M4 30c10-22 16-24 14-8s8-18 18-14-6 20 4 16 14-20 20-12 6 14 14 6 18-6 30-10" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - avance} opacity={avance > 0 ? 1 : 0} />
          </svg>
        </span>
      </div>
      <button
        className="bouton-signer"
        style={{ ["--avance" as string]: avance }}
        disabled={signe || occupe}
        onPointerDown={commencer}
        onPointerUp={arreter}
        onPointerLeave={arreter}
        onPointerCancel={arreter}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat) {
            e.preventDefault();
            commencer();
          }
        }}
        onKeyUp={arreter}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="titre">{signe ? "ACCUSATION SIGNÉE" : avance > 0 ? "CONTINUE…" : "MAINTIENS POUR SIGNER"}</span>
      </button>
      <span style={{ fontSize: 12, color: "#55524c", textAlign: "center" }}>
        {signe ? "Pas de retour en arrière." : "Une seule chance. Lâche avant la fin pour annuler."}
      </span>
    </>
  );
}
