import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { aller, heuresRestantes, useMaintenant } from "../lib/routeur";
import { activerNotifications, etatNotifications } from "../lib/push";
import type { Accueil, ResumePartie } from "../lib/types";

// Limites fixées dans la base (enquete_etat) ; l'accueil ne les renvoie pas.
const QUESTIONS = 15;
const FOUILLES = 3;

export function Dossiers() {
  const [accueil, setAccueil] = useState<Accueil | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [notifs, setNotifs] = useState(etatNotifications());
  const maintenant = useMaintenant(30_000);

  const charger = useCallback(() => {
    api.accueil().then(setAccueil).catch((e: Error) => setErreur(e.message));
  }, []);

  useEffect(() => {
    charger();
    const id = window.setInterval(charger, 30_000);
    const auRetour = () => document.visibilityState === "visible" && charger();
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [charger]);

  async function ouvrir(mode: "solo" | "duel") {
    setOccupe(true);
    setErreur(null);
    try {
      const id = await api.nouvellePartie(mode);
      aller(`/p/${id}`);
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(false);
    }
  }

  async function demander() {
    setOccupe(true);
    try {
      await api.demanderAffaire();
      charger();
    } catch (e) {
      setErreur((e as Error).message);
    }
    setOccupe(false);
  }

  if (!accueil) {
    return (
      <main className="ecran pluie">
        {erreur ? <p className="erreur">{erreur}</p> : <span className="etiquette clignote">Ouverture des dossiers…</span>}
      </main>
    );
  }

  const enCours = accueil.parties.filter((p) => !p.revelee);
  const archives = accueil.parties.filter((p) => p.revelee);
  const resolues = archives.filter((p) => (p.score ?? 0) >= 50).length;
  const adversaire = accueil.adversaire ?? "l'autre";
  const plusRien = accueil.restantes_solo === 0 || accueil.restantes_duel === 0;

  return (
    <main className="ecran pluie">
      <div className="machine" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--gris-clair)" }}>
        <span>BRIGADE CRIMINELLE</span>
        <span style={{ display: "flex", gap: 6 }}>
          <span className="compteur-archive">{resolues} RÉSOLUE{resolues > 1 ? "S" : ""}</span>
          <span className="compteur-archive" style={{ color: "var(--gris)" }}>
            {archives.length - resolues} CLASSÉE{archives.length - resolues > 1 ? "S" : ""}
          </span>
        </span>
      </div>

      <h1 className="titre" style={{ fontSize: 88 }}>
        ENQUÊ<span className="rouge neon">T</span>E
      </h1>

      {enCours.length > 0 && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span className="etiquette">En cours</span>
          {enCours.map((p, i) => (
            <CarteEnCours key={p.id} partie={p} maintenant={maintenant} rang={i} />
          ))}
        </section>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="etiquette">Ouvrir un dossier</span>
        <div className="grille-2" style={{ gap: 10 }}>
          <BoutonMode
            titre="SEUL"
            texte="Toi, la ville, et un menteur."
            reste={accueil.restantes_solo}
            disabled={occupe || accueil.restantes_solo === 0}
            onClick={() => ouvrir("solo")}
          />
          <BoutonMode
            titre="EN DUEL"
            texte={`Contre ${adversaire}. Chacun pour soi.`}
            reste={accueil.restantes_duel}
            disabled={occupe || accueil.restantes_duel === 0}
            onClick={() => ouvrir("duel")}
            rouge
          />
        </div>
        {plusRien &&
          (accueil.demande_en_cours ? (
            <p className="machine clignote" style={{ fontSize: 13, margin: 0 }}>
              UNE NOUVELLE AFFAIRE EST EN COURS D'ÉCRITURE…
            </p>
          ) : (
            <button className="bouton" onClick={demander} disabled={occupe}>
              Plus de dossier en attente. <span className="rouge-texte">Faire écrire une nouvelle affaire →</span>
            </button>
          ))}
      </section>

      {erreur && <p className="erreur">{erreur}</p>}

      {archives.length > 0 && (
        <section>
          <span className="etiquette" style={{ display: "block", marginBottom: 6 }}>Archives</span>
          {archives.map((p, i) => {
            const resolue = (p.score ?? 0) >= 50;
            return (
              <a key={p.id} href={`#/p/${p.id}`} className="ligne-archive" style={{ borderBottom: i === archives.length - 1 ? "1px solid var(--trait)" : undefined }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span className="titre" style={{ fontSize: 23, lineHeight: 1 }}>{p.titre.toUpperCase()}</span>
                  <span className="petit" style={{ color: "var(--gris-clair)" }}>{sousTitreArchive(p)}</span>
                </span>
                <span className={`tampon${resolue ? "" : " rouge-texte"}`} style={{ transform: `rotate(${i % 2 ? 3 : -4}deg)` }}>
                  {resolue ? "RÉSOLUE" : "CLASSÉE"}
                </span>
              </a>
            );
          })}
        </section>
      )}

      <footer style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }} className="petit">
        <a href="#/regles" className="lien-retour" style={{ fontSize: 12, color: "var(--papier)", textDecoration: "underline" }}>Comment on joue ?</a>
        {notifs === "active" ? (
          <span style={{ color: "var(--gris-clair)" }}>Notifications ✓</span>
        ) : notifs === "indisponible" ? (
          <span style={{ color: "var(--gris-clair)", textAlign: "center" }}>Ajoute à l'écran d'accueil pour les notifications</span>
        ) : (
          <button className="lien-retour" style={{ fontSize: 12, color: "var(--gris-clair)", textDecoration: "underline" }} onClick={async () => setNotifs(await activerNotifications())}>
            Notifications
          </button>
        )}
        <button className="lien-retour" style={{ fontSize: 12, color: "var(--gris)" }} onClick={() => supabase.auth.signOut()}>
          Quitter
        </button>
      </footer>
    </main>
  );
}

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function sousTitreArchive(p: ResumePartie): string {
  if (p.mode === "solo") return `${dateCourte(p.created_at)} · Seul · ${p.score ?? 0} pts`;
  const autre = p.autres?.[0];
  return `${dateCourte(p.created_at)} · Duel · toi ${p.score ?? 0}, ${autre?.nom ?? "?"} ${autre?.score ?? 0}`;
}

