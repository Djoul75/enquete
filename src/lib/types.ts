import type { DecorId, Visage } from "./visuels";

// Format d'une affaire. La partie « publique » est envoyée au navigateur dès
// le début ; la partie « secrète » ne sort de la base que morceau par
// morceau (réponse à une question posée, résultat d'une fouille) puis en
// entier à la révélation. Le même format sert aux affaires écrites à la
// main (affaires/*.json) et à celles générées par Claude (worker).

export type Suspect = {
  id: string;
  nom: string;
  role: string; // « chanteuse », « inspecteur »…
  portrait: string; // une phrase de présentation
  silhouette: number; // 0 à 5, ancienne forme dessinée ; sert encore à deviner le visage
  visage?: Omit<Visage, "ombre"> & { ombre?: Visage["ombre"] }; // voir lib/visuels.ts
};

export type Question = {
  id: string;
  suspect: string;
  texte: string;
  // Id d'un indice à avoir trouvé pour que la question apparaisse
  // (« Montrer la douille du quai »).
  requiert?: string;
};

export type AffairePublic = {
  cadre: { ville: string; annee: string; heure: string };
  intro: string;
  accroche: string; // la dernière phrase du récit, en rouge
  victime: string;
  suspects: Suspect[];
  lieux: { id: string; nom: string; decor?: DecorId }[]; // le premier lieu = la scène du crime
  questions: Question[];
  mobiles: { id: string; texte: string }[];
  journal: { nom: string; date: string; prix: string };
};

export type Reponse = { texte: string; didascalie?: string; indice?: string };

export type AffaireSecret = {
  questions: Record<string, Reponse>;
  fouilles: Record<string, Reponse>;
  indices: Record<string, { texte: string }>;
  solution: {
    coupable: string;
    mobile: string;
    preuves: string[]; // indices qui comptent comme bonne preuve
    une: string; // gros titre du journal, ex. « L'INSPECTEUR FERRAND ARRÊTÉ »
    recit: string;
    rate: string; // l'indice que les joueurs ratent souvent
  };
};

export type Affaire = { titre: string; public: AffairePublic; secret: AffaireSecret };

// ---------------------------------------------------------------------------
// Réponses des fonctions enquete_* (voir supabase/migrations)
// ---------------------------------------------------------------------------

export type EntreeJournal = {
  type: "question" | "fouille";
  ref: string;
  at: string;
  texte: string;
  didascalie: string | null;
  indice: { id: string; texte: string } | null;
};

export type Accusation = { suspect: string; mobile: string; preuve: string; at: string };

export type EtatPartie = {
  partie: { id: number; mode: Mode; echeance: string | null; revelee: boolean };
  affaire: { id: number; titre: string; public: AffairePublic };
  moi: { notes: string; accusation: Accusation | null; score: number | null };
  journal: EntreeJournal[];
  autres: { nom: string; a_accuse: boolean; accuse_at: string | null }[];
  revelation: {
    solution: AffaireSecret["solution"];
    indices: AffaireSecret["indices"];
    joueurs: {
      nom: string;
      moi: boolean;
      suspect: string | null;
      mobile: string | null;
      preuve: string | null;
      score: number;
      questions: number;
      indices: string[];
    }[];
  } | null;
  limites: { questions: number; fouilles: number };
};

export type Mode = "solo" | "groupe";

export type ResumePartie = {
  id: number;
  mode: Mode;
  echeance: string | null;
  created_at: string;
  revelee: boolean;
  titre: string;
  cadre: AffairePublic["cadre"];
  a_accuse: boolean;
  score: number | null;
  questions: number;
  fouilles: number;
  indices: number;
  autres: { nom: string; a_accuse: boolean; score: number | null }[] | null;
};

// Un rendez-vous au bureau pas encore ouvert, vu de l'accueil.
export type ResumeBureau = {
  id: number;
  hote: string;
  moi_hote: boolean;
  mon_statut: "invite" | "present";
  presents: number;
  attendus: number;
  autres: string[] | null;
};

export type Accueil = {
  moi: { pseudo: string; admin: boolean; resolues: number; classees: number; record: number | null };
  parties: ResumePartie[];
  bureaux: ResumeBureau[];
  demandes_associes: number;
  a_des_associes: boolean;
  restantes_solo: number;
  demande_en_cours: boolean;
};

export type Moi = { pseudo: string | null; admin: boolean };

export type Associes = {
  amis: { pseudo: string; ensemble: number; moi_devant: number; lui_devant: number }[];
  recues: string[];
  envoyees: string[];
};

export type DossierPossible = { id: number; titre: string; cadre: AffairePublic["cadre"] };

export type Bureau = {
  id: number;
  hote: string;
  moi_hote: boolean;
  lancee: boolean;
  created_at: string;
  affaire: { titre: string; cadre: AffairePublic["cadre"] } | null;
  participants: { pseudo: string; statut: "invite" | "present" | "decline"; hote: boolean; moi: boolean }[];
};
