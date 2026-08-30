import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * The dialog stack (Stage 3, 2026-08-29).
 *
 * Ashwake 1's `dialog.ts` was a real stack with real reasons, and every one of
 * them survives the move to React:
 *
 * - **Opening a panel makes its siblings `inert`**, so a keyboard or a screen
 *   reader cannot reach the board behind an open manual. Ashwake 1 tracked
 *   exactly what it changed so closing could put it back; React makes that free
 *   — the stack is state, and `inert` is derived from it.
 * - **Escape reaches only the TOP.** A stack of one panel over another closes
 *   one at a time, which is what a back button means.
 * - **Focus returns to whoever opened it.** A panel that closes and drops focus
 *   to `<body>` loses a keyboard user their place entirely.
 *
 * The one thing that is genuinely simpler here: Ashwake 1's `resetShell()`
 * hand-maintained a list of twenty-five element ids to re-hide on every scene
 * change, and the list had already missed three. That function does not exist
 * in this body. It was the single honest argument for React, and this is where
 * it gets collected.
 *
 * ## The phone's BACK button (2026-08-30)
 *
 * The last gesture `INTERACTIONS.md` listed as missing, and the only piece of
 * the router `DECISIONS.md` D9 ruled out that was ever real: on Android, BACK
 * with the manual open **left the site**. A player reading the rules pressed
 * the one button that means "go back" and lost the game.
 *
 * D9 is the reason this lives here and not in a route table. A URL→scene map
 * would make the address bar the authority on what is on screen, which is a
 * second authority beside this stack; **the entries pushed below carry no URL
 * change at all** (`location.href` again, so a shared `?seed=` or `?daily=`
 * survives untouched). They are history the way a native app uses it: one
 * entry per open panel, and BACK pops one.
 *
 * Three rules make it safe, and each one is a way it goes wrong without them:
 *
 * 1. **Every history call happens in an EVENT HANDLER, never in an effect or
 *    a state updater.** React runs both twice under StrictMode, and a doubled
 *    `pushState` is a back button that needs pressing twice.
 * 2. **A panel closed from the UI consumes its own entry** (`history.back()`),
 *    or the entries pile up and leaving the page takes one press per panel
 *    ever opened.
 * 3. **The stack owns nothing while nothing is open.** A `popstate` arriving
 *    with no entry of ours is somebody leaving, and it is left alone.
 */

type Stack = {
  readonly open: readonly string[];
  readonly push: (id: string, opener: HTMLElement | null) => void;
  readonly pop: (id: string) => void;
  readonly isTop: (id: string) => boolean;
  /** How many panels are open. A panel shows its ✕ only past the first. */
  readonly depth: number;
  /** Leave every open panel at once. */
  readonly closeAll: () => void;
};

const StackContext = createContext<Stack | null>(null);

export function DialogStack({ children }: { readonly children: ReactNode }) {
  const [open, setOpen] = useState<readonly string[]>([]);
  const openers = useRef(new Map<string, HTMLElement | null>());

  /**
   * The same list, readable from an event handler.
   *
   * `push` and `pop` are `useCallback([])` so that nothing rebinds when a
   * panel opens, which means neither can read `open`. They need to: how many
   * history entries this stack owns depends on what is already open, and
   * computing it inside a state updater would compute it twice under
   * StrictMode. The ref and the state move together, always, through `setList`.
   */
  const list = useRef<readonly string[]>([]);
  /** History entries this stack has pushed and not yet given back. */
  const owned = useRef(0);
  /** `popstate` events this stack caused itself, and must not act on. */
  const ours = useRef(0);

  const setList = useCallback((next: readonly string[]) => {
    list.current = next;
    setOpen(next);
  }, []);

  /** Back to whoever opened it, if it is still on the page. A control that has
   *  since been removed hands focus on rather than swallowing it. */
  const focusOpener = useCallback((id: string) => {
    const opener = openers.current.get(id);
    openers.current.delete(id);
    if (opener !== null && opener !== undefined && opener.isConnected) opener.focus();
  }, []);

  /** Give back `n` of our own entries. One `go` raises ONE `popstate`. */
  const giveBack = useCallback((n: number) => {
    if (n <= 0) return;
    owned.current -= n;
    ours.current += 1;
    history.go(-n);
  }, []);

  const push = useCallback(
    (id: string, opener: HTMLElement | null) => {
      openers.current.set(id, opener);
      if (list.current.includes(id)) return;
      setList([...list.current, id]);
      // No URL change: the entry exists to be popped, not to name a screen.
      history.pushState({ ashwakePanels: list.current.length }, '', location.href);
      owned.current += 1;
    },
    [setList],
  );

  const pop = useCallback(
    (id: string) => {
      if (!list.current.includes(id)) return;
      setList(list.current.filter((each) => each !== id));
      focusOpener(id);
      giveBack(1);
    },
    [setList, focusOpener, giveBack],
  );

  /**
   * The player pressed BACK.
   *
   * Only the top closes, which is the same rule Escape follows and the same
   * one a back button means everywhere else. An event we did not cause and do
   * not have an entry for is somebody leaving the site, and it is theirs.
   */
  useEffect(() => {
    const onPop = (): void => {
      if (ours.current > 0) {
        ours.current -= 1;
        return;
      }
      if (owned.current <= 0) return;
      owned.current -= 1;
      const top = list.current.at(-1);
      if (top === undefined) return;
      setList(list.current.slice(0, -1));
      focusOpener(top);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setList, focusOpener]);

  /**
   * Empty the stack.
   *
   * Marc, 2026-08-29, on menus three deep: *"add a x that escape all too"*.
   * The openers map is cleared with it rather than walked — returning focus to
   * whichever control opened the BOTTOM panel would be a jump from a screen
   * the player has just said they are done with. The board takes focus back
   * because the board is what is left.
   */
  const closeAll = useCallback(() => {
    openers.current.clear();
    const spent = owned.current;
    setList([]);
    // Every entry at once, in one `go`: leaving three panels' worth of
    // history behind would mean three presses of BACK to leave the page.
    giveBack(spent);
  }, [setList, giveBack]);

  const value = useMemo<Stack>(
    () => ({
      open,
      push,
      pop,
      isTop: (id) => open.at(-1) === id,
      depth: open.length,
      closeAll,
    }),
    [open, push, pop, closeAll],
  );

  return <StackContext.Provider value={value}>{children}</StackContext.Provider>;
}

export function useDialogStack(): Stack {
  const stack = useContext(StackContext);
  if (stack === null) throw new Error('a dialog needs a <DialogStack> above it');
  return stack;
}

/** True while anything is open — what the shell reads to go `inert`. */
export function useAnyDialogOpen(): boolean {
  return useDialogStack().open.length > 0;
}

/**
 * One door: a panel that can be opened and closed, with Escape reaching only
 * the top of the stack.
 *
 * Returns everything a caller needs and nothing it does not — `open` to render
 * by, and two functions. The `opener` is captured on the way in so focus knows
 * where to go on the way out.
 */
export function useDoor(id: string): {
  readonly open: boolean;
  readonly show: (opener?: HTMLElement | null) => void;
  readonly hide: () => void;
} {
  const stack = useDialogStack();
  const open = stack.open.includes(id);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      // Only the top: a stack of two closes one at a time, because that is
      // what a back button means.
      if (event.key === 'Escape' && stack.isTop(id)) {
        event.stopPropagation();
        stack.pop(id);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, id, stack]);

  return {
    open,
    show: (opener) => stack.push(id, opener ?? (document.activeElement as HTMLElement | null)),
    hide: () => stack.pop(id),
  };
}
