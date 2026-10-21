import { harvestValue, ripeClusters, scoreOf } from '../../packages/core/src/engine/rules';
import { labelFor } from '../../packages/core/src/render/labels';
import type { CellView } from '../../packages/core/src/render/Renderer';
import type { Strings } from '../../packages/core/src/text/Strings';
import { namesOf, type Theme } from '../../packages/core/src/theme/tokens';
import { lessonName, lessonOf } from '../../packages/core/src/view/lessons';
import { controls, offered, speaksFirst, type Said, type Snapshot, type Table } from './shell';

/**
 * The phone, as text.
 *
 * Everything on it is a fact the core already computes for the screen —
 * `HudView`, `CellView`, the pockets and their prices — printed in the words
 * the screen uses (`s.ui.stats`, the ground names, the lesson names). What it
 * cannot carry is stated in the report: the glow on a legal edge becomes a
 * list, the ripe ring becomes an asterisk, a lit cue becomes nothing.
 *
 * Hexes are named `q,r`, which is `HexKey` itself, so a gesture can say the
 * same thing the screen said.
 */

const SAID_LABEL: Readonly<Record<Said['kind'], string>> = {
  card: 'CARTE',
  toast: 'LIGNE',
  coach: 'LIGNE',
  once: 'LIGNE',
  receipt: 'REÇU',
  answer: 'RÉPONSE',
  refused: 'REFUS',
  manual: 'MANUEL',
  end: 'FIN',
};

export const saidLines = (said: readonly Said[]): string =>
  said.map((x) => `[${SAID_LABEL[x.kind]}] ${x.text}`).join('\n');

const rarityMark = (rarity: CellView['rarity'] | undefined, s: Strings): string =>
  rarity === 'magic'
    ? ` ${s.lesson.magic.row.magic.name}`
    : rarity === 'unique'
      ? ` ${s.lesson.magic.row.unique.name}`
      : '';

const landmarkName = (kind: NonNullable<CellView['landmark']>, s: Strings): string =>
  s.lesson.map.row[kind].name;

/** The short syntax of each gesture, for the GESTES line. */
const GESTURE_SYNTAX: Readonly<Record<ReturnType<typeof offered>[number], string>> = {
  poser: 'poser(index, hex)',
  recolter: 'recolter(hex)',
  toucher: 'toucher(hex)',
  garder: 'garder()',
  annuler: 'annuler()',
  bourse: 'bourse()',
  depenser: 'depenser(quoi, couleur)',
  caravane: 'caravane(choix)',
  stat: 'stat(quoi)',
  manuel: 'manuel(sujet)',
};

