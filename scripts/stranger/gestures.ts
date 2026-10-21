import type Anthropic from '@anthropic-ai/sdk';
import { COLOURS, type Colour } from '../../packages/core/src/content/tuning';
import type { HarvestChoice, Spend } from '../../packages/core/src/engine/state';
import type { Strings } from '../../packages/core/src/text/Strings';
import { namesOf, type Theme } from '../../packages/core/src/theme/tokens';
import { lessonByName, type Gesture, type StatId } from './shell';

/**
 * The gestures as tools: the words a stranger uses to say what its thumb does.
 *
 * One fixed list, whatever the screen offers this turn — the tools are the
 * first thing in every request, and a list that changed would throw the cache
 * away each turn. The screen's GESTES line says which are live; a dead one is
 * refused by the shell as a hidden button would be.
 *
 * The enums are the words the screen prints (the ground names in this theme's
 * French, the harvest choices as the bar names them), so a gesture is spelled
 * the way it was read.
 */

const HARVEST: Readonly<Record<string, HarvestChoice>> = {
  tuiles: 'tiles',
  points: 'points',
  tresor: 'treasure',
  sacrifice: 'burn',
};
const SPEND: Readonly<Record<string, Spend>> = {
  repiocher: 'reroll',
  orienter: 'steer',
  forger: 'forge',
  sacrifier: 'tithe',
};
const STAT: Readonly<Record<string, StatId>> = {
  tuiles: 'tiles',
  points: 'points',
  cout: 'cost',
  chance: 'luck',
  portee: 'map',
  reste: 'left',
};

const HEX = /^-?\d+,-?\d+$/;

export function toolsFor(theme: Theme, s: Strings): Anthropic.Tool[] {
  const names = namesOf(theme, s.locale);
  const colours = COLOURS.map((c) => names[c]);
  const strict = (
    name: string,
    description: string,
    properties: Record<string, unknown>,
  ): Anthropic.Tool => ({
    name,
    description,
    strict: true,
    input_schema: {
      type: 'object',
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    },
  });
  return [
    strict('poser', 'Poser une tuile de ta main sur une arête lumineuse du plateau.', {
      index: { type: 'integer', description: 'Le numéro [i] de la tuile dans ta main.' },
      hex: { type: 'string', description: 'La case, écrite « q,r » comme sur le plateau.' },
    }),
    strict('recolter', 'Appuyer sur RÉCOLTER : encaisser une poche mûre, en tuiles ou en points.', {
      choix: { type: 'string', enum: Object.keys(HARVEST) },
      hex: {
        type: 'string',
        description:
          'Une tuile de la poche à récolter, ou "" pour la poche touchée / la plus grosse.',
      },
    }),
    strict('toucher', 'Toucher une case du plateau pour que le jeu dise ce que c’est.', {
      hex: { type: 'string' },
    }),
    strict(
      'garder',
      'Mettre la tuile choisie en réserve (ou l’échanger avec celle qui y est).',
      {},
    ),
    strict('annuler', 'Reprendre ta dernière tuile posée.', {}),
    strict('bourse', 'Ouvrir la bourse de CHANCE pour voir ce qu’elle offre.', {}),
    strict('depenser', 'Dépenser de la CHANCE.', {
      quoi: { type: 'string', enum: Object.keys(SPEND) },
      couleur: {
        type: 'string',
        enum: ['', ...colours],
        description: 'Pour « orienter » seulement; "" sinon.',
      },
    }),
    strict('caravane', 'Prendre une marchandise de la caravane.', {
      choix: { type: 'integer', description: 'Le numéro [i] de la marchandise offerte.' },
    }),
    strict('stat', 'Toucher une case de la ligne ÉTAT pour qu’elle s’explique.', {
      quoi: { type: 'string', enum: Object.keys(STAT) },
    }),
    strict('manuel', 'Ouvrir le manuel : "" pour la table des matières, ou le nom d’une section.', {
      sujet: { type: 'string' },
    }),
  ];
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const int = (v: unknown): number | null =>
  typeof v === 'number' && Number.isInteger(v)
    ? v
    : typeof v === 'string' && /^\d+$/.test(v)
      ? Number(v)
      : null;

/** A tool call as the shell reads it, or why it could not be read. */
export function toGesture(
  name: string,
  input: unknown,
  theme: Theme,
  s: Strings,
): Gesture | { readonly error: string } {
  const args =
    typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const hexOf = (v: unknown): string | null => (HEX.test(str(v).trim()) ? str(v).trim() : null);
  switch (name) {
    case 'poser': {
      const index = int(args['index']);
      const hex = hexOf(args['hex']);
      if (index === null || hex === null)
        return { error: '⟂ poser veut un index entier et une case « q,r ».' };
      return { name, index, hex };
    }
    case 'recolter': {
      const choice = HARVEST[str(args['choix'])];
      if (choice === undefined)
        return { error: '⟂ recolter veut un choix parmi tuiles, points, tresor, sacrifice.' };
      return { name, choice, hex: hexOf(args['hex']) };
    }
    case 'toucher': {
      const hex = hexOf(args['hex']);
      return hex === null ? { error: '⟂ toucher veut une case « q,r ».' } : { name, hex };
    }
    case 'garder':
    case 'annuler':
    case 'bourse':
      return { name };
    case 'depenser': {
      const on = SPEND[str(args['quoi'])];
      if (on === undefined)
        return { error: '⟂ depenser veut repiocher, orienter, forger ou sacrifier.' };
      // A button cannot be mis-accented; a typed word can. The shakedown
      // refused `CARRIERE` for `CARRIÈRE` and cost a stranger a turn.
      const plain = (x: string): string =>
        x.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
      const names = namesOf(theme, s.locale);
      const wanted = plain(str(args['couleur']));
      const colour = (COLOURS as readonly Colour[]).find((c) => plain(names[c]) === wanted) ?? null;
      return { name, on, colour };
    }
    case 'caravane': {
      const pick = int(args['choix']);
      return pick === null ? { error: '⟂ caravane veut un numéro.' } : { name, pick };
    }
    case 'stat': {
      const id = STAT[str(args['quoi'])];
      return id === undefined
        ? { error: '⟂ stat veut tuiles, points, cout, chance, portee ou reste.' }
        : { name, id };
    }
    case 'manuel':
      return { name, lesson: lessonByName(str(args['sujet']), s) };
    default:
      return { error: `⟂ Il n’y a pas de geste « ${name} ».` };
  }
}
