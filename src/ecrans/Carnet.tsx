import { useEffect, useRef, useState } from "react";
import type { EtatPartie } from "../lib/types";
import type { Actions } from "./Partie";
import { BarreOnglets, EnTete } from "../composants/NavPartie";
import { Visage } from "../composants/Visage";
import { Decor } from "../composants/Decor";
import { decorDe, visageDe } from "../lib/visuels";
import { echangesAvec, nomCourt, pluriel } from "../lib/partie";

// Les notes du joueur et tout ce qu'on lui a dit, rangé par suspect, pour
// relire sans refaire le tour de la scène.
export function Carnet({ etat, actions, lectureSeule }: { etat: EtatPartie; actions: Actions; lectureSeule?: boolean }) {
  const pub = etat.affaire.public;
  const [notes, setNotes] = useState(etat.moi.notes);
  const [sauvegarde, setSauvegarde] = useState<"ok" | "en-cours" | "erreur">("ok");
  const minuteur = useRef<number | undefined>(undefined);
  const interroges = pub.suspects.filter((s) => echangesAvec(etat, s.id).length > 0);
  const fouilles = etat.journal.filter((e) => e.type === "fouille");
  const [ouvert, setOuvert] = useState<string | null>(interroges[0]?.id ?? (fouilles.length ? "lieux" : null));

  // Enregistre les notes une seconde après la dernière frappe.
  useEffect(() => {
    if (notes === etat.moi.notes) return;
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => {
      actions.sauverNotes(notes).then(
        () => setSauvegarde("ok"),
        () => setSauvegarde("erreur")
      );
    }, 1000);
    return () => window.clearTimeout(minuteur.current);
  }, [notes, etat.moi.notes, actions]);

  const sol = etat.revelation?.solution;

  return (
    <main className="ecran jeu">
      <EnTete
        etat={etat}
        retour={lectureSeule ? `#/p/${etat.partie.id}` : "#/"}
        libelleRetour={lectureSeule ? "Retour" : "Dossiers"}
      />

      <div className="vue-entree" style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
        <h1 className="titre" style={{ fontSize: 48 }}>LE CARNET</h1>

        {sol && (
          <div style={{ border: "1px dashed var(--rouge)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="machine rouge-texte" style={{ fontSize: 12 }}>LE DÉTAIL QUI TRAHISSAIT</span>
            <span style={{ fontSize: 14 }}>{sol.rate}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label htmlFor="notes" className="etiquette">Mes notes</label>
            <span className="machine" style={{ fontSize: 11, color: sauvegarde === "erreur" ? "var(--rouge-texte)" : "var(--gris-clair)" }} aria-live="polite">
              {sauvegarde === "en-cours" ? "…" : sauvegarde === "erreur" ? "PAS ENREGISTRÉ, RÉESSAIE" : "✓ ENREGISTRÉ"}
            </span>
          </div>
          <textarea
            id="notes"
            className="cahier"
            rows={6}
            value={notes}
            placeholder="Qui ment ? Sur quoi ?"
            onChange={(e) => {
              setNotes(e.target.value);
              setSauvegarde("en-cours");
            }}
          />
        </div>

        <section style={{ display: "flex", flexDirection: "column" }}>
          <span className="etiquette" style={{ marginBottom: 6 }}>Ce qu'on t'a dit</span>
          {interroges.length === 0 && fouilles.length === 0 && (
            <span className="petit" style={{ padding: "10px 0" }}>Personne n'a encore parlé.</span>
          )}
          {interroges.map((s) => {
            const echanges = echangesAvec(etat, s.id);
            return (
              <Volet
                key={s.id}
                ouvert={ouvert === s.id}
                onBascule={() => setOuvert(ouvert === s.id ? null : s.id)}
                vignette={<Visage v={visageDe(s)} cadrage="tete" />}
                rond
                titre={nomCourt(s.nom)}
                compte={pluriel(echanges.length, "réponse")}
              >
                {echanges.map((e) => (
                  <span key={e.ref}>
                    <span style={{ color: "var(--gris)" }}>{pub.questions.find((q) => q.id === e.ref)?.texte} </span>
                    « {e.texte} »{e.didascalie && <i style={{ color: "var(--gris-clair)" }}> {e.didascalie}</i>}
                  </span>
                ))}
              </Volet>
            );
          })}
          {fouilles.length > 0 && (
            <Volet
              ouvert={ouvert === "lieux"}
              onBascule={() => setOuvert(ouvert === "lieux" ? null : "lieux")}
              vignette={<Decor id={decorDe(pub.lieux.find((l) => l.id === fouilles[0].ref) ?? { nom: "" })} cadrage="slice" />}
              titre={fouilles.map((f) => pub.lieux.find((l) => l.id === f.ref)?.nom).join(", ")}
              compte={pluriel(fouilles.length, "fouille")}
            >
              {fouilles.map((f) => (
                <span key={f.ref}>
                  <span style={{ color: "var(--gris)" }}>{pub.lieux.find((l) => l.id === f.ref)?.nom} : </span>
                  {f.texte}
                </span>
              ))}
            </Volet>
          )}
        </section>
      </div>

      {!lectureSeule && <BarreOnglets etat={etat} actif="carnet" />}
    </main>
  );
}

function Volet(props: {
  ouvert: boolean;
  onBascule: () => void;
  vignette: React.ReactNode;
  rond?: boolean;
  titre: string;
  compte: string;
  children: React.ReactNode;
}) {
  return (
    <div className="volet">
      <button className="volet-tete" onClick={props.onBascule} aria-expanded={props.ouvert}>
        <span className="volet-vignette" style={{ borderRadius: props.rond ? "50%" : 0 }}>{props.vignette}</span>
        <b style={{ flex: 1, minWidth: 0 }}>{props.titre}</b>
        <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)", flexShrink: 0 }}>
          {props.compte.toUpperCase()} {props.ouvert ? "▴" : "▾"}
        </span>
      </button>
      <div className="volet-corps" data-ouvert={props.ouvert}>
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0 12px 44px", fontSize: 13 }}>{props.children}</div>
        </div>
      </div>
    </div>
  );
}
