import { describe, expect, it } from 'vitest';
import { CRASH_DSN, crashEnvelope, type CrashReport } from './report';

const report: CrashReport = {
  build: 'abc1234',
  mode: 'daily',
  count: 3,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  detail: 'TypeError: x is undefined\nat pop (main.ts:12:3)\nat loop (main.ts:9:1)',
};

describe('crashEnvelope', () => {
  it('aims at the DSN’s own host and project, with its key in the query', () => {
    const dsn = new URL(CRASH_DSN);
    const { url } = crashEnvelope(report, 'e'.repeat(32), '2026-08-26T12:00:00.000Z');
    expect(url).toBe(
      `https://${dsn.host}/api/${dsn.pathname.replace(/\//g, '')}/envelope/` +
        `?sentry_version=7&sentry_key=${dsn.username}`,
    );
    // The project in the DSN is the one Marc linked (2026-08-26). If the
    // DSN rotates to a different project, this is the line that says so.
    expect(url).toContain('/api/4511395627008001/envelope/');
  });

  it('is three JSON lines sharing one event id', () => {
    const id = '0123456789abcdef0123456789abcdef';
    const at = '2026-08-26T12:00:00.000Z';
    const lines = crashEnvelope(report, id, at).body.split('\n');
    expect(lines).toHaveLength(3);
    const [head, item, event] = lines.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(head).toEqual({ event_id: id, sent_at: at });
    expect(item).toEqual({ type: 'event' });
    expect(event!['event_id']).toBe(id);
    expect(event!['timestamp']).toBe(at);
  });

  it('groups by the first line and carries the whole report', () => {
    const event = JSON.parse(
      crashEnvelope(report, 'e'.repeat(32), '2026-08-26T12:00:00.000Z').body.split('\n')[2]!,
    ) as Record<string, unknown>;
    expect(event['message']).toBe('TypeError: x is undefined');
    expect(event['release']).toBe('abc1234');
    expect(event['tags']).toEqual({ mode: 'daily', seen: '3' });
    expect(event['extra']).toEqual({ detail: report.detail, userAgent: report.userAgent });
  });

  it('still sends something readable when the detail is empty', () => {
    const event = JSON.parse(
      crashEnvelope(
        { ...report, detail: '' },
        'e'.repeat(32),
        '2026-08-26T12:00:00.000Z',
      ).body.split('\n')[2]!,
    ) as Record<string, unknown>;
    expect(event['message']).toBe('crash report (no detail)');
  });
});

/*
 * `sendCrashReport`'s own tests moved with it, to
 * `apps/game/src/shell/failure.test.ts` (2026-08-29). What stays here is the
 * ENVELOPE, which is the part that has to be right and the part a test can
 * check without a network.
 */
