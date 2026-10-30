// Fait écrire une nouvelle affaire par Claude, au format plat imposé par
// SCHEMA_PLAT, puis vérifie sa cohérence. Une seconde tentative reçoit la
// liste des problèmes trouvés à la première.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { aplatir, deplier, SCHEMA_PLAT, verifier } from "./affaire.mjs";

const EXEMPLE = aplatir(JSON.parse(readFileSync(new URL("../affaires/01-vieux-port.json", import.meta.url), "utf8")));

const CONSIGNES = `Tu écris des affaires pour « Enquête », un jeu d'enquête policière sur téléphone, en français, dans l'ambiance des films noirs et des vieux polars (Sin City, Melville, Simenon, Chandler).

Comment on joue : le joueur lit la scène de crime, interroge les suspects en choisissant des questions dans une liste, fouille des lieux, épingle les indices trouvés, puis accuse un suspect en choisissant un mobile et UNE preuve parmi ses indices. Il n'a que 15 questions et 3 fouilles pour toute l'affaire : il ne pourra pas tout voir, il doit choisir. Une partie peut se jouer en duel : deux joueurs, la même affaire, chacun de son côté.

Ce qui fait une bonne affaire :
- Une énigme loyale : un joueur attentif peut trouver le coupable avec les seuls indices du jeu, sans deviner. Le coupable est trahi par une contradiction ou un détail précis (un lapsus, un alibi qui ne tient pas, un objet qu'il ne devrait pas avoir), idéalement révélé par une question « Montrer … » débloquée par un indice.
- Chaque innocent a une fausse piste crédible (un mobile, un secret, un mensonge sans rapport avec le meurtre) qui s'explique si on creuse.
- 4 suspects, 4 lieux à fouiller, 6 à 8 questions par suspect, dont 1 ou 2 questions « Montrer … » (champ requiert = id d'un indice). Environ 14 à 18 indices au total.
- Les questions sans requiert ne doivent pas révéler à elles seules ce qu'un indice devrait apprendre.
- Réponses courtes (1 à 3 phrases), dans la voix du personnage, qui peut mentir, esquiver, menacer. Didascalies courtes et visuelles, seulement quand elles apportent quelque chose (un geste qui trahit, un détail).
- Le texte d'un indice tient en une ligne, factuel, sans conclusion (« Douille de 7.65 sur le quai, sous la fenêtre »).
- 4 mobiles proposés, un seul vrai, les autres correspondant aux fausses pistes.
- solution.preuves : 3 ou 4 ids d'indices qui accusent vraiment le coupable. solution.une : gros titre de journal de 3 à 5 mots qui nomme le coupable (« L'inspecteur Ferrand arrêté »). solution.recit : 4 à 6 phrases qui reconstituent le crime. solution.rate : une phrase sur le détail qui trahissait le coupable.
- Intro : 2 à 3 phrases sèches. Accroche : une phrase courte et intrigante, la dernière image de la scène.
- Ids courts en minuscules sans accents ni espaces (« ferrand », « ferrand-douille », « douille »).
- silhouette : un entier de 0 à 5 par suspect (0 homme au feutre, 1 femme aux cheveux longs, 2 homme trapu, 3 femme au chapeau, 4 homme maigre au col relevé, 5 homme au béret). Varie-les.
- visage : le portrait dessiné du suspect, façon affiche de film noir, assemblé à partir de pièces. Choisis-les pour que chaque suspect soit reconnaissable au premier coup d'œil et cohérent avec son rôle et son époque (un inspecteur au feutre et à l'imper, une veuve à voilette, un barman au gilet et nœud papillon…). Varie les chapeaux, coiffures et accessoires entre les suspects ; alterne le côté de l'ombre. rouge_levres seulement pour une femme ; barbe, moustache et monocle seulement pour un homme.
- decor : l'illustration du lieu, à prendre dans la liste (bureau, quai, bar, loge, chambre, cabine de bateau, compartiment de train, couloir, scène de spectacle, terrasse, piscine, salle radio ou standard, écurie, atelier ou salle des machines, coffre ou caisse, phare, piece pour une pièce quelconque). Le premier lieu est celui où l'on a trouvé la victime : son décor sert d'image d'ouverture.
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
