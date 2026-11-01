import { useEffect, useState } from "react";

// Routage par le « # » de l'URL : GitHub Pages ne sert qu'un index.html,
// donc pas de chemins réels. Routes :
//   #/                      dossiers
//   #/regles                comment on joue
//   #/p/12                  scène de crime de la partie 12
//   #/p/12/suspect/ferrand  interrogatoire
//   #/p/12/lieu/quai        un lieu, en plein écran
//   #/p/12/mur | carnet | accuser | telegramme
export type VuePartie = "scene" | "mur" | "carnet" | "accuser" | "telegramme";
export type Route =
  | { ecran: "dossiers" }
  | { ecran: "regles" }
  | { ecran: "partie"; partie: number; vue: VuePartie }
  | { ecran: "partie"; partie: number; vue: "suspect"; suspect: string }
  | { ecran: "partie"; partie: number; vue: "lieu"; lieu: string };

const VUES: string[] = ["mur", "carnet", "accuser", "telegramme"];

function lire(): Route {
  const morceaux = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (morceaux[0] === "regles") return { ecran: "regles" };
  if (morceaux[0] === "p" && morceaux[1]) {
    const partie = Number(morceaux[1]);
    if (morceaux[2] === "suspect" && morceaux[3]) return { ecran: "partie", partie, vue: "suspect", suspect: morceaux[3] };
    if (morceaux[2] === "lieu" && morceaux[3]) return { ecran: "partie", partie, vue: "lieu", lieu: morceaux[3] };
    if (VUES.includes(morceaux[2])) return { ecran: "partie", partie, vue: morceaux[2] as VuePartie };
    return { ecran: "partie", partie, vue: "scene" };
  }
  return { ecran: "dossiers" };
}

// Position de défilement de chaque page, pour la retrouver au retour
// (revenir d'un suspect ramène là où on était sur la scène).
const positions = new Map<string, number>();
let enregistrement = 0;
window.addEventListener(
  "scroll",
  () => {
    cancelAnimationFrame(enregistrement);
    const hash = window.location.hash;
    enregistrement = requestAnimationFrame(() => positions.set(hash, window.scrollY));
  },
  { passive: true }
);

export function useRoute(): Route {
  const [route, setRoute] = useState(lire);
  useEffect(() => {
    const surChangement = () => {
      const nouvelle = lire();
      setRoute(nouvelle);
      // L'interrogatoire se place lui-même en bas de la conversation.
      if (nouvelle.ecran === "partie" && nouvelle.vue === "suspect") return;
      const y = positions.get(window.location.hash) ?? 0;
      requestAnimationFrame(() => window.scrollTo(0, y));
    };
    window.addEventListener("hashchange", surChangement);
    return () => window.removeEventListener("hashchange", surChangement);
  }, []);
  return route;
}

export function aller(chemin: string) {
  window.location.hash = chemin;
}

// Change de page sans empiler l'historique (passer d'un suspect à l'autre).
export function remplacer(chemin: string) {
  window.location.replace("#" + chemin);
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
