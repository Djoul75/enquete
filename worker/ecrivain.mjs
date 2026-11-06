// Fait écrire une nouvelle affaire par Claude, au format plat imposé par
// SCHEMA_PLAT, puis vérifie sa cohérence. Une seconde tentative reçoit la
// liste des problèmes trouvés à la première.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { aplatir, deplier, SCHEMA_PLAT, verifier } from "./affaire.mjs";

const EXEMPLE = aplatir(JSON.parse(readFileSync(new URL("../affaires/v2/01-vieux-port.json", import.meta.url), "utf8")));

const CONSIGNES = `Tu écris des affaires pour « Agence Noire », un jeu d'enquête policière sur téléphone, en français, dans l'ambiance des films noirs et des vieux polars (Sin City, Melville, Simenon, Chandler).

Comment on joue (la règle de la nuit) :
- Le joueur arrive sur les lieux à l'heure du crime (horloge.debut) ; l'aube se lève environ quatre heures plus tard (horloge.aube). Chaque geste coûte du temps : une question 10 min, une relance 5 min, montrer une pièce 5 min, une fouille 30 min. À l'aube, il doit signer son dossier avec ce qu'il a. Il ne peut pas tout faire : il choisit.
- Les interrogatoires sont de vraies conversations préparées : chaque suspect a 2 ou 3 questions d'ouverture (genre « ouverture »). Une réponse peut ouvrir une relance (genre « relance », champ apres = id de la question d'avant, même suspect) : c'est la question naturelle qu'on poserait juste après. Un indice peut ouvrir une piste chez n'importe quel suspect (genre « piste », champ requiert = id de l'indice).
- Chaque suspect a une patience de 2 ou 3 crans (une cigarette). Une question qui fâche (fache = true : accusation directe, insinuation, sujet sensible) coûte un cran ; à zéro, il se braque (réplique « braque ») et ne répond plus. Les questions qui fâchent sont souvent les plus intéressantes : le joueur doit choisir lesquelles poser.
- Le joueur peut montrer une pièce de son mur à un suspect. Chaque suspect a des réactions prévues pour les pièces qui le concernent (champ montrer : une réaction peut donner un indice, ou fâcher), et une réaction par défaut (montrer_defaut). Montrée à un suspect braqué, une pièce qui n'est pas dans craque.pieces le fait seulement ricaner (réplique « ricane »).
- Le coupable a un champ craque : les vraies preuves contre lui (pieces) qui, montrées alors qu'il est braqué, le font craquer une fois ; il lâche alors un aveu partiel ou un lapsus (craque.indice) qui est une preuve. Les innocents ont craque = null.
- 1 à 3 événements à heure fixe, annoncés dès l'intro ou par un témoin : un suspect part (suspect_absent) ou un lieu est nettoyé (lieu_perdu, et alors le lieu a un texte apres_evenement). Ils forcent des choix ; jamais ils ne rendent l'affaire impossible.
- À la fin, le joueur monte un dossier : le coupable, le mobile (parmi 4), l'occasion (un indice qui montre qu'il a pu le faire) et la preuve (un indice qui le fait condamner). Verdict : condamné (bon coupable et une des solution.preuves), relâché faute de preuves (bon coupable sans preuve), erreur judiciaire (innocent).
- Une partie peut se jouer à plusieurs (2 à 6 détectives privés) : la même affaire, chacun sa nuit ; le meilleur verdict gagne, puis le dossier signé le plus tôt.

Ce qui fait une bonne affaire :
- Une énigme loyale : un joueur attentif trouve le coupable et sa preuve avec les seuls éléments du jeu, sans deviner.
- Deux chemins vers la condamnation : une preuve matérielle trouvée en fouillant un lieu, ET une preuve obtenue par la parole (lapsus quand le coupable craque, réaction quand on lui montre une pièce, témoignage). Si un événement nettoie le lieu de la preuve, l'autre chemin reste ouvert.
- Les témoins indiquent où fouiller (« la fenêtre donne sur le quai ») : celui qui écoute va droit au bon lieu, celui qui fouille partout trouve aussi, mais plus tard.
- Peu d'indices, mais qui comptent : 4 lieux, dont au moins un qui ne donne rien (indice null, texte d'ambiance) et un qui donne une fausse piste. Environ 14 à 18 indices en tout.
- Chaque innocent a une fausse piste crédible (un mobile, un secret, un mensonge sans rapport avec le meurtre) qui s'explique si on creuse.
- 4 suspects, 6 à 8 questions par suspect en tout (ouvertures, relances, pistes), dont au moins une qui fâche.
- Réponses courtes (1 à 3 phrases), dans la voix du personnage, qui peut mentir, esquiver, menacer. Didascalies courtes et visuelles, seulement quand elles apportent quelque chose (un geste qui trahit, un détail).
- Le texte d'un indice tient en une ligne, factuel, sans conclusion (« Douille sous la fenêtre du bureau, sur le quai »). nature : piste, occasion, mobile, decisive (preuve), fausse-piste ou alibi.
- solution.preuves : 2 à 4 ids d'indices qui font condamner le coupable (au moins un trouvé en fouillant, un obtenu en interrogeant). solution.occasion : 1 ou 2 ids d'indices qui montrent qu'il a pu le faire. solution.une : gros titre de journal de 3 à 5 mots qui nomme le coupable. solution.recit : 4 à 6 phrases qui reconstituent le crime. solution.rate : une phrase sur le détail qui trahissait le coupable.
- Intro : 2 à 3 phrases sèches, qui annoncent les événements de la nuit. Accroche : une phrase courte et intrigante, la dernière image de la scène. cadre.heure : l'heure du crime, la même que horloge.debut (format « 2 h du matin » pour le cadre, « 02:00 » pour l'horloge).
- Ids courts en minuscules sans accents ni espaces (« ferrand », « ferrand-douille », « douille »).
- silhouette : un entier de 0 à 5 par suspect (0 homme au feutre, 1 femme aux cheveux longs, 2 homme trapu, 3 femme au chapeau, 4 homme maigre au col relevé, 5 homme au béret). Varie-les.
- visage : le portrait dessiné du suspect, façon affiche de film noir, assemblé à partir de pièces. Choisis-les pour que chaque suspect soit reconnaissable au premier coup d'œil et cohérent avec son rôle et son époque. Varie les chapeaux, coiffures et accessoires ; alterne le côté de l'ombre. rouge_levres seulement pour une femme ; barbe, moustache et monocle seulement pour un homme.
- decor : l'illustration du lieu, à prendre dans la liste (bureau, quai, bar, loge, chambre, cabine de bateau, compartiment de train, couloir, scène de spectacle, terrasse, piscine, salle radio ou standard, écurie, atelier ou salle des machines, coffre ou caisse, phare, piece pour une pièce quelconque). Le premier lieu est celui où l'on a trouvé la victime.
- journal : un nom de journal inventé et plausible pour la ville, la date du lendemain du crime, un prix d'époque.
- Pas de gore, pas de violence sexuelle. Le meurtre a déjà eu lieu ; on reste dans le registre du polar classique.

Varie les cadres : villes françaises ou étrangères, de 1920 à 1975 (port, palace, train de nuit, studio de cinéma, club de jazz, station de ski, paquebot, imprimerie, hippodrome…), et les façons de tuer et de mentir. Ne réutilise pas un cadre ou un ressort déjà utilisé.

Voici une affaire complète, au format attendu, pour la qualité et le ton :`;

