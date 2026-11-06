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
  patience: number; // crans de la cigarette : 2 ou 3
  silhouette: number; // 0 à 5, ancienne forme dessinée ; sert encore à deviner le visage
  visage?: Omit<Visage, "ombre"> & { ombre?: Visage["ombre"] }; // voir lib/visuels.ts
};

// Une question d'ouverture est là dès le début ; une relance apparaît une
// fois sa question posée (« apres ») ; une piste s'ouvre avec un indice.
export type Question = {
  id: string;
  suspect: string;
  texte: string;
  genre: "ouverture" | "relance" | "piste";
  apres?: string;
  requiert?: string;
};

// Un événement à heure fixe, annoncé dans le récit.
export type Evenement = { heure: string; texte: string; suspect_absent?: string; lieu_perdu?: string };

export type Fin = { court: string; titre: string[]; texte: string };

export type Couts = { question: number; relance: number; montrer: number; fouille: number };

export type AffairePublic = {
  format: 2;
  cadre: { ville: string; annee: string; heure: string };
  intro: string;
  accroche: string; // la dernière phrase du récit, en rouge
  victime: string;
  journal: { nom: string; date: string; prix: string };
  // « 02:00 », « 06:00 ». La fin est l'aube, sauf si l'affaire en décide
  // autrement (le train entre en gare, le bateau lève l'ancre).
  horloge: { debut: string; aube: string; couts: Couts; fin?: Fin };
  evenements: Evenement[];
  suspects: Suspect[];
  lieux: { id: string; nom: string; decor?: DecorId }[]; // le premier lieu = la scène du crime
  mobiles: { id: string; texte: string }[];
  questions: Question[];
};

export type Reponse = { texte: string; didascalie?: string; indice?: string; fache?: boolean };

export type AffaireSecret = {
  questions: Record<string, Reponse>;
  montrer: Record<string, Record<string, Reponse>>; // suspect → pièce (ou _defaut) → réaction
  braque: Record<string, string>;
  ricane: Record<string, string>;
  craque: Record<string, { pieces: string[]; texte: string; didascalie?: string; indice?: string }>;
  fouilles: Record<string, Reponse & { apres_evenement?: string }>;
  indices: Record<string, { texte: string; nature: string }>;
  solution: {
    coupable: string;
    mobile: string;
    occasion: string[]; // indices qui montrent qu'il a pu le faire
    preuves: string[]; // indices qui le font condamner
    une: string; // gros titre du journal, ex. « L'inspecteur Ferrand arrêté »
    recit: string;
    rate: string; // le détail qui trahissait le coupable
  };
};

export type Affaire = { titre: string; public: AffairePublic; secret: AffaireSecret };

// ---------------------------------------------------------------------------
// Réponses des fonctions enquete_* (voir supabase/migrations)
// ---------------------------------------------------------------------------

// Un geste de la nuit, avec ce qu'il a donné. `minute` : quand il a commencé,
// en minutes depuis le début de la nuit.
export type EntreeJournal = {
  type: "question" | "fouille" | "montrer";
  ref: string;
  minute: number;
  at: string;
  suspect?: string;
  question?: string; // le texte de la question posée
  genre?: Question["genre"];
  piece?: { id: string; texte: string }; // la pièce montrée
  texte: string;
  didascalie: string | null;
  indice?: { id: string; texte: string };
  fache?: boolean; // un cran de patience en moins
  braque?: string; // le suspect s'est braqué, avec sa dernière réplique
  craque?: boolean;
  ricane?: boolean; // pièce montrée à un suspect braqué, sans effet
  perdu?: boolean; // lieu fouillé après l'événement qui l'a vidé
};

export type IndiceTrouve = {
  id: string;
  texte: string;
  minute: number;
  type: "question" | "fouille";
  cible: string; // id du suspect ou du lieu, pour y retourner depuis le mur
};

export type Verdict = "condamne" | "relache" | "erreur";

export type Accusation = { suspect: string; mobile: string; occasion: string | null; preuve: string | null; minutes: number; at: string };

export type EtatPartie = {
  regle: 2;
  partie: { id: number; mode: Mode; echeance: string | null; revelee: boolean };
  affaire: { id: number; titre: string; public: AffairePublic };
  moi: { notes: string; accusation: Accusation | null; verdict: Verdict | null };
  nuit: {
    minutes: number; // depuis le début de la nuit
    aube: number; // durée de la nuit, en minutes
    patience: Record<string, number>;
    braques: string[];
    craques: string[];
    montrees: string[]; // « suspect:piece »
    ouvertes: string[]; // questions qu'on peut poser maintenant
    absents: string[];
  };
  journal: EntreeJournal[];
  indices: IndiceTrouve[];
  autres: { nom: string; a_accuse: boolean; accuse_at: string | null }[];
  revelation: {
    solution: AffaireSecret["solution"];
    indices: Record<string, { texte: string; nature: string }>;
    joueurs: {
      nom: string;
      moi: boolean;
      suspect: string | null;
      mobile: string | null;
      occasion: string | null;
      preuve: string | null;
      minutes: number | null;
      verdict: Verdict | null;
      braques: number; // suspects qu'il a braqués
      indices: string[];
    }[];
  } | null;
};

// Une enquête de l'ancienne règle (points), close : seule la une se relit.
export type EtatAncien = {
  regle: 1;
  partie: { id: number; mode: Mode; echeance: string | null; revelee: true };
  affaire: { id: number; titre: string; public: { cadre: AffairePublic["cadre"]; victime: string; journal: AffairePublic["journal"]; suspects: Suspect[] } };
  revelation: {
    solution: { coupable: string; une: string; recit: string; rate: string };
    joueurs: { nom: string; moi: boolean; suspect: string | null; score: number | null }[];
  };
};

export type Mode = "solo" | "groupe";

export type ResumePartie = {
  id: number;
  mode: Mode;
  echeance: string | null;
  created_at: string;
  revelee: boolean;
  regle: 1 | 2;
  titre: string;
  cadre: AffairePublic["cadre"];
  horloge: AffairePublic["horloge"] | null; // null pour l'ancienne règle
  a_accuse: boolean;
  score: number | null; // ancienne règle
  verdict: Verdict | null;
  accuse_minutes: number | null;
  classement: number | null;
  minutes: number | null; // heure de la nuit, pour une enquête en cours
  indices: number;
  autres: { nom: string; a_accuse: boolean; score: number | null; verdict: Verdict | null; minutes: number | null; classement: number | null }[] | null;
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
  moi: { pseudo: string; admin: boolean; resolues: number; classees: number; record: number | null }; // record : minute du jour (ex. 235 = 3 h 55)
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

// Suggestion pendant la recherche d'un associé, avec le lien qu'on a déjà.
export type Agence = { pseudo: string; lien: "associe" | "envoyee" | "recue" | null };

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
