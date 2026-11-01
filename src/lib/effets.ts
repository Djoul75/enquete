import { useEffect, useRef, useState } from "react";

// Petits effets partagés : vibrations, glissements au doigt, texte tapé à la
// machine. Tout se coupe quand le téléphone demande moins d'animations.

export function mouvementReduit(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Android seulement : Safari sur iPhone n'expose pas les vibrations.
export function vibrer(motif: number | number[]) {
  navigator.vibrate?.(motif);
}

// Balayage horizontal sur un élément : gauche → suivant, droite → précédent.
export function useGlisser(surSuivant?: () => void, surPrecedent?: () => void) {
  const depart = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const t = e.touches[0];
      // Les bords de l'écran restent au geste « retour » du téléphone.
      depart.current = t.clientX < 24 || t.clientX > window.innerWidth - 24 ? null : { x: t.clientX, y: t.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!depart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - depart.current.x;
      const dy = t.clientY - depart.current.y;
      depart.current = null;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) surSuivant?.();
      else surPrecedent?.();
    },
  };
}

// Texte qui s'écrit lettre par lettre ; un appui le termine d'un coup.
export function useMachine(texte: string, actif: boolean, vitesse = 22) {
  const [n, setN] = useState(actif && !mouvementReduit() ? 0 : texte.length);
  useEffect(() => {
    if (n >= texte.length) return;
    const id = window.setTimeout(() => setN((x) => x + 1), texte[n - 1] === "." || texte[n - 1] === "," ? vitesse * 8 : vitesse);
    return () => window.clearTimeout(id);
  }, [n, texte, vitesse]);
  return { visible: texte.slice(0, n), fini: n >= texte.length, finir: () => setN(texte.length) };
}

// Mémoire de session par partie (choix d'accusation en cours…).
export function useMemoire<T>(cle: string, initial: T): [T, (v: T) => void] {
  const [valeur, setValeur] = useState<T>(() => {
    try {
      const brut = sessionStorage.getItem(cle);
      return brut ? (JSON.parse(brut) as T) : initial;
    } catch {
      return initial;
    }
  });
  return [
    valeur,
    (v: T) => {
      setValeur(v);
      try {
        sessionStorage.setItem(cle, JSON.stringify(v));
      } catch {
        // stockage plein ou interdit : la valeur reste en mémoire
      }
    },
  ];
}
