import { LOCALES, type Locale } from '@content/locale';
import { featureText, PLAYER_FEATURES, type FeatureId, type FeatureSet } from '@meta/features';
import { useState } from 'react';
import { AUTO_THEME_ID, THEMES } from '@theme/index';
import { Fold } from '../ui/Fold';
import { Swatch } from '../ui/Swatch';
import { sendCrashReport } from '../shell/failure';
import { readLastError } from '../shell/storage';
import type { Theme, ThemeId } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { Confirming } from '../ui/Confirming';
import { Panel } from '../ui/Panel';

/**
 * SETTINGS (Stage 3, 2026-08-29).
 *
 * **LANGUE / LANGUAGE sits above APPEARANCE** (`DECISIONS.md` D4). Ashwake 2
 * speaks two languages and picks by device on first run; the one thing a
 * player must be able to do is disagree with that guess, and burying it under
 * the palette would be a strange thing to make someone hunt for.
 *
 * Every switch is a row from `PLAYER_FEATURES`, and the sentence under it is
 * the registry's own note — so **the screen IS the decision record**. A flag
 * that ships without an argument has nowhere to put one. `wired: false` shows
 * as NOT BUILT rather than being hidden, because a switch that does nothing
 * and a switch that is absent are different promises.
 *
 * The privacy sentence is last and is not a boast: it is the claim the crash
 * reporter's one exception has to stay true against.
 */

export type SettingsProps = {
  readonly theme: Theme;
  readonly s: Strings;
  readonly stored: ThemeId;
  readonly features: FeatureSet;
  readonly onBack: () => void;
  readonly onTheme: (id: ThemeId) => void;
  readonly onLocale: (locale: Locale) => void;
  readonly onFeature: (id: FeatureId, on: boolean) => void;
  readonly onResetTeaching: () => void;
};

export function Settings({
  theme,
  s,
  stored,
  features,
  onBack,
  onTheme,
  onLocale,
  onFeature,
  onResetTeaching,
}: SettingsProps) {
  // Read once, when the panel opens: nothing can break while it is showing
  // except this panel, and a screen that re-reads the disk on every render is
  // a screen doing work nobody asked for.
  const [lastError] = useState(readLastError);
  const [sent, setSent] = useState<string | null>(null);

  return (
    <Panel
      id="settings"
      title={s.ui.settings}
      back={s.ui.back}
      closeAll={s.ui.closeAll}
      onBack={onBack}
    >
      <section>
        <h2 className="fact-label">{s.ui.language}</h2>
        <div className="panel-menu" role="group" aria-label={s.ui.language}>
          {LOCALES.map((locale) => (
            <button
              key={locale}
              type="button"
              aria-pressed={s.locale === locale}
              onClick={() => onLocale(locale)}
            >
              {s.ui.languages[locale]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="fact-label">{s.ui.appearance}</h2>
        {/*
          Shown, not listed (2026-08-29).

          This was a column of words, which asks a player to choose a LOOK from
          a list of names — the one decision on this screen whose answer is
          entirely visual. Each row now carries the direction's own four
          grounds and its ink, drawn from the theme's tokens, so the choice is
          made by looking. Adding a direction is still one file and one entry
          in `THEMES`; it arrives here with a swatch and needs no code.
        */}
        <div className="panel-menu themes" role="group" aria-label={s.ui.appearance}>
          {/* AUTO is not a theme and deliberately not in THEMES — it is the
              ABSENCE of a choice, and what a fresh phone is set to. It gets no
              swatch because it has no look of its own; the device's answer is
              whichever row below it would have picked. */}
          <button
            type="button"
            data-theme-pick={AUTO_THEME_ID}
            aria-pressed={stored === AUTO_THEME_ID}
            onClick={() => onTheme(AUTO_THEME_ID)}
          >
            {s.ui.auto}
          </button>
          {THEMES.map((each) => (
            <button
              key={each.id}
              type="button"
              data-theme-pick={each.id}
              aria-pressed={stored === each.id}
              onClick={() => onTheme(each.id)}
            >
              <Swatch theme={each} />
              {each.name[s.locale]}
            </button>
          ))}
        </div>
        <p className="note">{theme.note[s.locale]}</p>
      </section>

      {/*
        LAST ERROR (Stage 4, 2026-08-29).

        The failure panel is a moment; this is the door that stays open. A
        player who tapped CONTINUE an hour ago is a bug report that walked
        away — unless the thing they saw is still here to send.

        Folded, because on a device where nothing has broken it is a heading
        about nothing, and it must never be the first thing SETTINGS says.
      */}
      <section>
        <Fold summary={s.ui.crash.lastError}>
          {lastError === null ? (
            <p className="note">{s.ui.crash.noError}</p>
          ) : (
            <>
              <p className="note">
                {lastError.sha} · {lastError.at.slice(0, 10)} · {s.ui.crash.seen(lastError.count)}
              </p>
              <p className="crash-detail">{lastError.text}</p>
              <button
                type="button"
                data-crash="send-kept"
                disabled={sent !== null}
                onClick={() => {
                  setSent(s.ui.crash.sending);
                  void sendCrashReport({
                    build: lastError.sha,
                    mode: 'settings',
                    count: lastError.count,
                    userAgent: navigator.userAgent,
                    detail: lastError.text,
                  }).then((ok) => setSent(ok ? s.ui.crash.sent : s.ui.crash.sendFailed));
                }}
              >
                {sent ?? s.ui.crash.send}
              </button>
            </>
          )}
        </Fold>
      </section>

      <section>
        {PLAYER_FEATURES.map((feature) => {
          const words = featureText(feature.id, s);
          const on = features[feature.id];
          return (
            <div key={feature.id} className="flag">
              <button
                type="button"
                aria-pressed={on}
                disabled={!feature.wired}
                onClick={() => onFeature(feature.id, !on)}
              >
                {/* The label is part of the accessible name rather than a
                    sibling, so a screen reader says what is being switched. */}
                {words.label} — {feature.wired ? (on ? 'ON' : 'OFF') : 'NOT BUILT'}
              </button>
              <p className="note">{words.note}</p>
            </div>
          );
        })}
      </section>

      <section>
        <Confirming
          label={s.ui.resetTeaching}
          armed={`${s.ui.resetTeaching}?`}
          onConfirm={onResetTeaching}
        />
        <p className="note">{s.ui.privacy}</p>
      </section>
    </Panel>
  );
}
