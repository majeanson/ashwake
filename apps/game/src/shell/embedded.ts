/**
 * Is the game being shown inside somebody else's page? (2026-10-15)
 *
 * marcportal.com embeds Ashwake as a scaled-down preview, and `_headers`'
 * `frame-ancestors` is what lets it. A framed visitor is not a player who chose
 * this page: they are looking at a card on a portfolio, so the front door says
 * less (BEGIN and one way out, no DAILY, no install offer) and offers the whole
 * game in its own tab.
 *
 * A cross-origin parent cannot be read, but comparing the two window proxies is
 * allowed everywhere; the `catch` is for the engines that throw anyway, and a
 * throw is itself the answer — a page that cannot be compared with its top is
 * not the top.
 */
export function isFramed(win: { readonly self: unknown; readonly top: unknown }): boolean {
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}
