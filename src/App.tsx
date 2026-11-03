import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { api } from "./lib/api";
import { aller, useRoute } from "./lib/routeur";
import { Connexion } from "./ecrans/Connexion";
import { Pseudo } from "./ecrans/Pseudo";
import { Dossiers } from "./ecrans/Dossiers";
import { Associes } from "./ecrans/Associes";
import { Archives } from "./ecrans/Archives";
import { Compte } from "./ecrans/Compte";
import { demarrageAMontrer, installationAMontrer } from "./lib/installation";
import { Demarrage } from "./composants/Demarrage";
import { HorsLigne } from "./composants/HorsLigne";

// Les écrans lourds (partie, dessins des suspects et des lieux) arrivent en
// morceaux séparés, téléchargés en arrière-plan dès que l'accueil est affiché :
// l'accueil s'ouvre vite, et la suite est déjà là quand on la touche.
const charges = {
  partie: () => import("./ecrans/Partie"),
  bureau: () => import("./ecrans/Bureau"),
  preparer: () => import("./ecrans/Preparer"),
  regles: () => import("./ecrans/Regles"),
  tuto: () => import("./ecrans/Tuto"),
  installer: () => import("./ecrans/Installer"),
  passeport: () => import("./ecrans/Passeport"),
};
const Partie = lazy(() => charges.partie().then((m) => ({ default: m.Partie })));
const BureauRdv = lazy(() => charges.bureau().then((m) => ({ default: m.BureauRdv })));
const Preparer = lazy(() => charges.preparer().then((m) => ({ default: m.Preparer })));
const Regles = lazy(() => charges.regles().then((m) => ({ default: m.Regles })));
const Tuto = lazy(() => charges.tuto().then((m) => ({ default: m.Tuto })));
const Installer = lazy(() => charges.installer().then((m) => ({ default: m.Installer })));
const Passeport = lazy(() => charges.passeport().then((m) => ({ default: m.Passeport })));

function precharger() {
  const tout = () => Object.values(charges).forEach((f) => f().catch(() => {}));
  if ("requestIdleCallback" in window) requestIdleCallback(tout, { timeout: 2000 });
  else setTimeout(tout, 1000);
}

// Le pseudo est gardé dans le navigateur pour ouvrir l'app sans attendre la
// base ; la page Compte le met à jour quand on le change.
const clePseudo = (uid: string) => `enquete-pseudo-${uid}`;

function Ecran() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [connu, setConnu] = useState<{ uid: string; pseudo: string | null } | null>(null);
  // Premier passage sur téléphone, hors de l'app installée : d'abord
  // l'écran d'accueil, avant de se connecter (l'app ne reprend pas la
  // connexion de Safari).
  const [installation, setInstallation] = useState(installationAMontrer);
  const route = useRoute();
  const uid = session?.user.id;
  const pseudo = !uid ? undefined : connu?.uid === uid ? connu.pseudo : (localStorage.getItem(clePseudo(uid)) ?? undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid || localStorage.getItem(clePseudo(uid))) return;
    api.moi().then((m) => {
      if (m.pseudo) localStorage.setItem(clePseudo(uid), m.pseudo);
      setConnu({ uid, pseudo: m.pseudo });
    }).catch(() => setConnu({ uid, pseudo: null }));
  }, [uid]);

  const retenir = (p: string) => {
    if (!uid) return;
    localStorage.setItem(clePseudo(uid), p);
    setConnu({ uid, pseudo: p });
  };

  if (installation) return <Installer onContinuer={() => setInstallation(false)} />;
  if (session === undefined) return null;
  if (!session) return <Connexion />;
  if (pseudo === undefined) return null;
  if (pseudo === null) {
    return <Pseudo onChoisi={(p) => { retenir(p); aller("/tuto"); }} />;
  }
  if (route.ecran === "tuto") return <Tuto pseudo={pseudo} />;
  if (route.ecran === "installer") return <Installer depuisCompte onContinuer={() => aller("/compte")} />;
  if (route.ecran === "tampons") return <Passeport pseudo={pseudo} />;
  if (route.ecran === "compte") return <Compte pseudo={pseudo} onRenomme={retenir} />;
  if (route.ecran === "regles") return <Regles />;
  if (route.ecran === "associes") return <Associes />;
  if (route.ecran === "archives") return <Archives />;
  if (route.ecran === "preparer") return <Preparer />;
  if (route.ecran === "bureau") return <BureauRdv key={route.partie} partie={route.partie} pseudo={pseudo} />;
  if (route.ecran === "partie") return <Partie key={route.partie} route={route} />;
  return <Dossiers />;
}

export function App() {
  const [enseigne, setEnseigne] = useState(demarrageAMontrer);
  const finEnseigne = useCallback(() => setEnseigne(false), []);
  useEffect(precharger, []);
  return (
    <>
      {enseigne && <Demarrage onFini={finEnseigne} />}
      <HorsLigne />
      <Suspense fallback={null}>
        <Ecran />
      </Suspense>
    </>
  );
}
