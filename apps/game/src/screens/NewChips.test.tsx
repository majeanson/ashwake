import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { stringsFor } from '@text/index';
import { NewChips } from './NewChips';

/**
 * The NEW chips (2026-10-12). Which chips show, and when, is
 * `shell/teaching#newDots` and is tested there; this is what a chip is.
 */
describe('the NEW chips', () => {
  const en = stringsFor('en');
  const fr = stringsFor('fr-CA');

  it('draws nothing when nothing is on offer', () => {
    const { container } = render(<NewChips ids={[]} s={en} onOpen={() => undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('names each lesson by its own name, and opens the one that is tapped', async () => {
    const onOpen = vi.fn();
    render(<NewChips ids={['rare', 'shrine']} s={en} onOpen={onOpen} />);
    const chips = screen.getAllByRole('button');
    expect(chips).toHaveLength(2);
    expect(chips[0]?.getAttribute('data-new-chip')).toBe('rare');
    // The accessible name carries NEW and the lesson, so a screen reader hears an offer.
    expect(chips[1]?.getAttribute('aria-label')).toBe(`${en.ui.newChip}: ${en.lesson.shrine.name}`);
    await userEvent.click(chips[1]!);
    expect(onOpen).toHaveBeenCalledWith('shrine');
  });

  it('speaks French', () => {
    render(<NewChips ids={['territory']} s={fr} onOpen={() => undefined} />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toBe(
      `${fr.ui.newChip}: ${fr.lesson.territory.name}`,
    );
  });
});
