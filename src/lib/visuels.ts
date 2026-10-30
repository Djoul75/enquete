import type { Suspect } from "./types";

// Visages et décors dessinés (composants Visage et Decor). Une affaire peut
// les préciser (suspect.visage, lieu.decor : c'est ce que fait le worker
// pour les nouvelles affaires) ; sinon on les devine d'après la silhouette,
// le rôle et le nom du lieu, pour que les affaires déjà rangées dans la
// base s'affichent sans rien y changer.

export const COIFFURES = ["longs", "carre", "chignon", "courts", "degarni", "rase"] as const;
export const CHAPEAUX = ["aucun", "feutre", "cloche", "beret", "casquette", "melon"] as const;
export const PILOSITES = ["aucune", "moustache", "barbe", "favoris"] as const;
export const TENUES = ["costume", "imper", "robe", "gilet", "uniforme", "col-roule"] as const;
export const ACCESSOIRES = ["aucun", "cigarette", "lunettes", "monocle", "perles", "voilette", "noeud", "foulard"] as const;
export const DECORS = [
  "bureau", "quai", "bar", "loge", "chambre", "cabine", "compartiment", "couloir", "scene",
  "terrasse", "piscine", "radio", "ecurie", "atelier", "coffre", "phare", "piece",
] as const;

export type Visage = {
  femme: boolean;
  carrure: "fine" | "moyenne" | "forte";
  age: "jeune" | "mur" | "vieux";
  coiffure: (typeof COIFFURES)[number];
  chapeau: (typeof CHAPEAUX)[number];
  pilosite: (typeof PILOSITES)[number];
  tenue: (typeof TENUES)[number];
  accessoire: (typeof ACCESSOIRES)[number];
  rouge_levres: boolean;
  ombre: "gauche" | "droite"; // côté du visage plongé dans le noir
};

export type DecorId = (typeof DECORS)[number];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Base tirée des six anciennes silhouettes (0 à 5).
const BASES: Omit<Visage, "ombre">[] = [
  { femme: false, carrure: "moyenne", age: "mur", coiffure: "courts", chapeau: "feutre", pilosite: "aucune", tenue: "costume", accessoire: "aucun", rouge_levres: false },
  { femme: true, carrure: "fine", age: "jeune", coiffure: "longs", chapeau: "aucun", pilosite: "aucune", tenue: "robe", accessoire: "aucun", rouge_levres: true },
  { femme: false, carrure: "forte", age: "mur", coiffure: "degarni", chapeau: "aucun", pilosite: "moustache", tenue: "gilet", accessoire: "aucun", rouge_levres: false },
  { femme: true, carrure: "fine", age: "mur", coiffure: "carre", chapeau: "cloche", pilosite: "aucune", tenue: "robe", accessoire: "perles", rouge_levres: false },
  { femme: false, carrure: "fine", age: "mur", coiffure: "courts", chapeau: "aucun", pilosite: "aucune", tenue: "imper", accessoire: "aucun", rouge_levres: false },
  { femme: false, carrure: "moyenne", age: "mur", coiffure: "courts", chapeau: "beret", pilosite: "aucune", tenue: "col-roule", accessoire: "aucun", rouge_levres: false },
];