export function renderScreen(table: Table, snap: Snapshot, s: Strings, theme: Theme): string {
  const { hud, board } = snap;
  const c = controls(table.progress);
  const names = namesOf(theme, s.locale);
  const name = (colour: NonNullable<CellView['colour']>): string => names[colour];
  const lines: string[] = [];

  // The stat row, the controls the first run has revealed only.
  const stats = [`${s.ui.stats.tiles} ${hud.tiles}`];
  if (hud.showPoints) stats.push(`${s.ui.stats.points} ${hud.points}`);
  if (c.cost) stats.push(`${s.ui.stats.cost} ${hud.cost}`);
  if (c.purse && hud.spends.length > 0) stats.push(`${s.lesson.luck.name} ${hud.luck}`);
  if (c.reach) stats.push(`${s.ui.stats.map} ${hud.depthValue}`);
  if (hud.left !== null) stats.push(`${s.ui.stats.left} ${hud.left}`);
  lines.push(`ÉTAT — ${stats.join(' · ')}`);
  if (hud.hint !== null && speaksFirst(table.condition)) lines.push(`(${hud.hint})`);

  // The hand, and the stash once it is shown.
  const hand = hud.draft.map(
    (tile, i) =>
      `[${i}] ${name(tile.colour)}${rarityMark(tile.rarity, s)}${tile.selected ? ' (choisie)' : ''}`,
  );
  lines.push(`MAIN — ${hand.length === 0 ? 'vide' : hand.join(' · ')}`);
  if (c.hold && hud.holdSlots > 0) {
    const held = hud.held.map((h) => `${name(h.colour)}${rarityMark(h.rarity, s)}`);
    lines.push(
      `${lessonName(lessonOf('stash')!, s)} — ${held.length === 0 ? 'vide' : held.join(' · ')}`,
    );
  }

  // The board: what is built, what the ground remembers, where the glow is.
  const tiles: string[] = [];
  const stone: string[] = [];
  const walls: string[] = [];
  const native: string[] = [];
  const places: string[] = [];
  const beacons: string[] = [];
  const shimmers: string[] = [];
  const legal: string[] = [];
  for (const cell of board.cells) {
    if (cell.beacon) {
      beacons.push(
        cell.landmark === null ? cell.key : `${cell.key} ${landmarkName(cell.landmark, s)}`,
      );
      continue;
    }
    if (cell.shimmer) {
      shimmers.push(cell.key);
      continue;
    }
    if (cell.remembered) continue;
    // THE NUMBER ON A HEX IS `labelFor`'S (2026-10-21): a worth only once the
    // tile is ripe, a preview only where it is above zero, both rounded. Nine
    // runs were played with every tile's worth printed every turn — a number
    // the phone never shows — and their readers watched "the value rise" at
    // placement 3. The board is the rule; the tap still says any tile's worth.
    const label = labelFor(cell);
    switch (cell.kind) {
      case 'tile':
        if (cell.colour !== null) {
          const worth = cell.ripe && label?.text !== undefined ? `(${label.text})` : '';
          tiles.push(
            `${cell.key} ${name(cell.colour)}${rarityMark(cell.rarity, s)}${worth}${cell.ripe ? '*' : ''}${cell.home ? ' départ' : ''}`,
          );
        }
        break;
      case 'stone':
        stone.push(cell.key);
        break;
      case 'wall':
        walls.push(cell.key);
        break;
      case 'landmark':
        if (cell.landmark !== null) {
          places.push(
            `${cell.key} ${landmarkName(cell.landmark, s)}${cell.claimed ? ' (atteinte)' : ''}`,
          );
        }
        break;
      case 'empty':
        if (cell.native !== null) native.push(`${cell.key} ${name(cell.native)}`);
        break;
    }
    if (cell.legal) {
      legal.push(
        label?.text !== undefined && label.faint ? `${cell.key}(+${label.text})` : cell.key,
      );
    }
  }
  lines.push(
    `PLATEAU — ${board.cells.length} cases. Une tuile s’écrit « q,r couleur »; mûre, elle montre sa valeur : « q,r couleur(valeur)* ».`,
  );
  lines.push(`  tuiles : ${tiles.length === 0 ? 'aucune' : tiles.join(' · ')}`);
  if (stone.length > 0) lines.push(`  ${s.lesson.pop.row.stone.name} : ${stone.join(' · ')}`);
  if (walls.length > 0) lines.push(`  ${s.lesson.expedition.row.wall.name} : ${walls.join(' · ')}`);
  if (native.length > 0) lines.push(`  sol natif : ${native.join(' · ')}`);
  if (places.length > 0) lines.push(`  sur la carte : ${places.join(' · ')}`);
  if (beacons.length > 0) lines.push(`  lueurs au loin (hors plateau) : ${beacons.join(' · ')}`);
  if (shimmers.length > 0) lines.push(`  quelque chose brille : ${shimmers.join(' · ')}`);
  lines.push(
    `  arêtes lumineuses (poses possibles; entre parenthèses, la valeur que la tuile choisie y prendrait, quand elle en a une) : ${legal.length === 0 ? 'aucune' : legal.join(' · ')}`,
  );

  // The pockets, each priced as the harvest bar prices the tapped one: under
  // the single payout, ONE button pays tiles and the scaled points together
  // (`HudView.harvestPoints` is `scoreOf`); the fork exists only off it.
  const pockets = ripeClusters(table.state.cells);
  if (pockets.length > 0) {
    const t = table.state.tuning;
    const pocketLines = pockets.map((pocket) => {
      const value = harvestValue(table.state, pocket[0]);
      const tapped = table.asked !== null && pocket.includes(table.asked);
      const pays = hud.singlePayout
        ? `${lessonName(lessonOf('pop')!, s)} : +${value.tiles} ${s.ui.stats.tiles} et +${scoreOf(value.points, t)} ${s.ui.stats.points}`
        : `en ${s.ui.stats.tiles} +${value.tiles} ou en ${s.ui.stats.points} +${scoreOf(value.points, t)}`;
      return `${pocket.length} tuile(s) [${pocket.join(' ')}] → ${pays}${tapped ? ' (touchée)' : ''}`;
    });
    lines.push(`POCHES MÛRES —\n  ${pocketLines.join('\n  ')}`);
  }

  // The caravan: its ask line once the first run shows it (`reveal`), and the
  // picker — three wares to choose from — whenever an offer waits, on any run.
  const offer =
    hud.offer === null
      ? null
      : `${s.caravan.open(hud.offersWaiting)} ${hud.offer.map((w, i) => `[${i}] ${s.caravan.ware[w].name} (${s.caravan.ware[w].note})`).join(' · ')}`;
  const ask = c.caravan && hud.caravan !== null ? s.caravan[hud.caravan] : null;
  if (ask !== null || offer !== null) {
    lines.push(
      `${lessonName(lessonOf('caravan')!, s)} — ${[ask, offer].filter((x) => x !== null).join(' · ')}`,
    );
  }

  if (hud.ended) {
    lines.push('LA PARTIE EST FINIE.');
  } else {
    lines.push(
      `GESTES — ${offered(table, snap)
        .map((g) => GESTURE_SYNTAX[g])
        .join(' · ')}`,
    );
  }
  return lines.join('\n');
}
