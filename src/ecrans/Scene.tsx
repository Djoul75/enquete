import { useEffect, useState } from "react";
import type { EtatPartie } from "../lib/types";
import { Visage } from "../composants/Visage";
import { Decor } from "../composants/Decor";
import { decorDe, visageDe } from "../lib/visuels";
import { BarreOnglets, EnTete } from "../composants/NavPartie";
import { aUnePiste, compteurs, echangesAvec, nomCourt, pluriel } from "../lib/partie";

export function Scene({ etat, nouveaux }: { etat: EtatPartie; nouveaux: number }) {
  const pub = etat.affaire.public;
  const c = compteurs(etat);
  const cleRecit = `enquete-recit-${etat.partie.id}`;
  // Le récit s'affiche en entier à la première visite, replié ensuite.
  const [recitOuvert, setRecitOuvert] = useState(() => !localStorage.getItem(cleRecit));
  const fouilles = new Set(etat.journal.filter((e) => e.type === "fouille").map((e) => e.ref));

  useEffect(() => {
    localStorage.setItem(cleRecit, "1");
  }, [cleRecit]);

  return (
    <main className="ecran jeu">
      <EnTete etat={etat} retour="#/" libelleRetour="Dossiers" titreAuDefilement />

      <div className="vue-entree" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="decor-entete" style={{ height: 150 }}>
          <Decor id={decorDe(pub.lieux[0])} cadrage="slice" />
          <span className="machine etiquette-rouge" style={{ position: "absolute", right: 16, bottom: 10 }}>SCÈNE DU CRIME</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: -4 }}>
          <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)" }}>
            {pub.cadre.ville.toUpperCase()} · {pub.cadre.heure.toUpperCase()} · {pub.cadre.annee}
          </span>
          <h1 className="titre apparait" style={{ fontSize: 44, lineHeight: 0.9, overflowWrap: "break-word" }}>{etat.affaire.titre.toUpperCase()}</h1>
        </div>

        <button className={`recit${recitOuvert ? " ouvert" : ""}`} onClick={() => setRecitOuvert(!recitOuvert)} aria-expanded={recitOuvert}>
          <span className="recit-texte">
            {pub.intro} <span className="rouge-texte">{pub.accroche}</span>
          </span>
          <span className="machine" style={{ fontSize: 12 }}>{recitOuvert ? "REPLIER ↑" : "RELIRE LE RÉCIT ↓"}</span>
        </button>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="etiquette">Suspects</span>
          <div className="grille-2">
            {pub.suspects.map((s, i) => {
              const n = echangesAvec(etat, s.id).length;
              const piste = aUnePiste(etat, s.id);
              return (
                <a key={s.id} href={`#/p/${etat.partie.id}/suspect/${s.id}`} className="carte-suspect" style={{ animationDelay: `${i * 50}ms` }}>
                  <span style={{ width: 56, flexShrink: 0 }}>
                    <Visage v={visageDe(s)} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, fontSize: 13, lineHeight: 1.25 }}>
                    <b style={{ overflowWrap: "break-word" }}>{nomCourt(s.nom)}</b>
                    <span style={{ color: "var(--gris-clair)" }}>{s.role}</span>
                    <span className="machine" style={{ fontSize: 11, marginTop: 3, color: piste ? "var(--rouge-texte)" : "var(--gris)" }}>
                      {piste ? "NOUVELLE PISTE" : n > 0 ? pluriel(n, "QUESTION").toUpperCase() : "PAS ENCORE VU"}
                    </span>
                  </span>
                  {piste && <span className="pastille" style={{ top: 8, right: 8 }} />}
                </a>
              );
            })}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="etiquette">Lieux</span>
            <span className="machine" style={{ fontSize: 12, color: c.fouillesRestantes > 0 ? "var(--rouge-texte)" : "var(--gris)" }}>
              {c.fouillesRestantes > 0 ? pluriel(c.fouillesRestantes, "FOUILLE RESTANTE", "FOUILLES RESTANTES") : "PLUS DE FOUILLE"}
            </span>
          </div>
          <div className="grille-2">
            {pub.lieux.map((l) => {
              const fait = fouilles.has(l.id);
              const ferme = !fait && c.fouillesRestantes <= 0;
              return (
                <a
                  key={l.id}
                  href={`#/p/${etat.partie.id}/lieu/${l.id}`}
                  className={`carte-lieu${fait ? " fait" : ""}${ferme ? " ferme" : ""}`}
                >
                  <span style={{ display: "block", height: 76, overflow: "hidden" }}>
                    <Decor id={decorDe(l)} cadrage="slice" assombri={fait || ferme} />
                  </span>
                  <span className="titre" style={{ padding: "7px 9px 6px", fontSize: 18 }}>{l.nom.toUpperCase()}</span>
                  {fait && <span className="machine tampon-carte">FOUILLÉ · RELIRE</span>}
                </a>
              );
            })}
          </div>
        </section>
      </div>

      <BarreOnglets etat={etat} actif="scene" nouveaux={nouveaux} />
    </main>
  );
}
