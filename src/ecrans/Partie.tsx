import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { aller, type Route } from "../lib/routeur";
import type { EtatPartie } from "../lib/types";
import { Scene } from "./Scene";
import { Interrogatoire } from "./Interrogatoire";
import { Mur } from "./Mur";
import { Accusation } from "./Accusation";
import { Telegramme } from "./Telegramme";
import { Attente } from "./Attente";
import { Revelation } from "./Revelation";

type RoutePartie = Extract<Route, { ecran: "partie" }>;

export type Actions = {
  poser: (question: string) => Promise<void>;
  fouiller: (lieu: string) => Promise<void>;
  accuser: (suspect: string, mobile: string, preuve: string) => Promise<void>;
  sauverNotes: (notes: string) => void;
  occupe: boolean;
  erreur: string | null;
};

export function Partie({ route }: { route: RoutePartie }) {
  const [etat, setEtat] = useState<EtatPartie | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(() => {
    api.etat(route.partie).then(setEtat).catch((e: Error) => setErreur(e.message));
  }, [route.partie]);

  useEffect(() => {
    charger();
    // En duel, on surveille l'autre joueur (accusation, révélation).
    const id = window.setInterval(charger, 60_000);
    return () => window.clearInterval(id);
  }, [charger]);

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

  const actions: Actions = {
    poser: (q) => agir(() => api.poserQuestion(route.partie, q)),
    fouiller: (l) => agir(() => api.fouiller(route.partie, l)),
    accuser: (s, m, p) => agir(() => api.accuser(route.partie, s, m, p)),
    sauverNotes: (n) => {
      api.sauverNotes(route.partie, n).catch(() => {});
    },
    occupe,
    erreur,
  };

  if (etat.revelation) return <Revelation etat={etat} />;
  if (etat.moi.accusation) return <Attente etat={etat} />;

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

  switch (route.vue) {
    case "suspect":
      return <Interrogatoire etat={etat} suspectId={route.suspect} actions={actions} />;
    case "mur":
      return <Mur etat={etat} actions={actions} />;
    case "accuser":
      return <Accusation etat={etat} actions={actions} />;
    default:
      return <Scene etat={etat} actions={actions} />;
  }
}