// Retouches selon le rôle, dans l'ordre : la première qui correspond gagne.
const ROLES: [RegExp, Partial<Visage>][] = [
  [/veuve/, { accessoire: "voilette", chapeau: "cloche", tenue: "robe" }],
  [/inspecteur|commissaire|policier|detective|agent/, { chapeau: "feutre", tenue: "imper", accessoire: "cigarette" }],
  [/chanteuse|vedette|meneuse|actrice|danseuse/, { rouge_levres: true, coiffure: "longs", tenue: "robe" }],
  [/barman|caissier|maitre d'hotel|serveur|croupier/, { tenue: "gilet", accessoire: "noeud" }],
  [/conducteur|steward|chauffeur|groom|portier|lad/, { tenue: "uniforme", chapeau: "casquette" }],
  [/gardien|marin|patron du canot|pecheur|capitaine/, { tenue: "col-roule", chapeau: "casquette", pilosite: "barbe" }],
  [/medecin|docteur|ingenieur|scenariste|reporter|secretaire|comptable|typographe|technicien/, { accessoire: "lunettes" }],
  [/aristocrate|comte|baron|milliardaire|banquier/, { accessoire: "monocle", tenue: "costume" }],
  [/bookmaker|producteur|patron|directeur|marchand|associe/, { accessoire: "cigarette", tenue: "costume" }],
  [/epouse|niece|heritiere|proprietaire|photographe/, { accessoire: "foulard" }],
  [/emigre|russe/, { pilosite: "barbe", chapeau: "aucun" }],
];

export function visageDe(s: Suspect): Visage {
  const ombre: Visage["ombre"] = hash(s.id) % 2 ? "gauche" : "droite";
  if (s.visage) return { ...s.visage, ombre: s.visage.ombre ?? ombre };
  const base = { ...BASES[((s.silhouette % 6) + 6) % 6] };
  const role = sansAccents(s.role);
  const retouche = ROLES.find(([re]) => re.test(role))?.[1] ?? {};
  const v: Visage = { ...base, ...retouche, ombre };
  // Pas de barbe ni de monocle chez une femme, pas de rouge à lèvres chez un homme.
  if (v.femme) {
    if (v.pilosite !== "aucune") v.pilosite = "aucune";
    if (v.accessoire === "monocle") v.accessoire = "perles";
    if (v.tenue === "gilet" || v.tenue === "col-roule") v.tenue = "robe";
  } else {
    v.rouge_levres = false;
    if (v.accessoire === "perles" || v.accessoire === "voilette") v.accessoire = "aucun";
    if (v.tenue === "robe") v.tenue = "costume";
    if (v.coiffure === "longs" || v.coiffure === "chignon" || v.coiffure === "carre") v.coiffure = "courts";
  }
  if (/jeune/.test(role)) v.age = "jeune";
  if (/vieux|vieil|ancien|doyen/.test(role)) v.age = "vieux";
  return v;
}

// Mots du nom du lieu → décor ; le premier qui correspond gagne.
const LIEUX: [RegExp, DecorId][] = [
  [/rotative|imprimerie|atelier|garage|usine|chaufferie|machine/, "atelier"],
  [/lanterne|phare|veille/, "phare"],
  [/radio|standard|telegraph|telephone/, "radio"],
  [/\bbox\b|sellerie|ecurie|baraque|grange|paddock/, "ecurie"],
  [/caisse|coffre|banque|casino/, "coffre"],
  [/piscine|bain/, "piscine"],
  [/terrasse|jardin|balcon|pont superieur|parc|piste/, "terrasse"],
  [/quai|\bport\b|canot|bateau|ponton|plage|jetee/, "quai"],
  [/loge|vestiaire|coulisse/, "loge"],
  [/\bscene\b|plateau|studio|salle de spectacle/, "scene"],
  [/\bbar\b|comptoir|restaurant|cafe|cuisine|salon|fumoir/, "bar"],
  [/compartiment|wagon/, "compartiment"],
  [/cabine|hublot/, "cabine"],
  [/chambre|suite|appartement/, "chambre"],
  [/couloir|galerie|escalier|hall|corridor/, "couloir"],
  [/bureau|cabinet|bibliotheque/, "bureau"],
];

export function decorDe(lieu: { nom: string; decor?: string }): DecorId {
  if (lieu.decor && (DECORS as readonly string[]).includes(lieu.decor)) return lieu.decor as DecorId;
  const nom = sansAccents(lieu.nom);
  return LIEUX.find(([re]) => re.test(nom))?.[1] ?? "piece";
}
