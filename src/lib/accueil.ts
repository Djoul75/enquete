import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { Accueil } from "./types";

// Dernier accueil reçu, partagé entre les onglets : passer de Dossiers à
// Archives s'affiche tout de suite, puis se rafraîchit.
let dernier: Accueil | null = null;

export function useAccueil(intervalle = 30_000) {
  const [accueil, setAccueil] = useState<Accueil | null>(dernier);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(() => {
    api
      .accueil()
      .then((a) => {
        dernier = a;
        setAccueil(a);
      })
      .catch((e: Error) => setErreur(e.message));
  }, []);

  useEffect(() => {
    charger();
    const id = window.setInterval(charger, intervalle);
    const auRetour = () => document.visibilityState === "visible" && charger();
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [charger, intervalle]);

  return { accueil, erreur, setErreur, charger };
}
