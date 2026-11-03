import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { api } from "./lib/api";
import { useRoute } from "./lib/routeur";
import { Connexion } from "./ecrans/Connexion";
import { Pseudo } from "./ecrans/Pseudo";
import { Dossiers } from "./ecrans/Dossiers";
import { Associes } from "./ecrans/Associes";
import { Archives } from "./ecrans/Archives";
import { Preparer } from "./ecrans/Preparer";
import { BureauRdv } from "./ecrans/Bureau";
import { Partie } from "./ecrans/Partie";
import { Regles } from "./ecrans/Regles";

// Le pseudo est gardé dans le navigateur pour ouvrir l'app sans attendre la
// base ; il ne change jamais une fois choisi.
const clePseudo = (uid: string) => `enquete-pseudo-${uid}`;

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [connu, setConnu] = useState<{ uid: string; pseudo: string | null } | null>(null);
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

  if (session === undefined) return null;
  if (!session) return <Connexion />;
  if (pseudo === undefined) return null;
  if (pseudo === null) {
    return <Pseudo onChoisi={(p) => { localStorage.setItem(clePseudo(session.user.id), p); setConnu({ uid: session.user.id, pseudo: p }); }} />;
  }
  if (route.ecran === "regles") return <Regles />;
  if (route.ecran === "associes") return <Associes />;
  if (route.ecran === "archives") return <Archives />;
  if (route.ecran === "preparer") return <Preparer />;
  if (route.ecran === "bureau") return <BureauRdv key={route.partie} partie={route.partie} pseudo={pseudo} />;
  if (route.ecran === "partie") return <Partie key={route.partie} route={route} />;
  return <Dossiers />;
}