export async function ecrireAffaire({ dejaEcrites }) {
  const client = new Anthropic();
  const demande = `${CONSIGNES}

${JSON.stringify(EXEMPLE, null, 1)}

Affaires déjà écrites (ne les répète pas, ni leur cadre ni leur ressort) :
${dejaEcrites.map((a) => `- ${a.titre} (${a.cadre})`).join("\n")}

Écris une nouvelle affaire, complète et cohérente.`;

  let messages = [{ role: "user", content: demande }];
  for (let essai = 1; essai <= 2; essai++) {
    const flux = client.beta.messages.stream({
      model: "claude-opus-5-5",
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA_PLAT } },
      messages,
    });
    const reponse = await flux.finalMessage();
    if (reponse.stop_reason === "refusal") throw new Error("Claude a refusé d'écrire l'affaire.");
    if (reponse.stop_reason === "max_tokens") throw new Error("Affaire coupée : limite de longueur atteinte.");

    const texte = reponse.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const affaire = deplier(JSON.parse(texte));
    const erreurs = verifier(affaire);
    if (erreurs.length === 0) return affaire;
    if (essai === 2) throw new Error(`Affaire incohérente : ${erreurs.join(" ; ")}`);

    messages = [
      ...messages,
      { role: "assistant", content: reponse.content },
      {
        role: "user",
        content: `Cette affaire a des problèmes de cohérence :\n- ${erreurs.join("\n- ")}\n\nCorrige-les et renvoie l'affaire complète.`,
      },
    ];
  }
}
