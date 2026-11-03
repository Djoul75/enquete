import { supabase } from "./supabase";
import type { EtatTampon } from "./tampons";
import type { Accueil, Agence, Associes, Bureau, DossierPossible, EtatPartie, Moi } from "./types";

// Les refus écrits par le jeu (raise exception, code P0001) sont déjà en
// français et parlent au joueur ; tout le reste est remplacé par un message
// simple, le détail technique restant dans la console.
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (error.code === "P0001") throw new Error(error.message);
    console.error(fn, error);
    if (!navigator.onLine || /fetch|network|load failed/i.test(error.message)) {
      throw new Error("Connexion perdue. Vérifie ton réseau et réessaie.");
    }
    throw new Error("Le bureau ne répond pas. Réessaie dans un instant.");
  }
  return data as T;
}

export const api = {
  moi: () => rpc<Moi>("enquete_moi"),
  pseudoLibre: (pseudo: string) => rpc<boolean>("enquete_pseudo_libre", { p_pseudo: pseudo }),
  choisirPseudo: (pseudo: string) => rpc<void>("enquete_choisir_pseudo", { p_pseudo: pseudo }),
  renommer: (pseudo: string) => rpc<void>("enquete_renommer", { p_pseudo: pseudo }),
  chercherAgences: (debut: string) => rpc<Agence[]>("enquete_chercher_agences", { p_debut: debut }),

  associes: () => rpc<Associes>("enquete_associes"),
  ajouterAssocie: (pseudo: string) => rpc<"demande" | "associes" | "deja">("enquete_ajouter_associe", { p_pseudo: pseudo }),
  repondreAssocie: (pseudo: string, oui: boolean) => rpc<void>("enquete_repondre_associe", { p_pseudo: pseudo, p_oui: oui }),
  retirerAssocie: (pseudo: string) => rpc<void>("enquete_retirer_associe", { p_pseudo: pseudo }),

  dossiersPossibles: (pseudos: string[]) => rpc<DossierPossible[]>("enquete_dossiers_possibles", { p_pseudos: pseudos }),
  preparer: (pseudos: string[], affaire: number | null) => rpc<number>("enquete_preparer", { p_pseudos: pseudos, p_affaire: affaire }),
  revanche: (partie: number) => rpc<number>("enquete_revanche", { p_partie: partie }),
  bureau: (partie: number) => rpc<Bureau>("enquete_bureau", { p_partie: partie }),
  appeler: (partie: number, pseudo: string) => rpc<void>("enquete_appeler", { p_partie: partie, p_pseudo: pseudo }),
  quitterBureau: (partie: number) => rpc<void>("enquete_quitter_bureau", { p_partie: partie }),
  ouvrirDossier: (partie: number) => rpc<number>("enquete_ouvrir_dossier", { p_partie: partie }),

  accueil: () => rpc<Accueil>("enquete_accueil"),
  etat: (partie: number) => rpc<EtatPartie>("enquete_etat", { p_partie: partie }),
  nouvellePartieSolo: () => rpc<number>("enquete_nouvelle_partie", { p_mode: "solo" }),
  poserQuestion: (partie: number, question: string) =>
    rpc<EtatPartie>("enquete_poser_question", { p_partie: partie, p_question: question }),
  fouiller: (partie: number, lieu: string) => rpc<EtatPartie>("enquete_fouiller", { p_partie: partie, p_lieu: lieu }),
  accuser: (partie: number, suspect: string, mobile: string, preuve: string) =>
    rpc<EtatPartie>("enquete_accuser", { p_partie: partie, p_suspect: suspect, p_mobile: mobile, p_preuve: preuve }),
  sauverNotes: (partie: number, notes: string) => rpc<void>("enquete_sauver_notes", { p_partie: partie, p_notes: notes }),
  demanderAffaire: () => rpc<void>("enquete_demander_affaire"),
  tampons: () => rpc<EtatTampon[]>("enquete_tampons"),
  tamponsVus: (cles: string[]) => rpc<void>("enquete_tampons_vus", { p_cles: cles }),
};
