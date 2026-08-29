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

  const push = useCallback((id: string, opener: HTMLElement | null) => {
    openers.current.set(id, opener);
    setOpen((was) => (was.includes(id) ? was : [...was, id]));
  }, []);

  const pop = useCallback((id: string) => {
    setOpen((was) => was.filter((each) => each !== id));
    // Back to whoever opened it, if it is still on the page. A control that
    // has since been removed hands focus on rather than swallowing it.
    const opener = openers.current.get(id);
    openers.current.delete(id);
    if (opener !== null && opener !== undefined && opener.isConnected) opener.focus();
  }, []);

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
    setOpen([]);
  }, []);

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
