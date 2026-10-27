import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { useRoute } from "./lib/routeur";
import { Connexion } from "./ecrans/Connexion";
import { Dossiers } from "./ecrans/Dossiers";
import { Partie } from "./ecrans/Partie";

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const route = useRoute();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <Connexion />;
  if (route.ecran === "partie") return <Partie key={route.partie} route={route} />;
  return <Dossiers />;
}
