import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { aller } from "../lib/routeur";
import type { Associes, Bureau } from "../lib/types";

// Rendez-vous au bureau : l'hôte voit arriver ses associés et ouvre
// l'enveloppe quand tout le monde est assis. Être « là », c'est avoir ouvert
// le rendez-vous (même app fermée ensuite) ; le point vert montre en plus
// qui a l'app ouverte en ce moment (présence Realtime, sans table).
export function BureauRdv({ partie, pseudo }: { partie: number; pseudo: string }) {
  const [bureau, setBureau] = useState<Bureau | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enLigne, setEnLigne] = useState<Set<string>>(new Set());
  const [occupe, setOccupe] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [appel, setAppel] = useState<Associes["amis"] | null>(null);
  const canal = useRef<RealtimeChannel | null>(null);
  const [arrivees, setArrivees] = useState<Set<string>>(new Set());
  const precedent = useRef<Bureau | null>(null);

  const charger = useCallback(() => {
    api.bureau(partie).then((b) => {
      if (b.lancee) {
        window.location.replace(`#/p/${partie}`);
        return;
      }
      // Les arrivées depuis le dernier passage clignotent une fois.
      const avant = precedent.current;
      if (avant) {
        const nouveaux = b.participants
          .filter((p) => p.statut === "present" && avant.participants.find((x) => x.pseudo === p.pseudo)?.statut !== "present")
          .map((p) => p.pseudo);
        if (nouveaux.length) setArrivees((a) => new Set([...a, ...nouveaux]));
      }
      precedent.current = b;
      setBureau(b);
    }).catch((e: Error) => setErreur(e.message));
  }, [partie]);

  useEffect(() => {
    charger();
    const id = window.setInterval(charger, 4000);
    const auRetour = () => document.visibilityState === "visible" && charger();
    document.addEventListener("visibilitychange", auRetour);

    const c = supabase.channel(`bureau-${partie}`, { config: { presence: { key: pseudo } } });
    c.on("presence", { event: "sync" }, () => {
      setEnLigne(new Set(Object.keys(c.presenceState())));
      charger();
    })
      .on("broadcast", { event: "ouvert" }, () => window.location.replace(`#/p/${partie}`))
      .subscribe((statut) => {
        if (statut === "SUBSCRIBED") c.track({ depuis: Date.now() });
      });
    canal.current = c;

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", auRetour);
      supabase.removeChannel(c);
    };
  }, [charger, partie, pseudo]);

  async function agir(action: () => Promise<unknown>) {
    setOccupe(true);
    setErreur(null);
    try {
      await action();
    } catch (e) {
      setErreur((e as Error).message);
    }
    setOccupe(false);
  }

  async function ouvrir() {
    setOccupe(true);
    setErreur(null);
    try {
      await api.ouvrirDossier(partie);
      canal.current?.send({ type: "broadcast", event: "ouvert", payload: {} });
      window.location.replace(`#/p/${partie}`);
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(false);
    }
  }

  async function partir() {
    await agir(() => api.quitterBureau(partie));
    aller("/");
  }

  async function afficherAppel() {
    const a = await api.associes();
    const deja = new Set(bureau?.participants.filter((p) => p.statut !== "decline").map((p) => p.pseudo));
    setAppel(a.amis.filter((x) => !deja.has(x.pseudo)));
  }

  if (!bureau) {
    return (
      <main className="ecran">
        {erreur ? (
          <>
            <p className="erreur">{erreur}</p>
            <a className="lien-retour" href="#/">← DOSSIERS</a>
          </>
        ) : (
          <span className="etiquette clignote">Montée au bureau…</span>
        )}
      </main>
    );
  }

  const presents = bureau.participants.filter((p) => p.statut === "present");
  const attendus = bureau.participants.filter((p) => p.statut === "invite");
  const autour = bureau.participants.filter((p) => p.statut !== "decline");
  const moi = bureau.participants.find((p) => p.moi);
  const avec = autour.filter((p) => !p.hote && !p.moi).map((p) => p.pseudo);

  return (
    <main className={"ecran"}>
      <a href="#/" className="lien-retour">← DOSSIERS</a>

      {bureau.moi_hote ? (
        <span className="etiquette">Ton bureau</span>
      ) : (
        <div className="carte-papier pneumatique apparait">
          <span className="machine" style={{ fontSize: 11 }}>PNEUMATIQUE · PERSONNEL</span>
          <span className="titre" style={{ fontSize: 40 }}>{bureau.hote.toUpperCase()} A UNE AFFAIRE POUR TOI</span>
          <span className="machine" style={{ fontSize: 12 }}>
            RENDEZ-VOUS À SON BUREAU · {bureau.affaire ? bureau.affaire.titre.toUpperCase() : "ENVELOPPE CACHETÉE"}
            {avec.length > 0 && ` · ${avec.join(", ").toUpperCase()} ${avec.length > 1 ? "SONT" : "EST"} SUR LE COUP`}
          </span>
          <span className="tampon tampon-discret">DISCRET</span>
        </div>
      )}

      {bureau.moi_hote && (
        <div className="chemise apparait">
          <span className="machine" style={{ fontSize: 11 }}>
            DOSSIER N° {bureau.id} · {bureau.affaire ? `${bureau.affaire.cadre.ville.toUpperCase()}, ${bureau.affaire.cadre.annee}` : "ENVELOPPE CACHETÉE"}
          </span>
          {bureau.affaire ? (
            <span className="titre" style={{ fontSize: 32 }}>{bureau.affaire.titre.toUpperCase()}</span>
          ) : (
            <span className="caviarde" aria-label="Titre caché"><i style={{ width: "38%" }} /><i style={{ width: "18%" }} /><i style={{ width: "28%" }} /></span>
          )}
          <span className="machine" style={{ fontSize: 11 }}>{autour.length} PRIVÉS · UNE NUIT · UN VERDICT</span>
        </div>
      )}

      <section>
        <span className="etiquette">Assis au bureau {presents.length}/{autour.length}</span>
        <div style={{ marginTop: 6 }}>
          {bureau.participants.map((p) => (
            <div key={p.pseudo} className={`siege${p.statut === "invite" ? " attente" : ""}${p.statut === "decline" ? " decline" : ""}${arrivees.has(p.pseudo) ? " arrive" : ""}`}>
              <span className="initiale">{p.pseudo[0].toUpperCase()}</span>
              <span className="titre nom">{p.pseudo.toUpperCase()}{p.moi && <span className="petit" style={{ fontFamily: "var(--texte)" }}> (toi)</span>}</span>
              <span className="machine etat">
                {p.statut === "decline" ? "A DÉCLINÉ" : p.statut === "invite" ? (
                  <span className="points-attente">EN ROUTE</span>
                ) : (
                  <>{enLigne.has(p.pseudo) && <span className="point-vert" title="A l'app ouverte" />}{p.hote ? "HÔTE" : "LÀ"}</>
                )}
              </span>
            </div>
          ))}
        </div>
      </section>

      {bureau.moi_hote && autour.length < 6 && (
        appel === null ? (
          <button className="bouton discret" style={{ alignSelf: "flex-start" }} onClick={afficherAppel}>+ Appeler un autre associé</button>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {appel.length === 0 && <span className="petit">Tous tes associés sont déjà appelés.</span>}
            {appel.map((a) => (
              <button key={a.pseudo} className="bouton" disabled={occupe} onClick={() => agir(async () => { await api.appeler(partie, a.pseudo); setAppel(null); charger(); })}>
                + {a.pseudo}
              </button>
            ))}
          </div>
        )
      )}

      {!bureau.moi_hote && moi?.statut === "present" && (
        <>
          <p className="machine" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            TU ES ASSIS AU BUREAU DE {bureau.hote.toUpperCase()}.<br />
            {bureau.hote.toUpperCase()} OUVRE L'ENVELOPPE QUAND TOUT LE MONDE EST LÀ<span className="points-attente" />
          </p>
          <span className="petit">Tu peux fermer l'app : une notification te préviendra quand le dossier sera ouvert.</span>
        </>
      )}
      {moi?.statut === "decline" && <p className="petit" style={{ margin: 0 }}>Tu as décliné cette affaire.</p>}

      {erreur && <p className="erreur">{erreur}</p>}

      <div className="bouton-collant" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bureau.moi_hote ? (
          <>
            {attendus.length === 0 ? (
              <button className="gros-bouton rouge-fond" disabled={occupe || presents.length < 2} onClick={ouvrir}>
                {occupe ? "…" : presents.length < 2 ? "PERSONNE N'EST ASSIS" : "OUVRIR L'ENVELOPPE"}
              </button>
            ) : (
              <button className="gros-bouton contour" disabled>
                EN ATTENTE DE {attendus.length} PRIVÉ{attendus.length > 1 ? "S" : ""}
              </button>
            )}
            {attendus.length > 0 && presents.length >= 2 && (
              <button className="lien-retour" style={{ fontSize: 12, textDecoration: "underline", color: "var(--gris-clair)", alignSelf: "center" }} disabled={occupe} onClick={ouvrir}>
                Ou ouvrir avec ceux qui sont là
              </button>
            )}
            {confirmer ? (
              <span style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button className="bouton r" onClick={partir} disabled={occupe}>Annuler le rendez-vous</button>
                <button className="bouton discret" onClick={() => setConfirmer(false)}>Rester</button>
              </span>
            ) : (
              <button className="lien-retour" style={{ fontSize: 12, color: "var(--gris)", alignSelf: "center" }} onClick={() => setConfirmer(true)}>Annuler le rendez-vous</button>
            )}
          </>
        ) : moi?.statut === "present" ? (
          <>
            <button className="gros-bouton contour" disabled style={{ opacity: 0.7 }}>JE SUIS LÀ ✓</button>
            {confirmer ? (
              <span style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button className="bouton r" onClick={partir} disabled={occupe}>Décliner l'affaire</button>
                <button className="bouton discret" onClick={() => setConfirmer(false)}>Rester</button>
              </span>
            ) : (
              <button className="lien-retour" style={{ fontSize: 12, color: "var(--gris)", alignSelf: "center" }} onClick={() => setConfirmer(true)}>Décliner l'affaire</button>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
