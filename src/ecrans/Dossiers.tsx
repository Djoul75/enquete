import { useState } from "react";
import { api } from "../lib/api";
import { useAccueil } from "../lib/accueil";
import { aller, heuresRestantes, useMaintenant } from "../lib/routeur";
import { activerNotifications, etatNotifications } from "../lib/push";
import { appareil, installee } from "../lib/installation";
import { useTampons } from "../lib/tampons";
import { CoupsDeTampon } from "../composants/CoupDeTampon";
import { Logo } from "../composants/Logo";
import { OngletsAccueil } from "../composants/OngletsAccueil";
import type { ResumeBureau, ResumePartie } from "../lib/types";
import { depuisDebut, finDeNuit, heureNuit } from "../lib/partie";

export function Dossiers() {
  const { accueil, erreur, setErreur, charger } = useAccueil();
  const [occupe, setOccupe] = useState(false);
  const [notifs, setNotifs] = useState(etatNotifications());
  const maintenant = useMaintenant(30_000);
  const { tampons, nouveaux, marquerVus } = useTampons();

  async function seul() {
    setOccupe(true);
    setErreur(null);
    try {
      aller(`/p/${await api.nouvellePartieSolo()}`);
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
      <main className="ecran">
        <Logo taille="min(17.5vw, 84px)" neon />
        {erreur ? (
          <p className="erreur">{erreur}</p>
        ) : (
          <>
            <span className="reflet" style={{ height: 150 }} />
            <span className="reflet" style={{ height: 14, width: "40%" }} />
            <span className="grille-2" style={{ gap: 10 }}>
              <span className="reflet" style={{ height: 120 }} />
              <span className="reflet" style={{ height: 120 }} />
            </span>
          </>
        )}
      </main>
    );
  }

  const enCours = accueil.parties.filter((p) => !p.revelee);
  const { moi } = accueil;

  return (
    <main className="ecran">
      <div className="machine" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12, color: "var(--gris-clair)" }}>
        <a href="#/compte" style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none" }}>AGENCE {moi.pseudo.toUpperCase()}</a>
        <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <span className="compteur-archive">{moi.resolues} RÉSOLUE{moi.resolues > 1 ? "S" : ""}</span>
          <span className="compteur-archive" style={{ color: "var(--gris)" }}>
            {moi.classees} CLASSÉE{moi.classees > 1 ? "S" : ""}
          </span>
        </span>
      </div>

      <Logo taille="min(17.5vw, 84px)" neon />

      {accueil.bureaux.map((b, i) => (
        <CarteRendezVous key={b.id} bureau={b} rang={i} />
      ))}

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
            bas={accueil.restantes_solo === 0 ? "Aucun dossier" : `${accueil.restantes_solo} dossier${accueil.restantes_solo > 1 ? "s" : ""} en attente`}
            disabled={occupe || accueil.restantes_solo === 0}
            onClick={seul}
          />
          <BoutonMode
            titre="À PLUSIEURS"
            texte="Donne rendez-vous à tes associés."
            bas={accueil.a_des_associes ? "De 2 à 6 privés" : "Ajoute d'abord un associé"}
            disabled={occupe}
            onClick={() => aller(accueil.a_des_associes ? "/preparer" : "/associes")}
            rouge
          />
        </div>
        {accueil.restantes_solo === 0 &&
          (accueil.demande_en_cours ? (
            <p className="machine clignote" style={{ fontSize: 13, margin: 0 }}>
              UNE NOUVELLE AFFAIRE EST EN COURS D'ÉCRITURE…
            </p>
          ) : moi.admin ? (
            <button className="bouton" onClick={demander} disabled={occupe}>
              Plus de dossier en attente. <span className="rouge-texte">Faire écrire une nouvelle affaire →</span>
            </button>
          ) : (
            <p className="petit" style={{ margin: 0 }}>Tu as tout lu. Un nouveau dossier arrive chaque lundi.</p>
          ))}
      </section>

      {erreur && <p className="erreur">{erreur}</p>}

      <a href="#/tuto" className="bouton comment-jouer">
        <span className="titre rouge" style={{ fontSize: 26 }}>?</span>
        <span style={{ flex: 1 }}>
          <span className="titre" style={{ fontSize: 22, display: "block" }}>COMMENT JOUER</span>
          <span className="petit">Le tuto, à revoir quand tu veux</span>
        </span>
        <span className="titre rouge" style={{ fontSize: 22 }}>→</span>
      </a>

      {notifs === "indisponible" && appareil() !== "ordi" && !installee() && (
        <a href="#/installer" className="lien-retour petit" style={{ fontSize: 12, color: "var(--rouge-texte)", textDecoration: "underline", alignSelf: "center" }}>
          Installer le jeu pour recevoir les notifications
        </a>
      )}
      {notifs === "inactive" && (
        <button className="lien-retour petit" style={{ fontSize: 12, color: "var(--rouge-texte)", textDecoration: "underline", alignSelf: "center" }} onClick={async () => setNotifs(await activerNotifications())}>
          Activer les notifications
        </button>
      )}

      {tampons && (
        <CoupsDeTampon nouveaux={nouveaux} total={tampons.length} gagnes={tampons.filter((t) => t.obtenu_at).length} pseudo={moi.pseudo} onVus={marquerVus} delai={400} />
      )}
      <OngletsAccueil actif="dossiers" demandes={accueil.demandes_associes} />
    </main>
  );
}

