import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { aller, type Route } from "../lib/routeur";
import type { EtatAncien, EtatPartie } from "../lib/types";
import { indicesTrouves } from "../lib/partie";
import { Scene } from "./Scene";
import { Lieu } from "./Lieu";
import { Interrogatoire } from "./Interrogatoire";
import { Mur } from "./Mur";
import { Carnet } from "./Carnet";
import { Accusation } from "./Accusation";
import { Telegramme } from "./Telegramme";
import { Attente } from "./Attente";
import { Revelation } from "./Revelation";
import { RevelationAncienne } from "./RevelationAncienne";
import { AlerteNuit } from "../composants/AlerteNuit";
import { alerteEnAttente } from "../lib/alertes";

type RoutePartie = Extract<Route, { ecran: "partie" }>;

export type Actions = {
  poser: (question: string) => Promise<void>;
  montrer: (suspect: string, piece: string) => Promise<void>;
  fouiller: (lieu: string) => Promise<void>;
  accuser: (suspect: string, mobile: string, occasion: string | null, preuve: string | null) => Promise<void>;
  sauverNotes: (notes: string) => Promise<void>;
  occupe: boolean;
  erreur: string | null;
};

// Place de chaque vue, pour faire arriver la suivante du bon côté.
const RANG: Record<RoutePartie["vue"], number> = { scene: 0, suspect: 0.5, lieu: 0.5, mur: 1, carnet: 2, accuser: 3, telegramme: 0 };

export function Partie({ route }: { route: RoutePartie }) {
  const [etat, setEtat] = useState<EtatPartie | EtatAncien | null>(null);
  // Relu après une alerte de la nuit (événement, aube) fermée.
  const [, setAlertesLues] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const cleMur = `enquete-mur-vu-${route.partie}`;
  const [murVu, setMurVu] = useState(() => Number(localStorage.getItem(cleMur) ?? 0));
  const vuePrecedente = useRef(route.vue);

  const charger = useCallback(() => {
    api.etat(route.partie).then(setEtat).catch((e: Error) => setErreur(e.message));
  }, [route.partie]);

  useEffect(() => {
    charger();
    // À plusieurs, on surveille les autres joueurs (accusation, révélation), et on
    // recharge en revenant sur l'app.
    const id = window.setInterval(charger, 60_000);
    const auRetour = () => document.visibilityState === "visible" && charger();
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [charger]);

  useLayoutEffect(() => {
    const ecart = RANG[route.vue] - RANG[vuePrecedente.current];
    document.documentElement.dataset.sens = ecart > 0 ? "droite" : ecart < 0 ? "gauche" : "bas";
    vuePrecedente.current = route.vue;
  }, [route.vue]);

  const nbIndices = etat?.regle === 2 ? indicesTrouves(etat).length : 0;
  const marquerMurVu = useCallback(() => {
    localStorage.setItem(cleMur, String(nbIndices));
    setMurVu(nbIndices);
  }, [cleMur, nbIndices]);

  if (!etat) {
    return (
      <main className="ecran">
        {erreur ? (
          <>
            <p className="erreur">{erreur}</p>
            <a className="lien-retour" href="#/">← DOSSIERS</a>
          </>
        ) : (
          <span className="etiquette clignote">Lecture du dossier…</span>
        )}
      </main>
    );
  }

  if (etat.regle === 1) return <RevelationAncienne etat={etat} />;

  async function agir(action: () => Promise<EtatPartie>) {
    setOccupe(true);
    setErreur(null);
    try {
      setEtat(await action());
    } catch (e) {
      setErreur((e as Error).message);
    }
    setOccupe(false);
  }

  const actions: Actions = {
    poser: (q) => agir(() => api.poserQuestion(route.partie, q)),
    montrer: (s, p) => agir(() => api.montrer(route.partie, s, p)),
    fouiller: (l) => agir(() => api.fouiller(route.partie, l)),
    accuser: (s, m, o, p) => agir(() => api.accuser(route.partie, s, m, o, p)),
    // L'état local suit, pour retrouver ses notes en revenant au carnet.
    sauverNotes: (n) => api.sauverNotes(route.partie, n).then(() => setEtat((e) => (e?.regle === 2 ? { ...e, moi: { ...e.moi, notes: n } } : e))),
    occupe,
    erreur,
  };

  if (etat.revelation) {
    return route.vue === "carnet" ? <Carnet etat={etat} actions={actions} lectureSeule /> : <Revelation etat={etat} />;
  }
  if (etat.moi.accusation) {
    if (route.vue === "mur") return <Mur etat={etat} dejaVus={murVu} onVu={marquerMurVu} lectureSeule />;
    if (route.vue === "carnet") return <Carnet etat={etat} actions={actions} lectureSeule />;
    return <Attente etat={etat} />;
  }

  const cleTelegramme = `enquete-telegramme-${etat.partie.id}`;
  const autreAAccuse = etat.autres.some((a) => a.a_accuse);
  if (route.vue === "telegramme" || (route.vue === "scene" && autreAAccuse && !localStorage.getItem(cleTelegramme))) {
    return (
      <Telegramme
        etat={etat}
        onLu={() => {
          localStorage.setItem(cleTelegramme, "1");
          aller(`/p/${etat.partie.id}`);
          setEtat({ ...etat });
        }}
      />
    );
  }

  const nouveaux = Math.max(0, nbIndices - murVu);
  const ecran = (() => {
    switch (route.vue) {
      case "suspect":
        return <Interrogatoire key={route.suspect} etat={etat} suspectId={route.suspect} actions={actions} />;
      case "lieu":
        return <Lieu etat={etat} lieuId={route.lieu} actions={actions} />;
      case "mur":
        return <Mur etat={etat} dejaVus={murVu} onVu={marquerMurVu} />;
      case "carnet":
        return <Carnet etat={etat} actions={actions} />;
      case "accuser":
        return <Accusation etat={etat} actions={actions} />;
      default:
        return <Scene etat={etat} nouveaux={nouveaux} />;
    }
  })();

  // Un événement de la nuit ou l'aube passe devant l'écran en cours. On
  // attend la fin d'une action (la réponse s'écrit d'abord) pour l'afficher.
  const alerte = !occupe && route.vue !== "accuser" ? alerteEnAttente(etat) : null;
  return (
    <>
      {ecran}
      {alerte && (
        <AlerteNuit
          key={alerte.type === "aube" ? "aube" : alerte.e.heure}
          etat={etat}
          alerte={alerte}
          onLu={(versAccusation) => {
            setAlertesLues((n) => n + 1);
            if (versAccusation) aller(`/p/${etat.partie.id}/accuser`);
          }}
        />
      )}
    </>
  );
}
