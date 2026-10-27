import { useEffect, useState } from "react";

// Routage par le « # » de l'URL : GitHub Pages ne sert qu'un index.html,
// donc pas de chemins réels. Routes :
//   #/                      dossiers
//   #/p/12                  scène de crime de la partie 12
//   #/p/12/suspect/ferrand  interrogatoire
//   #/p/12/mur | accuser | telegramme
export type Route =
  | { ecran: "dossiers" }
  | { ecran: "partie"; partie: number; vue: "scene" | "mur" | "accuser" | "telegramme" }
  | { ecran: "partie"; partie: number; vue: "suspect"; suspect: string };

function lire(): Route {
  const morceaux = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (morceaux[0] === "p" && morceaux[1]) {
    const partie = Number(morceaux[1]);
    if (morceaux[2] === "suspect" && morceaux[3]) return { ecran: "partie", partie, vue: "suspect", suspect: morceaux[3] };
    if (morceaux[2] === "mur" || morceaux[2] === "accuser" || morceaux[2] === "telegramme") {
      return { ecran: "partie", partie, vue: morceaux[2] };
    }
    return { ecran: "partie", partie, vue: "scene" };
  }
  return { ecran: "dossiers" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(lire);
  useEffect(() => {
    const surChangement = () => {
      setRoute(lire());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", surChangement);
    return () => window.removeEventListener("hashchange", surChangement);
  }, []);
  return route;
}

export function aller(chemin: string) {
  window.location.hash = chemin;
}

export function useMaintenant(intervalle = 1000): number {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(Date.now()), intervalle);
    return () => window.clearInterval(id);
  }, [intervalle]);
  return maintenant;
}

export function compteARebours(echeance: string, maintenant: number): string {
  const reste = Math.max(0, new Date(echeance).getTime() - maintenant);
  const h = Math.floor(reste / 3_600_000);
  const m = Math.floor((reste % 3_600_000) / 60_000);
  const s = Math.floor((reste % 60_000) / 1000);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function heuresRestantes(echeance: string, maintenant: number): string {
  const reste = Math.max(0, new Date(echeance).getTime() - maintenant);
  const h = Math.floor(reste / 3_600_000);
  const m = Math.floor((reste % 3_600_000) / 60_000);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}
