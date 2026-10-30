import { useState } from "react";
import type { EtatPartie } from "../lib/types";
import type { Actions } from "./Partie";
import { Visage } from "../composants/Visage";
import { visageDe } from "../lib/visuels";
import { indicesTrouves, nomCourt } from "../lib/partie";
import { compteARebours, useMaintenant } from "../lib/routeur";

export function Accusation({ etat, actions }: { etat: EtatPartie; actions: Actions }) {
  const pub = etat.affaire.public;
  const indices = indicesTrouves(etat);
  const maintenant = useMaintenant();
  const [suspect, setSuspect] = useState<string | null>(null);
  const [mobile, setMobile] = useState<string | null>(null);
  const [preuve, setPreuve] = useState<string | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const pret = suspect && mobile && preuve;
  const nomSuspect = pub.suspects.find((s) => s.id === suspect)?.nom;

  return (
    <main className="ecran">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href={`#/p/${etat.partie.id}`} className="lien-retour">← ANNULER</a>
        {etat.partie.echeance && (
          <span className="machine rouge" style={{ fontSize: 12 }}>{compteARebours(etat.partie.echeance, maintenant)}</span>
        )}
      </div>
      <h1 className="titre" style={{ fontSize: 88, lineHeight: 0.82 }}>J'ACCUSE</h1>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="etiquette">Qui</span>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${pub.suspects.length}, minmax(0, 1fr))`, gap: 8 }}>
          {pub.suspects.map((s) => {
            const choisi = s.id === suspect;
            return (
              <button
                key={s.id}
                onClick={() => setSuspect(s.id)}
                aria-pressed={choisi}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  alignItems: "center",
                  fontSize: 12,
                  color: choisi ? "var(--rouge)" : undefined,
                  fontWeight: choisi ? 700 : 400,
                }}
              >
                <span style={{ width: "100%", outline: choisi ? "3px solid var(--rouge)" : "none", opacity: choisi ? 1 : 0.55 }}>
                  <Visage v={visageDe(s)} />
                </span>
                {nomCourt(s.nom)}
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="etiquette">Pourquoi</span>
        {pub.mobiles.map((m) => (
          <button
            key={m.id}
            className={m.id === mobile ? "bouton plein" : "bouton discret"}
            aria-pressed={m.id === mobile}
            onClick={() => setMobile(m.id)}
          >
            {m.texte}
          </button>
        ))}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="etiquette">La preuve</span>
        {indices.length === 0 ? (
          <span className="petit">Aucun indice trouvé. On n'accuse pas sans preuve.</span>
        ) : (
          indices.map((i) => (
            <button
              key={i.id}
              className="bouton"
              aria-pressed={i.id === preuve}
              onClick={() => setPreuve(i.id)}
              style={{
                borderStyle: i.id === preuve ? "dashed" : "solid",
                borderColor: i.id === preuve ? "var(--rouge)" : "var(--trait-fort)",
                color: i.id === preuve ? "var(--papier)" : "var(--gris-clair)",
              }}
            >
              {i.texte}
            </button>
          ))
        )}
      </section>

      {actions.erreur && <p className="erreur">{actions.erreur}</p>}

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          className="gros-bouton rouge-fond"
          disabled={!pret || actions.occupe}
          onClick={() => {
            if (!confirmer) return setConfirmer(true);
            actions.accuser(suspect!, mobile!, preuve!);
          }}
          style={{ fontSize: 30 }}
        >
          {confirmer && nomSuspect ? `SIGNER : ${nomCourt(nomSuspect).toUpperCase()}` : "SIGNER L'ACCUSATION"}
        </button>
        <span className="petit" style={{ textAlign: "center" }}>
          {confirmer ? "Touche encore pour signer. Pas de retour en arrière." : "Une seule chance."}
        </span>
      </div>
    </main>
  );
}
