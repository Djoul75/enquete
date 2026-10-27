import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { aller, heuresRestantes, useMaintenant } from "../lib/routeur";
import { activerNotifications, etatNotifications } from "../lib/push";
import type { Accueil, ResumePartie } from "../lib/types";

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
    return () => window.clearInterval(id);
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
      <div className="machine" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--gris)" }}>
        <span>BRIGADE CRIMINELLE</span>
        <span>
          {resolues} RÉSOLUE{resolues > 1 ? "S" : ""} · {archives.length - resolues} CLASSÉE{archives.length - resolues > 1 ? "S" : ""}
        </span>
      </div>

      <h1 className="titre" style={{ fontSize: 96 }}>
        ENQUÊ<span className="rouge">T</span>E
      </h1>

      {enCours.map((p) => (
        <CarteEnCours key={p.id} partie={p} maintenant={maintenant} />
      ))}

      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span className="etiquette">Ouvrir un dossier</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <BoutonMode
            titre="SEUL"
            texte="Toi, la ville, et un menteur."
            reste={accueil.restantes_solo}
            disabled={occupe || accueil.restantes_solo === 0}
            onClick={() => ouvrir("solo")}
          />
          <BoutonMode
            titre="EN DUEL"
            texte={`Même affaire que ${adversaire}. Chacun pour soi.`}
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
              Plus de dossier en attente. <span className="rouge">Faire écrire une nouvelle affaire →</span>
            </button>
          ))}
      </section>

      {erreur && <p className="erreur">{erreur}</p>}

      {archives.length > 0 && (
        <section>
          <span className="etiquette" style={{ display: "block", marginBottom: 6 }}>Archives</span>
          {archives.map((p, i) => (
            <a
              key={p.id}
              href={`#/p/${p.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                textDecoration: "none",
                borderTop: "1px solid var(--trait)",
                borderBottom: i === archives.length - 1 ? "1px solid var(--trait)" : undefined,
              }}
            >
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span className="titre" style={{ fontSize: 24, lineHeight: 1 }}>{p.titre.toUpperCase()}</span>
                <span className="petit">{sousTitreArchive(p)}</span>
              </span>
              {(p.score ?? 0) >= 50 ? (
                <span className="tampon">RÉSOLUE</span>
              ) : (
                <span className="tampon rouge">CLASSÉE</span>
              )}
            </a>
          ))}
        </section>
      )}

      <footer style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", gap: 12 }} className="petit">
        {notifs === "active" ? (
          <span>Notifications activées</span>
        ) : notifs === "indisponible" ? (
          <span>Ajoute le site à l'écran d'accueil pour les notifications</span>
        ) : (
          <button
            className="lien-retour"
            style={{ fontSize: 12, color: "var(--gris-clair)", textDecoration: "underline" }}
            onClick={async () => setNotifs(await activerNotifications())}
          >
            Activer les notifications
          </button>
        )}
        <button className="lien-retour" style={{ fontSize: 12, color: "var(--gris)" }} onClick={() => supabase.auth.signOut()}>
          Quitter le service
        </button>
      </footer>
    </main>
  );
}

function sousTitreArchive(p: ResumePartie): string {
  if (p.mode === "solo") return `Seul · ${p.questions} questions · ${p.score ?? 0} pts`;
  const autre = p.autres?.[0];
  return `Duel · toi ${p.score ?? 0}, ${autre?.nom ?? "?"} ${autre?.score ?? 0}`;
}

function CarteEnCours({ partie, maintenant }: { partie: ResumePartie; maintenant: number }) {
  const autre = partie.autres?.[0];
  let bandeau: string | null = null;
  if (partie.mode === "duel") {
    if (partie.a_accuse) {
      bandeau = partie.echeance
        ? `Accusation signée. ${autre?.nom} a encore ${heuresRestantes(partie.echeance, maintenant)}.`
        : `Accusation signée. En attente de ${autre?.nom}.`;
    } else if (autre?.a_accuse && partie.echeance) {
      bandeau = `${autre.nom} a accusé. Il te reste ${heuresRestantes(partie.echeance, maintenant)}.`;
    }
  }
  return (
    <a
      href={`#/p/${partie.id}`}
      className="apparait"
      style={{
        textDecoration: "none",
        background: "var(--papier)",
        color: "var(--encre)",
        padding: "18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        position: "relative",
      }}
    >
      <span className="tampon rouge" style={{ position: "absolute", right: 14, top: 14, transform: "rotate(6deg)" }}>
        {partie.mode === "duel" ? "DUEL" : "EN COURS"}
      </span>
      <span className="machine" style={{ fontSize: 12 }}>
        {partie.cadre.ville.toUpperCase()}, {partie.cadre.annee}
      </span>
      <span className="titre" style={{ fontSize: 44, maxWidth: "85%" }}>{partie.titre.toUpperCase()}</span>
      <span style={{ fontSize: 14 }}>
        Ton enquête : {partie.questions} question{partie.questions > 1 ? "s" : ""} posée{partie.questions > 1 ? "s" : ""},{" "}
        {partie.fouilles} fouille{partie.fouilles > 1 ? "s" : ""}.
      </span>
      {bandeau && (
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, background: "var(--encre)", color: "var(--papier)", padding: "8px 10px" }}>
          <span className="clignote" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--rouge)", flexShrink: 0 }} />
          {bandeau}
        </span>
      )}
    </a>
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
        gap: 6,
        minHeight: 120,
        padding: 14,
      }}
    >
      <span className="titre" style={{ fontSize: 32, lineHeight: 1 }}>{props.titre}</span>
      <span style={{ fontSize: 13, color: "var(--gris-clair)", lineHeight: 1.35 }}>{props.texte}</span>
      <span className="petit" style={{ marginTop: "auto" }}>
        {props.reste === 0 ? "Aucun dossier" : `${props.reste} dossier${props.reste > 1 ? "s" : ""} en attente`}
      </span>
    </button>
  );
}