function CarteRendezVous({ bureau, rang }: { bureau: ResumeBureau; rang: number }) {
  const autres = bureau.autres ?? [];
  const avec = autres.length ? `Avec ${autres.join(", ").replace(/, ([^,]*)$/, " et $1")}` : "";
  return (
    <a href={`#/bureau/${bureau.id}`} className="carte-rdv apparait" style={{ animationDelay: `${rang * 60}ms` }}>
      <span className="etiquette rouge-texte">● {bureau.moi_hote ? "Ton bureau" : "Rendez-vous"}</span>
      <span className="titre" style={{ fontSize: 28 }}>
        {bureau.moi_hote ? `${bureau.presents} PRIVÉ${bureau.presents > 1 ? "S" : ""} ASSIS SUR ${bureau.attendus}` : `${bureau.hote.toUpperCase()} T'ATTEND À SON BUREAU`}
      </span>
      {avec && <span className="petit" style={{ color: "var(--gris-clair)" }}>{avec}</span>}
      <span className="bouton plein" style={{ alignSelf: "flex-start", marginTop: 4 }}>
        {bureau.moi_hote ? "Retourner au bureau →" : bureau.mon_statut === "present" ? "Retourner au bureau →" : "Monter au bureau →"}
      </span>
    </a>
  );
}

function CarteEnCours({ partie, maintenant, rang }: { partie: ResumePartie; maintenant: number; rang: number }) {
  const autres = partie.autres ?? [];
  const accusateur = autres.find((a) => a.a_accuse);
  const restants = autres.filter((a) => !a.a_accuse);
  let bandeau: string | null = null;
  if (partie.mode === "groupe") {
    if (partie.a_accuse) {
      const qui = restants.length === 1 ? restants[0].nom : "les autres";
      bandeau = partie.echeance
        ? `Accusation signée. ${qui} ${restants.length === 1 ? "a" : "ont"} encore ${heuresRestantes(partie.echeance, maintenant)}.`
        : `Accusation signée. En attente de ${qui}.`;
    } else if (accusateur && partie.echeance) {
      bandeau = `${accusateur.nom} a accusé · il te reste ${heuresRestantes(partie.echeance, maintenant)}`;
    }
  }
  return (
    <a href={`#/p/${partie.id}`} className="carte-en-cours apparait" style={{ animationDelay: `${rang * 60}ms` }}>
      <span className="tampon rouge-sombre" style={{ position: "absolute", right: 14, top: 14, transform: "rotate(6deg)" }}>
        {partie.mode === "groupe" ? `À ${autres.length + 1}` : "SEUL"}
      </span>
      <span className="machine" style={{ fontSize: 12 }}>
        {partie.cadre.ville.toUpperCase()}, {partie.cadre.annee}
      </span>
      <span className="titre" style={{ fontSize: 38, maxWidth: "80%" }}>{partie.titre.toUpperCase()}</span>
      {!partie.a_accuse && partie.horloge && partie.minutes !== null && (
        <span className="nuit-carte">
          <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
            <span className="machine" style={{ fontSize: 11 }}>
              IL EST <b className="titre" style={{ fontSize: 22, fontWeight: 400 }}>{heureNuit(partie.horloge, partie.minutes).toUpperCase()}</b>
            </span>
            <span className="machine" style={{ fontSize: 11 }}>{partie.indices} INDICE{partie.indices > 1 ? "S" : ""}</span>
          </span>
          <span className="nuit-carte-fil">
            <span className="jauge" style={{ width: `${Math.min(100, (partie.minutes / depuisDebut(partie.horloge, partie.horloge.aube)) * 100)}%` }} />
          </span>
          <span className="machine" style={{ fontSize: 10, display: "flex", justifyContent: "space-between", color: "#55524c" }}>
            <span>{heureNuit(partie.horloge, 0).toUpperCase()}</span>
            <span>{finDeNuit(partie.horloge).court} · {heureNuit(partie.horloge, depuisDebut(partie.horloge, partie.horloge.aube)).toUpperCase()}</span>
          </span>
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

function BoutonMode(props: {
  titre: string;
  texte: string;
  bas: string;
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
        {props.bas}
      </span>
    </button>
  );
}
