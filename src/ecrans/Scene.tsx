import { useState } from "react";
import type { EtatPartie } from "../lib/types";
import type { Actions } from "./Partie";
import { Silhouette } from "../composants/Silhouette";
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
  const victime = pub.suspects.length % 6;

  return (
    <main className="ecran" style={{ paddingTop: 0, gap: 0 }}>
      <header
        style={{
          position: "relative",
          height: 260,
          margin: "0 -16px",
          background: "var(--papier)",
          color: "var(--encre)",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div style={{ position: "absolute", left: -90, top: 0, width: 230, height: 280, background: "var(--encre)", transform: "skewX(-14deg)" }} />
        <div style={{ position: "absolute", left: 14, bottom: 48, width: 100, height: 140 }}>
          <Silhouette variante={victime} fond="transparent" />
        </div>
        <div style={{ position: "absolute", left: 4, bottom: 50, width: 120, height: 8, background: "var(--rouge)" }} />
        <a href="#/" className="lien-retour" style={{ position: "absolute", left: 16, top: "calc(8px + env(safe-area-inset-top))", color: "var(--papier)" }}>
          ← DOSSIERS
        </a>
        <div
          style={{
            position: "absolute",
            right: 16,
            top: "calc(56px + env(safe-area-inset-top))",
            width: "58%",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            textAlign: "right",
          }}
        >
          <span className="machine" style={{ fontSize: 12 }}>
            {pub.cadre.ville.toUpperCase()} · {pub.cadre.heure.toUpperCase()}
          </span>
          <h1 className="titre apparait" style={{ fontSize: 44, overflowWrap: "break-word" }}>{etat.affaire.titre.toUpperCase()}</h1>
          <span className="machine" style={{ fontSize: 12 }}>{pub.cadre.annee}</span>
        </div>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 18 }}>
        {accusateur && etat.partie.echeance && (
          <BandeauDuel nom={accusateur.nom} temps={compteARebours(etat.partie.echeance, maintenant)} partie={etat.partie.id} />
        )}

        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>
          {pub.intro} <span className="rouge">{pub.accroche}</span>
        </p>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="etiquette">Suspects</span>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${pub.suspects.length}, minmax(0, 1fr))`, gap: 8 }}>
            {pub.suspects.map((s) => (
              <a key={s.id} href={`#/p/${etat.partie.id}/suspect/${s.id}`} style={{ textDecoration: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                <Silhouette variante={s.silhouette} />
                <span style={{ fontSize: 12, textAlign: "center", lineHeight: 1.25 }}>
                  {nomCourt(s.nom)}
                  <br />
                  <span style={{ color: "var(--gris)" }}>{s.role}</span>
                </span>
              </a>
            ))}
          </div>
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="etiquette">Lieux à fouiller</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {pub.lieux.map((l) => {
              const fait = fouilles_ids.has(l.id);
              const confirme = aConfirmer === l.id;
              return (
                <button
                  key={l.id}
                  className={confirme ? "bouton plein" : "bouton"}
                  disabled={fait || actions.occupe || (c.fouillesRestantes <= 0 && !fait)}
                  onClick={() => {
                    if (!confirme) return setAConfirmer(l.id);
                    setAConfirmer(null);
                    actions.fouiller(l.id);
                  }}
                  style={{ padding: "10px 12px" }}
                >
                  {fait ? `${l.nom} · fouillé` : confirme ? `Fouiller ? (${c.fouillesRestantes} restante${c.fouillesRestantes > 1 ? "s" : ""})` : l.nom}
                </button>
              );
            })}
          </div>
        </section>

        {actions.erreur && <p className="erreur">{actions.erreur}</p>}

        {fouilles.map((f) => (
          <article key={f.ref} className="apparait" style={{ borderLeft: "2px solid var(--papier)", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="etiquette">{pub.lieux.find((l) => l.id === f.ref)?.nom}</span>
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
