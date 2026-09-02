import { describe, expect, it } from 'vitest';
import { runningDry } from './dry';

/**
 * The running-dry warning.
 *
 * The thing that has to be right is the HYSTERESIS. A bare threshold would
 * fire, clear and fire again across a single pop-and-place, and a warning that
 * cries every other tap is one a player stops hearing — which is worse than
 * the silence this feature spent four stages in.
 */
describe('running dry', () => {
  it('arms when the purse sinks toward the next cost', () => {
    expect(runningDry({ tiles: 6, cost: 5, warned: false })).toBe(true);
    expect(runningDry({ tiles: 20, cost: 5, warned: false })).toBe(false);
  });

  it('does not chatter across one pop and one placement', () => {
    // Armed at 6 tiles against a cost of 5.
    let warned = runningDry({ tiles: 6, cost: 5, warned: false });
    expect(warned).toBe(true);
    // A pop pays 4. That is a recovery, but not a real one: still under the
    // clear line, so the warning stands rather than re-arming later.
    warned = runningDry({ tiles: 10, cost: 5, warned });
    expect(warned).toBe(true);
    // A real recovery clears it.
    warned = runningDry({ tiles: 12, cost: 5, warned });
    expect(warned).toBe(false);
    // And it can arm again once the purse falls back.
    expect(runningDry({ tiles: 6, cost: 5, warned })).toBe(true);
  });

  it('stays silent on an empty purse', () => {
    // The run is over and the ending has its own voice. A sting on top of it
    // would be the game mourning twice.
    expect(runningDry({ tiles: 0, cost: 5, warned: false })).toBe(false);
  });

  it('follows the cost curve up, not a fixed number of tiles', () => {
    // 9 tiles is comfortable early and dry late — which is the whole reason
    // this reads `cost` rather than a constant.
    expect(runningDry({ tiles: 9, cost: 1, warned: false })).toBe(false);
    expect(runningDry({ tiles: 9, cost: 8, warned: false })).toBe(true);
  });
});
