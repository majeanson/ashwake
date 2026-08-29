/**
 * The crash-report destination (2026-08-26, Marc's call): his own Sentry —
 * jaffre.sentry.io, project 4511395627008001 — the same project his portal
 * already reports to, reached the same way the portal reaches it: one hand-
 * rolled envelope POST, no SDK. The whole surface used here is a URL and
 * three lines of newline-delimited JSON; @sentry/browser is bigger than
 * this file's job at import time alone.
 *
 * The privacy contract this module lives under: a report leaves the device
 * ONLY when a human taps SEND REPORT — on the failure panel or in
 * SETTINGS ▸ LAST ERROR. Nothing here runs at boot, on error,
 * or on a timer. The tap is the consent; SETTINGS says so in words.
 *
 * The DSN is public-by-design (it ships in every client that uses Sentry;
 * it can submit events and do nothing else). Rotation = update this line,
 * push. Format: https://<KEY>@<HOST>/<PROJECT>.
 */
export const CRASH_DSN =
  'https://27bdc4debd1f4925a9d379a6936e0786@o4510241708244992.ingest.us.sentry.io/4511395627008001';

/** What the failure panel knows, and everything the event carries. */
export interface CrashReport {
  /** Short build sha — Sentry's `release`, so an issue names its commit. */
  readonly build: string;
  /** 'daily' | 'shared seed' | 'own world' | wherever else it was caught. */
  readonly mode: string;
  /** How many times this error has repeated on this device. */
  readonly count: number;
  readonly userAgent: string;
  /** `describeError`'s output: name, message, top of the stack. */
  readonly detail: string;
}

/** The envelope endpoint and body for one report — pure, so it is testable. */
export function crashEnvelope(
  report: CrashReport,
  eventId: string,
  sentAt: string,
): { url: string; body: string } {
  const dsn = new URL(CRASH_DSN);
  const projectId = dsn.pathname.replace(/\//g, '');
  const url =
    `https://${dsn.host}/api/${projectId}/envelope/` +
    `?sentry_version=7&sentry_key=${dsn.username}`;

  // Group by the error's own first line; carry the rest as extra. A whole
  // multi-line report as the message would give every stack its own issue.
  const firstLine = report.detail.split('\n', 1)[0] ?? '';
  const event = {
    event_id: eventId,
    timestamp: sentAt,
    platform: 'javascript',
    level: 'error',
    environment: 'production',
    release: report.build,
    tags: { mode: report.mode, seen: String(report.count) },
    message: firstLine === '' ? 'crash report (no detail)' : firstLine,
    extra: { detail: report.detail, userAgent: report.userAgent },
  };
  const body =
    JSON.stringify({ event_id: eventId, sent_at: sentAt }) +
    '\n' +
    JSON.stringify({ type: 'event' }) +
    '\n' +
    JSON.stringify(event);
  return { url, body };
}

/*
 * `sendCrashReport` moved to `apps/game/src/shell/failure.ts` on 2026-08-29,
 * which is what the note above asked for: the envelope is arithmetic and
 * belongs here, `fetch` is an edge and belongs in the shell. It was the only
 * network call in the core, and the only place `packages/core` reached for a
 * global the DOM ban would otherwise have caught.
 */
