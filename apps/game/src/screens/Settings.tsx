import { LOCALES, type Locale } from '@content/locale';
import { featureText, PLAYER_FEATURES, type FeatureId, type FeatureSet } from '@meta/features';
import { AUTO_THEME_ID, THEMES } from '@theme/index';
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
  return (
    <Panel id="settings" title={s.ui.settings} back={s.ui.back} onBack={onBack}>
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
        <div className="panel-menu" role="group" aria-label={s.ui.appearance}>
          {/* AUTO is not a theme and deliberately not in THEMES — it is the
              ABSENCE of a choice, and what a fresh phone is set to. */}
          <button
            type="button"
            aria-pressed={stored === AUTO_THEME_ID}
            onClick={() => onTheme(AUTO_THEME_ID)}
          >
            AUTO
          </button>
          {THEMES.map((each) => (
            <button
              key={each.id}
              type="button"
              aria-pressed={stored === each.id}
              onClick={() => onTheme(each.id)}
            >
              {each.name[s.locale]}
            </button>
          ))}
        </div>
        <p className="note">{theme.note[s.locale]}</p>
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
