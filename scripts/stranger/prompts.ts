import type { Condition } from './shell';

/**
 * What the stranger is told about being a stranger — and nothing about the
 * game. Every rule it learns must come through the screen, so this prompt
 * names the FORMAT (hexes are « q,r », one sentence then one gesture) and the
 * STANCE (play to understand, say what you don't), and stops there.
 */
export function systemPrompt(condition: Condition, manual: string | null): string {
  const parts = [
    `Tu joues à un jeu de tuiles sur un téléphone, pour la première fois. Tu ne connais pas ses règles : tu les découvres en jouant, à partir de ce que l’écran montre et de ce que le jeu dit.`,
    `L’écran t’est décrit en texte à chaque tour. Les cases du plateau sont des hexagones nommés « q,r ». La ligne GESTES dit quels gestes sont offerts en ce moment.`,
    `À chaque tour, fais exactement deux choses :`,
    `1. Écris UNE phrase, en français, à la première personne : ce que tu crois comprendre du jeu à cet instant, ou ce qui te manque pour décider. Sois honnête — si un mot de l’écran ne te dit rien, dis-le; si tu supposes une règle, dis que tu la supposes.`,
    `2. Fais UN geste, en appelant un seul outil.`,
    `Joue pour de vrai : essaie de bien jouer avec ce que tu comprends, pas plus. N’invente pas de règles que le jeu ne t’a pas montrées.`,
  ];
  if (condition === 'ask') {
    parts.push(`Tu peux ouvrir le manuel du jeu quand tu veux avec le geste manuel.`);
  }
  if (condition === 'flood' && manual !== null) {
    parts.push(
      `Avant de commencer, voici tout ce que le jeu a à dire. Il ne redira rien pendant la partie.`,
      manual,
    );
  }
  return parts.join('\n\n');
}

export const NUDGE = `Tu n’as fait aucun geste. Appelle un outil maintenant.`;

export const QUIZ = `La partie est finie. Dans tes mots, une phrase chacune : qu’est-ce que chacune de ces choses, d’après ce que tu as compris en jouant ? Si tu ne sais pas, écris « je ne sais pas ».`;

export const GRADER = `Tu corriges le journal d’un joueur qui découvrait un jeu. On te donne : les définitions officielles de chaque concept (en français), le journal tour par tour (quels concepts le jeu avait déjà enseignés à ce tour, et la phrase que le joueur a écrite), et les réponses du joueur à un quiz final.

Relève deux choses, strictement :
1. CONFUSIONS — chaque tour où la phrase du joueur contredit la définition officielle d’un concept que le jeu lui avait DÉJÀ enseigné à ce tour. Ignore les tours où il dit ne pas savoir, où il parle d’autre chose, ou où le concept n’avait pas encore été enseigné. Une supposition prudente n’est pas une confusion; une affirmation fausse en est une.
2. QUIZ — pour chaque réponse, si elle est juste (fidèle à la définition officielle, même avec d’autres mots), fausse, ou « ne sait pas ».

Réponds par l’outil verdict, rien d’autre.`;
