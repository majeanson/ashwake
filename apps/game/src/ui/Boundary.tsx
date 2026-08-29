import { Component, type ReactNode } from 'react';
import { bootStrings } from '../shell/locale';
import { showFailure } from '../shell/failure';

/**
 * What catches a render error (2026-08-29).
 *
 * There was no boundary at all, and the gap was quiet but real: React unmounts
 * the whole tree when a render throws, and only THEN does the error reach
 * `window.onerror` and the failure panel. So the panel's CONTINUE — which is
 * only `panel.remove()` — took away the one thing on screen and revealed the
 * blank page underneath, while promising in as many words that the run was
 * still there. A button that says CONTINUE has to continue into something.
 *
 * So the boundary holds the broken state itself and hands the panel a way back:
 * CONTINUE clears it and the tree mounts again. Being honest about the cost —
 * the board is remounted, which means a NEW WebGL context rather than the one
 * that was lost, and a run picked back up from what the keeper last wrote. That
 * is a worse outcome than nothing having gone wrong and a far better one than a
 * dark screen.
 *
 * A class because `getDerivedStateFromError` has no hook, which is the only
 * reason there is a class in this codebase.
 */

type Props = { readonly children: ReactNode };
type State = { readonly broken: boolean };

export class Boundary extends Component<Props, State> {
  override state: State = { broken: false };

  static getDerivedStateFromError(): State {
    return { broken: true };
  }

  override componentDidCatch(error: Error): void {
    // The panel speaks the device's language and owns the report, the repeat
    // count and the no-WebGL split. This only tells it what happened and how
    // to let the player back in.
    showFailure(bootStrings(), error, () => this.setState({ broken: false }));
  }

  override render(): ReactNode {
    // Nothing, rather than a fallback of its own: the panel IS the fallback,
    // and two things describing one crash is how they end up disagreeing.
    return this.state.broken ? null : this.props.children;
  }
}
