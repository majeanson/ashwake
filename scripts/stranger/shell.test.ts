import { describe, expect, it } from 'vitest';
import { TUNING } from '../../packages/core/src/content/tuning';
import { hasMet } from '../../packages/core/src/meta/progress';
import { policyByName } from '../../packages/core/src/sim/policy';
import { playMany } from '../../packages/core/src/sim/run';
import { stringsFor } from '../../packages/core/src/text/index';
import { SETTLEMENT } from '../../packages/core/src/theme/themes/settlement';
import { toGesture, toolsFor } from './gestures';
import { playStranger, scripted } from './run';
import { renderScreen } from './screen';
import { apply, begin, CONDITIONS, newTable, offered, snapshot } from './shell';

const s = stringsFor('fr-CA');
const theme = SETTLEMENT;

describe('the table', () => {
  it('plays a fresh phone’s first run: the default economy, nothing earned', () => {
    expect(newTable('drip', 1).state.tuning).toEqual(TUNING);
  });

  it('opens on the story, the goal and the walk’s first line, said once each — or on nothing', () => {
    const drip = begin(newTable('drip', 1), s, theme);
    // The two SaidCards chain on the first frame; `place` is the toast behind them.
    expect(drip.said.map((x) => `${x.kind}:${x.text.split(' — ')[0]!.slice(0, 20)}`)).toEqual([
      `card:${s.ui.theStory}`,
      `card:${s.ui.theGoal}`,
      `toast:${s.coach.place.slice(0, 20)}`,
    ]);
    // ...and neither the goal nor the expedition is said again on the next beat.
    const legal = snapshot(drip.table, s).board.cells.find((c) => c.legal)!;
    const placed = apply(drip.table, { name: 'poser', index: 0, hex: legal.key }, s, theme);
    expect(placed.said.filter((x) => x.kind === 'card')).toEqual([]);
    expect(placed.said.map((x) => x.kind)).toEqual(['coach']);

    const flood = begin(newTable('flood', 1), s, theme);
    expect(flood.said.map((x) => x.kind)).toEqual(['card', 'card', 'manual']);
    expect(flood.said[2]!.text).toContain(s.lesson.pop.name);

    // A silent table says nothing — and its ledger has still walked the same
    // beats, so the first run reveals its controls on the phone's schedule.
    const silent = begin(newTable('silent', 1), s, theme);
    expect(silent.said).toEqual([]);
    expect(silent.table.progress.met).toEqual(drip.table.progress.met);
    expect(flood.table.progress.met).toEqual(drip.table.progress.met);
  });

  it('keeps the first run’s hidden controls off the GESTES line', () => {
    const t = newTable('drip', 1);
    const live = offered(t, snapshot(t, s));
    expect(live).toContain('poser');
    expect(live).not.toContain('bourse');
    expect(live).not.toContain('garder');
    expect(live).not.toContain('manuel');
    expect(offered(newTable('ask', 1), snapshot(newTable('ask', 1), s))).toContain('manuel');
  });

  it('refuses a placement while the walk waits for a pop, in the coach’s words', () => {
    // Place blindly up to the first ripe pocket.
    let turn = begin(newTable('drip', 1), s, theme);
    let snap = snapshot(turn.table, s);
    for (let i = 0; i < 200 && !snap.hud.canHarvest; i++) {
      const legal = snap.board.cells.find((c) => c.legal);
      if (legal === undefined) break;
      turn = apply(turn.table, { name: 'poser', index: 0, hex: legal.key }, s, theme);
      snap = snapshot(turn.table, s);
    }
    expect(snap.hud.canHarvest).toBe(true);
    const legal = snap.board.cells.find((c) => c.legal)!;
    const refused = apply(turn.table, { name: 'poser', index: 0, hex: legal.key }, s, theme);
    expect(refused.said).toEqual([{ kind: 'refused', text: s.coach.popFirst }]);
    expect(refused.table.state).toBe(turn.table.state);

    // The pop lands, the walk ends, and the receipt is the harvest note.
    const popped = apply(turn.table, { name: 'recolter', choice: 'tiles', hex: null }, s, theme);
    expect(popped.said[0]!.kind).toBe('receipt');
    expect(hasMet(popped.table.progress, 'walked')).toBe(true);
  });
});

describe('the screen', () => {
  it('prints the stats, the hand, the board and the gestures in the catalogue’s words', () => {
    const t = newTable('drip', 1);
    const text = renderScreen(t, snapshot(t, s), s, theme);
    expect(text).toContain(`ÉTAT — ${s.ui.stats.tiles} ${TUNING.startingTiles}`);
    expect(text).toContain('MAIN — [0]');
    expect(text).toContain('arêtes lumineuses');
    expect(text).toContain('GESTES — poser(index, hex)');
    // The cost is a tour-phase control: not on a fresh screen.
    expect(text).not.toContain(s.ui.stats.cost);
  });
});

describe('the gestures', () => {
  it('read a tool call back in the screen’s own words, and say why when they cannot', () => {
    expect(toGesture('poser', { index: 1, hex: '0,1' }, theme, s)).toEqual({
      name: 'poser',
      index: 1,
      hex: '0,1',
    });
    expect(toGesture('recolter', { choix: 'points', hex: '' }, theme, s)).toEqual({
      name: 'recolter',
      choice: 'points',
      hex: null,
    });
    expect(toGesture('poser', { index: 'a', hex: 'x' }, theme, s)).toHaveProperty('error');
    expect(toGesture('voler', {}, theme, s)).toHaveProperty('error');
    expect(toolsFor(theme, s).map((t) => t.name)).toContain('manuel');
  });
});

describe('a scripted player through the shell', () => {
  it.each(CONDITIONS)(
    '%s: bank20 plays to the end and is refused nothing legal',
    async (condition) => {
      const policy = policyByName('bank20')!;
      const run = await playStranger(condition, 1, scripted(policy, 1, s), s, theme);
      expect(run.result.outcome).toBe('died');
      expect(run.turns.filter((t) => t.gesture === null).map((t) => t.trouble)).toEqual([]);
      expect(run.turns.flatMap((t) => t.said.filter((x) => x.kind === 'refused'))).toEqual([]);
      expect(run.result.placements).toBeGreaterThan(10);
      expect(run.result.harvests).toBeGreaterThan(0);
      // A walked run is not the sim's run — the gate forces the first pop — but the
      // gate is the only difference: the sim's own number is the same game.
      const [direct] = playMany(policy, 1, { tuning: TUNING });
      expect(direct!.outcome).toBe('died');
    },
  );
});
