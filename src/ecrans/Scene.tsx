import { useState } from "react";
import type { EtatPartie } from "../lib/types";
import type { Actions } from "./Partie";
import { Visage } from "../composants/Visage";
import { Decor } from "../composants/Decor";
import { decorDe, visageDe } from "../lib/visuels";
import { BandeauDuel, NavPartie } from "../composants/NavPartie";
import { compteurs, nomCourt } from "../lib/partie";
import { compteARebours, useMaintenant } from "../lib/routeur";

export function Scene({ etat, actions }: { etat: EtatPartie; actions: Actions }) {
  const pub = etat.affaire.public;
  const c = compteurs(etat);
  const maintenant = useMaintenant();
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const fouilles = etat.journal.filter((e) => e.type === "fouille");
  const fouilles_ids = new Set(fouilles.map((f) => f.ref));
  const accusateur = etat.autres.find((a) => a.a_accuse);

  return (
    <main className="ecran" style={{ paddingTop: 0, gap: 0 }}>
      <header style={{ position: "relative", height: 230, margin: "0 -16px", overflow: "hidden", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <Decor id={decorDe(pub.lieux[0])} cadrage="slice" />
        </div>
        <a
          href="#/"
          className="lien-retour"
          style={{ position: "absolute", left: 16, top: "calc(8px + env(safe-area-inset-top))", background: "var(--encre)", padding: "4px 8px" }}
        >
          ← DOSSIERS
        </a>
        <span className="machine" style={{ position: "absolute", right: 16, bottom: 12, background: "var(--rouge)", color: "var(--encre)", fontSize: 12, padding: "3px 8px" }}>
          SCÈNE DU CRIME
        </span>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, borderBottom: "3px solid var(--rouge)", padding: "18px 0 10px" }}>
        <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)" }}>
          {pub.cadre.ville.toUpperCase()} · {pub.cadre.heure.toUpperCase()} · {pub.cadre.annee}
        </span>
        <h1 className="titre apparait" style={{ fontSize: 46, lineHeight: 0.9, overflowWrap: "break-word" }}>{etat.affaire.titre.toUpperCase()}</h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 18 }}>
        {accusateur && etat.partie.echeance && (
          <BandeauDuel nom={accusateur.nom} temps={compteARebours(etat.partie.echeance, maintenant)} partie={etat.partie.id} />
        )}

        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
          {pub.intro} <span className="rouge">{pub.accroche}</span>
        </p>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="etiquette">Suspects</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {pub.suspects.map((s) => {
              const n = etat.journal.filter((e) => e.type === "question" && pub.questions.find((q) => q.id === e.ref)?.suspect === s.id).length;
              return (
                <a key={s.id} href={`#/p/${etat.partie.id}/suspect/${s.id}`} style={{ textDecoration: "none", display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ width: 64, flexShrink: 0, borderBottom: n ? "2px solid var(--rouge)" : "2px solid transparent" }}>
                    <Visage v={visageDe(s)} />
                  </span>
                  <span style={{ fontSize: 13, lineHeight: 1.25, minWidth: 0, overflowWrap: "break-word" }}>
                    <b>{nomCourt(s.nom)}</b>
                    <br />
                    <span style={{ color: "var(--gris)" }}>{s.role}</span>
                    {n > 0 && (
                      <>
                        <br />
                        <span className="machine" style={{ fontSize: 11, color: "var(--gris-clair)" }}>{n} question{n > 1 ? "s" : ""}</span>
                      </>
                    )}
                  </span>
                </a>
              );
            })}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="etiquette">Lieux à fouiller</span>
            <span className="machine" style={{ fontSize: 12, color: "var(--gris-clair)" }}>
              {c.fouillesRestantes} FOUILLE{c.fouillesRestantes > 1 ? "S" : ""} RESTANTE{c.fouillesRestantes > 1 ? "S" : ""}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {pub.lieux.map((l) => {
              const fait = fouilles_ids.has(l.id);
              const confirme = aConfirmer === l.id;
              return (
                <button
                  key={l.id}
                  className="lieu"
                  disabled={actions.occupe || (c.fouillesRestantes <= 0 && !fait)}
                  aria-pressed={confirme}
                  onClick={() => {
                    if (fait) return document.getElementById(`fouille-${l.id}`)?.scrollIntoView({ behavior: "smooth" });
                    if (!confirme) return setAConfirmer(l.id);
                    setAConfirmer(null);
                    actions.fouiller(l.id);
                  }}
                  style={{ borderColor: confirme ? "var(--papier)" : undefined }}
                >
                  <Decor id={decorDe(l)} assombri={fait} />
                  <span className="titre" style={{ padding: "8px 10px", fontSize: 19, color: fait ? "var(--gris)" : undefined }}>
                    {confirme ? `FOUILLER ? (${c.fouillesRestantes} RESTANTE${c.fouillesRestantes > 1 ? "S" : ""})` : l.nom.toUpperCase()}
                  </span>
                  {fait && <span className="tampon">FOUILLÉ</span>}
                </button>
              );
            })}
          </div>
        </section>

        {actions.erreur && <p className="erreur">{actions.erreur}</p>}

        {fouilles.map((f) => (
          <article key={f.ref} id={`fouille-${f.ref}`} className="apparait" style={{ display: "flex", flexDirection: "column", gap: 8, scrollMarginTop: 16 }}>
            <div style={{ position: "relative", height: 150, margin: "0 -16px", overflow: "hidden" }}>
              <Decor id={decorDe(pub.lieux.find((l) => l.id === f.ref) ?? { nom: "" })} cadrage="slice" />
              <span className="titre" style={{ position: "absolute", left: 16, bottom: 10, fontSize: 28, background: "var(--encre)", padding: "2px 8px" }}>
                {pub.lieux.find((l) => l.id === f.ref)?.nom.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: 15 }}>{f.texte}</span>
            {f.indice && (
              <span style={{ display: "flex", gap: 10, border: "1px dashed var(--rouge)", padding: "8px 10px", fontSize: 13 }}>
                <span className="machine rouge" style={{ fontSize: 12, flexShrink: 0 }}>INDICE</span>
                {f.indice.texte}
              </span>
            )}
          </article>
        ))}

        <div className="machine" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--gris)", borderTop: "1px solid var(--trait)", paddingTop: 12 }}>
          <span>QUESTIONS : {c.questions} / {etat.limites.questions}</span>
          <span>FOUILLES : {c.fouilles} / {etat.limites.fouilles}</span>
        </div>
      </div>

      <NavPartie partie={etat.partie.id} actif="scene" />
    </main>
  );
}