function CarteEnCours({ partie, maintenant, rang }: { partie: ResumePartie; maintenant: number; rang: number }) {
  const autre = partie.autres?.[0];
  let bandeau: string | null = null;
  if (partie.mode === "duel") {
    if (partie.a_accuse) {
      bandeau = partie.echeance
        ? `Accusation signée. ${autre?.nom} a encore ${heuresRestantes(partie.echeance, maintenant)}.`
        : `Accusation signée. En attente de ${autre?.nom}.`;
    } else if (autre?.a_accuse && partie.echeance) {
      bandeau = `${autre.nom} a accusé · il te reste ${heuresRestantes(partie.echeance, maintenant)}`;
    }
  }
  return (
    <a href={`#/p/${partie.id}`} className="carte-en-cours apparait" style={{ animationDelay: `${rang * 60}ms` }}>
      <span className="tampon rouge-sombre" style={{ position: "absolute", right: 14, top: 14, transform: "rotate(6deg)" }}>
        {partie.mode === "duel" ? "DUEL" : "SEUL"}
      </span>
      <span className="machine" style={{ fontSize: 12 }}>
        {partie.cadre.ville.toUpperCase()}, {partie.cadre.annee}
      </span>
      <span className="titre" style={{ fontSize: 38, maxWidth: "80%" }}>{partie.titre.toUpperCase()}</span>
      {!partie.a_accuse && (
        <span className="jauges">
          <Jauge nom={`QUESTIONS ${partie.questions}/${QUESTIONS}`} part={partie.questions / QUESTIONS} />
          <Jauge nom={`FOUILLES ${partie.fouilles}/${FOUILLES}`} part={partie.fouilles / FOUILLES} />
          {partie.indices !== undefined && (
            <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="machine" style={{ fontSize: 11 }}>{partie.indices} INDICE{partie.indices > 1 ? "S" : ""}</span>
              <span style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                {Array.from({ length: Math.min(partie.indices, 12) }, (_, i) => (
                  <span key={i} style={{ width: 7, height: 4, background: "var(--rouge)" }} />
                ))}
              </span>
            </span>
          )}
        </span>
      )}
      {bandeau && (
        <span className="machine bandeau-carte">
          <span className="clignote" style={{ color: "var(--rouge-texte)" }}>●</span>
          {bandeau.toUpperCase()}
        </span>
      )}
      <span className="titre" style={{ fontSize: 22, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {partie.a_accuse ? "VOIR LE DOSSIER" : "REPRENDRE L'ENQUÊTE"} <span className="rouge" style={{ fontSize: 26 }}>→</span>
      </span>
    </a>
  );
}

function Jauge({ nom, part }: { nom: string; part: number }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="machine" style={{ fontSize: 11 }}>{nom}</span>
      <span style={{ display: "block", height: 4, background: "#c9c3b6" }}>
        <span className="jauge" style={{ display: "block", height: 4, width: `${Math.min(100, part * 100)}%`, background: "var(--encre)" }} />
      </span>
    </span>
  );
}

function BoutonMode(props: {
  titre: string;
  texte: string;
  reste: number;
  disabled: boolean;
  onClick: () => void;
  rouge?: boolean;
}) {
  return (
    <button
      className="bouton"
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        borderColor: props.disabled ? undefined : props.rouge ? "var(--rouge)" : "var(--trait-fort)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: 12,
      }}
    >
      <span className="titre" style={{ fontSize: 30, lineHeight: 1 }}>{props.titre}</span>
      <span style={{ fontSize: 12, color: "var(--gris-clair)", lineHeight: 1.35 }}>{props.texte}</span>
      <span className="petit" style={{ marginTop: 4, color: "var(--gris-clair)" }}>
        {props.reste === 0 ? "Aucun dossier" : `${props.reste} dossier${props.reste > 1 ? "s" : ""} en attente`}
      </span>
    </button>
  );
}
