import { describe, expect, it } from 'vitest';
import { isFramed } from './embedded';

describe('isFramed', () => {
  it('is false for a top-level page', () => {
    const me = {};
    expect(isFramed({ self: me, top: me })).toBe(false);
  });

  it('is true when the top window is somebody else', () => {
    expect(isFramed({ self: {}, top: {} })).toBe(true);
  });

  it('is true when reading the top window throws', () => {
    const win = {
      self: {},
      get top(): unknown {
        throw new Error('blocked');
      },
    };
    expect(isFramed(win)).toBe(true);
  });
});
