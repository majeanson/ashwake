import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { Confirming } from './Confirming';
import { DialogStack, useDoor } from './dialog';
import { Panel, PanelMenu } from './Panel';
import { Tabs } from './Tabs';

/**
 * The primitives, held to the accessibility rules Ashwake 1 paid for in a
 * second audit pass. None of these is re-earned here; every one is inherited.
 */

function Door({ onOpen }: { readonly onOpen?: () => void }) {
  const door = useDoor('worlds');
  return (
    <>
      <button
        type="button"
        onClick={() => {
          door.show();
          onOpen?.();
        }}
      >
        WORLDS
      </button>
      {door.open && (
        <Panel id="worlds" title="WORLDS" back="BACK" closeAll="CLOSE ALL" onBack={door.hide}>
          <PanelMenu>
            <button type="button">WORLD 1</button>
          </PanelMenu>
        </Panel>
      )}
    </>
  );
}

const withStack = (node: React.ReactNode) => render(<DialogStack>{node}</DialogStack>);

describe('a panel', () => {
  it('opens, names itself, and closes on BACK', async () => {
    withStack(<Door />);
    await userEvent.click(screen.getByRole('button', { name: 'WORLDS' }));

    const panel = screen.getByRole('dialog', { name: 'WORLDS' });
    expect(panel).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'BACK' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape', async () => {
    withStack(<Door />);
    await userEvent.click(screen.getByRole('button', { name: 'WORLDS' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('gives focus back to whoever opened it', async () => {
    withStack(<Door />);
    const opener = screen.getByRole('button', { name: 'WORLDS' });
    opener.focus();
    await userEvent.click(opener);
    await userEvent.click(screen.getByRole('button', { name: 'BACK' }));
    // A panel that closes and drops focus to <body> loses a keyboard user
    // their place entirely.
    expect(document.activeElement).toBe(opener);
  });

  it('is a modal dialog, so what is behind it is not reachable', async () => {
    withStack(<Door />);
    await userEvent.click(screen.getByRole('button', { name: 'WORLDS' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});

describe('a two-tap control', () => {
  it('states the consequence before it does anything', async () => {
    const onConfirm = vi.fn();
    render(<Confirming label="RESET ALL" armed="ERASE EVERYTHING?" onConfirm={onConfirm} />);

    const button = screen.getByRole('button', { name: 'RESET ALL' });
    await userEvent.click(button);

    // The label IS the question — which is also the accessible name, so a
    // screen reader hears the consequence at the moment it is meant.
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'ERASE EVERYTHING?' })).toHaveClass('armed');

    await userEvent.click(screen.getByRole('button', { name: 'ERASE EVERYTHING?' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disarms when the hand goes somewhere else', async () => {
    const onConfirm = vi.fn();
    render(
      <>
        <Confirming label="RESET ALL" armed="ERASE EVERYTHING?" onConfirm={onConfirm} />
        <button type="button">SOMETHING ELSE</button>
      </>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'RESET ALL' }));
    await userEvent.click(screen.getByRole('button', { name: 'SOMETHING ELSE' }));

    // An armed button left sitting is a trap for the next tap.
    expect(screen.getByRole('button', { name: 'RESET ALL' })).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('goes quiet on its own', async () => {
    // Real timers with a short hold: the state change comes from a setTimeout
    // inside React, and `findBy` waits for the render rather than assuming it
    // has already happened.
    const onConfirm = vi.fn();
    render(
      <Confirming label="NEW WORLD" armed="ABANDON THIS ONE?" onConfirm={onConfirm} holdMs={40} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'NEW WORLD' }));
    expect(await screen.findByRole('button', { name: 'NEW WORLD' })).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('tabs', () => {
  it('says which one is on, and switches', async () => {
    function Manual() {
      const [on, setOn] = useState<'start' | 'play'>('start');
      return (
        <Tabs
          base="manual"
          growsNote="more to come"
          label="THE MANUAL"
          tabs={[
            { id: 'start', label: 'START' },
            { id: 'play', label: 'PLAY' },
          ]}
          on={on}
          onPick={setOn}
        />
      );
    }
    render(<Manual />);

    expect(screen.getByRole('tab', { name: 'START' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'PLAY' }));
    expect(screen.getByRole('tab', { name: 'PLAY' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'START' })).toHaveAttribute('aria-selected', 'false');
  });

  /*
   * The three promises `role="tablist"` makes, which it kept none of until
   * 2026-09-02. Pinned here rather than described in a docblock, because a
   * role is a claim about behaviour and a claim about behaviour is a test.
   */
  it('is one tab stop, and the arrows move it', async () => {
    function Manual() {
      const [on, setOn] = useState<'start' | 'play' | 'hand'>('start');
      return (
        <Tabs
          base="manual"
          growsNote="more to come"
          label="THE MANUAL"
          tabs={[
            { id: 'start', label: 'START' },
            { id: 'play', label: 'PLAY' },
            { id: 'hand', label: 'HAND' },
          ]}
          on={on}
          onPick={setOn}
        />
      );
    }
    render(<Manual />);

    // A roving tabindex: Tab reaches the row once and then leaves it, rather
    // than walking across every tab before it can reach the panel.
    expect(screen.getByRole('tab', { name: 'START' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'PLAY' })).toHaveAttribute('tabindex', '-1');

    screen.getByRole('tab', { name: 'START' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'PLAY' })).toHaveAttribute('aria-selected', 'true');
    // The focus goes with the selection, or the next arrow press does nothing.
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'PLAY' }));

    // A ring, not a line.
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'HAND' })).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'START' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'HAND' })).toHaveAttribute('aria-selected', 'true');
  });

  it('names the region it controls, and only where that region exists', () => {
    render(
      <Tabs
        base="fame"
        growsNote="more to come"
        label="FAME"
        tabs={[
          { id: 'diary', label: 'DIARY' },
          { id: 'totals', label: 'TOTALS' },
        ]}
        on="diary"
        onPick={() => {}}
      />,
    );
    // One panel element is reused and carries the id of whatever is showing
    // (see `Panel`'s `tabbed`), so a second `aria-controls` would point at
    // nothing — which is worse than none.
    expect(screen.getByRole('tab', { name: 'DIARY' })).toHaveAttribute(
      'aria-controls',
      'fame-tabpanel-diary',
    );
    expect(screen.getByRole('tab', { name: 'TOTALS' })).not.toHaveAttribute('aria-controls');
  });
});
