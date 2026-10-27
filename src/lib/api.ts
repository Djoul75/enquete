import { supabase } from "./supabase";
import type { Accueil, EtatPartie } from "./types";

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const api = {
  accueil: () => rpc<Accueil>("enquete_accueil"),
  etat: (partie: number) => rpc<EtatPartie>("enquete_etat", { p_partie: partie }),
  nouvellePartie: (mode: "solo" | "duel") => rpc<number>("enquete_nouvelle_partie", { p_mode: mode }),
  poserQuestion: (partie: number, question: string) =>
    rpc<EtatPartie>("enquete_poser_question", { p_partie: partie, p_question: question }),
  fouiller: (partie: number, lieu: string) => rpc<EtatPartie>("enquete_fouiller", { p_partie: partie, p_lieu: lieu }),
  accuser: (partie: number, suspect: string, mobile: string, preuve: string) =>
    rpc<EtatPartie>("enquete_accuser", { p_partie: partie, p_suspect: suspect, p_mobile: mobile, p_preuve: preuve }),
  sauverNotes: (partie: number, notes: string) => rpc<void>("enquete_sauver_notes", { p_partie: partie, p_notes: notes }),
  demanderAffaire: () => rpc<void>("enquete_demander_affaire"),
};
