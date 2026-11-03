import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { aller } from "../lib/routeur";
import type { Associes, DossierPossible } from "../lib/types";

const MAX_INVITES = 5;

// Préparer un rendez-vous : les associés d'abord, puis le dossier, puisque
// la liste dépend de qui a déjà lu quoi.
export function Preparer() {
  const [associes, setAssocies] = useState<Associes | null>(null);
  const [choisis, setChoisis] = useState<string[]>([]);
  const [dossiers, setDossiers] = useState<DossierPossible[] | null>(null);
  const [dossier, setDossier] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    api.associes().then(setAssocies).catch((e: Error) => setErreur(e.message));
  }, []);

  useEffect(() => {
    let annule = false;
    const id = window.setTimeout(() => {
      api.dossiersPossibles(choisis).then((d) => {
        if (annule) return;
        setDossiers(d);
        setDossier((actuel) => (actuel !== null && d.some((x) => x.id === actuel) ? actuel : null));
      }).catch((e: Error) => !annule && setErreur(e.message));
    }, 150);
    return () => {
      annule = true;
      window.clearTimeout(id);
    };
  }, [choisis]);

  function basculer(pseudo: string) {
    setChoisis((c) => (c.includes(pseudo) ? c.filter((x) => x !== pseudo) : c.length >= MAX_INVITES ? c : [...c, pseudo]));
  }

  async function donnerRendezVous() {
    setOccupe(true);
    setErreur(null);
    try {
      const id = await api.preparer(choisis, dossier);
      window.location.replace(`#/bureau/${id}`);
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(false);
    }
  }

  const plusRien = dossiers !== null && dossiers.length === 0;

  return (
    <main className="ecran">
      <a href="#/" className="lien-retour" onClick={(e) => {
          e.preventDefault();
          if (history.length > 1) history.back();
          else aller("/");
        }}>← ANNULER</a>
      <h1 className="titre apparait" style={{ fontSize: 52 }}>QUI EST<br />SUR LE COUP ?</h1>
      <span className="petit">Jusqu'à {MAX_INVITES} associés. Tu pourras en appeler d'autres depuis le bureau.</span>

      <section>
        {associes?.amis.map((a) => {
          const on = choisis.includes(a.pseudo);
          return (
            <button key={a.pseudo} className="ligne-associe ligne-choix" aria-pressed={on} onClick={() => basculer(a.pseudo)}>
              <span className="qui"><span className="initiale">{a.pseudo[0].toUpperCase()}</span><span className="titre nom">{a.pseudo.toUpperCase()}</span></span>
              <span className={`case-cocher${on ? " on" : ""}`}>{on ? "✓" : ""}</span>
            </button>
          );
        })}
        {associes && associes.amis.length === 0 && (
          <p className="petit">Tu n'as pas encore d'associé. <a href="#/associes" style={{ color: "var(--papier)" }}>En ajouter →</a></p>
        )}
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="etiquette">
          Le dossier{dossiers ? ` · ${dossiers.length} jamais lu${dossiers.length > 1 ? "s" : ""} ${choisis.length ? `par vous ${choisis.length + 1}` : "par toi"}` : ""}
        </span>
        <button className={`choix-dossier${dossier === null ? " choisi" : ""}`} onClick={() => setDossier(null)} disabled={plusRien}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span className="titre" style={{ fontSize: 22 }}>ENVELOPPE CACHETÉE</span>
            <span className="petit" style={{ color: "var(--gris-clair)" }}>Tirée au hasard. Le titre se découvre à l'ouverture.</span>
          </span>
          <span className={`case-cocher${dossier === null ? " on" : ""}`}>{dossier === null ? "✓" : ""}</span>
        </button>
        {dossiers?.map((d) => (
          <button key={d.id} className={`choix-dossier${dossier === d.id ? " choisi" : ""}`} onClick={() => setDossier(d.id)}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <span className="titre" style={{ fontSize: 22 }}>{d.titre.toUpperCase()}</span>
              <span className="machine" style={{ fontSize: 11, color: "var(--gris)" }}>{d.cadre.ville.toUpperCase()}, {d.cadre.annee}</span>
            </span>
            <span className={`case-cocher${dossier === d.id ? " on" : ""}`}>{dossier === d.id ? "✓" : ""}</span>
          </button>
        ))}
        {plusRien && <p className="petit" style={{ margin: 0 }}>Vous avez tout lu à vous {choisis.length + 1}. Un nouveau dossier arrive chaque lundi.</p>}
      </section>

      {erreur && <p className="erreur">{erreur}</p>}

      <button
        className="gros-bouton rouge-fond bouton-collant"
        disabled={occupe || choisis.length === 0 || plusRien}
        onClick={donnerRendezVous}
      >
        {occupe ? "…" : choisis.length === 0 ? "CHOISIS TES ASSOCIÉS" : "DONNER RENDEZ-VOUS"}
      </button>
    </main>
  );
}
