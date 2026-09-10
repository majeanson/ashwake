import { LOCALES, type Locale } from '@content/locale';
import { featureText, PLAYER_FEATURES, type FeatureId, type FeatureSet } from '@meta/features';
import { canBuzz } from '../shell/touch';
import { useState } from 'react';
import { AUTO_THEME_ID, THEMES } from '@theme/index';
import { Fold } from '../ui/Fold';
import { Swatch } from '../ui/Swatch';
import { sendCrashReport } from '../shell/failure';
import { readLastError } from '../shell/storage';
import type { Theme, ThemeId } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { Confirming } from '../ui/Confirming';
import { MIN_RENDER_SCALE } from '../board/quality';
import { Panel, PanelMenu } from '../ui/Panel';

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

/**
 * A switch this DEVICE could actually do something with (2026-09-08).
 *
 * The registry's `wired` says whether the BUILD has anything behind a flag,
 * which is the right question asked one level too high for haptics: the code
 * is there, it is tested, and on an iPhone `navigator.vibrate` does not exist
 * and never has — so the row would be a switch that flips, remembers, says ON,
 * and does nothing. That is the exact promise `wired: false` was invented to
 * avoid making, one layer down.
 *
 * Hidden rather than shown as NOT BUILT, and the difference is honesty about
 * WHOSE limit it is: NOT BUILT is a note to a player that this game has not
 * finished a feature, and that would be a lie here. Their phone simply does
 * not have the sense. There is nothing for them to do about it and nothing
 * for them to wait for.
 *
 * Every other flag answers `true` and is unaffected, so this is one named
 * exception rather than a filter the screen has to keep in step with the
 * registry.
 */
const offerable = (feature: { readonly id: FeatureId }): boolean =>
  feature.id !== 'ui.haptics' || canBuzz();

type SettingsProps = {
  readonly theme: Theme;
  readonly s: Strings;
  readonly stored: ThemeId;
  readonly features: FeatureSet;
  readonly onBack: () => void;
  readonly onTheme: (id: ThemeId) => void;
  readonly onLocale: (locale: Locale) => void;
  readonly onFeature: (id: FeatureId, on: boolean) => void;
  readonly onResetTeaching: () => void;
  /** The SHARPNESS dial's value and this phone's own ceiling — see the section
   *  below for why it lives here rather than on the board. */
  readonly renderScale: number;
  readonly maxRenderScale: number;
  readonly onRenderScale: (scale: number) => void;
  /** The room where a tap can destroy something, one door further down. */
  readonly onDevice: () => void;
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
  renderScale,
  maxRenderScale,
  onRenderScale,
  onDevice,
}: SettingsProps) {
  // Read once, when the panel opens: nothing can break while it is showing
  // except this panel, and a screen that re-reads the disk on every render is
  // a screen doing work nobody asked for.
  const [lastError] = useState(readLastError);
  /**
   * WHERE THE CRASH REPORT HAS GOT TO (2026-09-02).
   *
   * A state rather than the sentence it prints. It was the sentence — one
   * `string | null` doing both jobs, and `disabled={sent !== null}` therefore
   * meant the button that reads SEND FAILED was **permanently dead**, on the
   * one screen whose entire purpose is getting a report out of a phone that
   * broke. A failure is exactly the state a retry is for: the network dropped,
   * the tab was backgrounded, the send raced a reload. The tap that would fix
   * it was the tap the failure disabled.
   *
   * `sending` is the only state that must refuse a second press — two reports
   * of one crash from one tap. `sent` refuses one too, because it succeeded.
   * `failed` is a button again.
   */
  const [send, setSend] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const sendSays: Record<typeof send, string> = {
    idle: s.ui.crash.send,
    sending: s.ui.crash.sending,
    sent: s.ui.crash.sent,
    failed: s.ui.crash.sendFailed,
  };

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
        SHARPNESS, moved off the board (2026-09-08, Marc: *"put netteté button
        into settings"*).

        It was the third button in the board's bottom-right corner, on screen
        for the whole of every run, opening a popover over the board — and it is
        a dial somebody sets once for a phone and never touches again. That is
        what this panel is for: LANGUAGE and APPEARANCE are the same kind of
        decision, made once and lived with.

        No popover left either. It is a row here like everything else, which is
        the whole saving: the board's corner is two buttons, and this screen
        already knew how to hold a slider's worth of explanation.

        Only where there is a real choice, as before: a phone whose own pixel
        ratio is already 1 has nothing a slider could raise, and a dead slider
        teaches a player that this screen has controls that do nothing.
      */}
      {maxRenderScale > MIN_RENDER_SCALE && (
        <section>
          <h2 className="fact-label">{s.ui.sharpness.label}</h2>
          <div className="sharpness-row">
            <input
              type="range"
              data-action="sharpness-slider"
              aria-label={s.ui.sharpness.label}
              min={MIN_RENDER_SCALE}
              max={maxRenderScale}
              step={0.25}
              value={renderScale}
              onChange={(e) => onRenderScale(Number(e.target.value))}
            />
            <span className="sharpness-value">{renderScale.toFixed(2)}×</span>
          </div>
          <p className="note">{s.ui.sharpness.note}</p>
        </section>
      )}

      {/*
        THE STORY, moved in from MENU (2026-09-08).

        Marc: *"overall there is too much buttons, need to layerize things
        properly"*, and the layering he picked puts SETTINGS one level under
        MENU with the read-once things inside it. The story is the most
        read-once thing in the game — three sentences a stranger meets on their
        first card and may want again — and it was a fold competing for the eye
        with six doors.
      */}
      <section>
        <Fold summary={s.ui.theStory}>
          <div className="story-lines">
            {s.story.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </Fold>
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
                disabled={send === 'sending' || send === 'sent'}
                onClick={() => {
                  setSend('sending');
                  void sendCrashReport({
                    build: lastError.sha,
                    mode: 'settings',
                    count: lastError.count,
                    userAgent: navigator.userAgent,
                    detail: lastError.text,
                  }).then((ok) => setSend(ok ? 'sent' : 'failed'));
                }}
              >
                {sendSays[send]}
              </button>
            </>
          )}
        </Fold>
      </section>

      <section>
        {PLAYER_FEATURES.filter(offerable).map((feature) => {
          const words = featureText(feature.id, s);
          const on = features[feature.id];
          return (
            <div key={feature.id} className="flag">
              <button
                type="button"
                // Named for the FLAG, so a test can ask about the one switch
                // that has a second surface (the board’s ♪) rather than about
                // a row index that moves when a flag is added.
                data-feature={feature.id}
                /*
                 * A switch that is NOT BUILT is not a switch that is off
                 * (2026-09-02).
                 *
                 * `aria-pressed` was set on every row including the unwired
                 * ones, so a feature with nothing behind it announced as "not
                 * pressed" — a toggle in a known state, which is exactly the
                 * wrong promise. The label already says NOT BUILT; the role
                 * should agree with it rather than contradict it.
                 */
                {...(feature.wired ? { 'aria-pressed': on } : {})}
                disabled={!feature.wired}
                onClick={() => onFeature(feature.id, !on)}
              >
                {/* The label is part of the accessible name rather than a
                    sibling, so a screen reader says what is being switched. */}
                {words.label} ·{' '}
                {feature.wired ? (on ? s.ui.flag.on : s.ui.flag.off) : s.ui.flag.notBuilt}
              </button>
              <p className="note">{words.note}</p>
            </div>
          );
        })}
      </section>

      {/*
        The two careful things, as a column (2026-09-08).

        A bare `<section>` lays its children out inline, which was fine while
        RESET TEACHING was alone in here and put the door that arrived beside it
        on the same line — two buttons crammed shoulder to shoulder at the foot
        of the screen, one of them a confirm and the other a room full of
        confirms. `PanelMenu` is the column every other list in this build uses,
        and it is what makes a row a row.
      */}
      <section>
        <PanelMenu>
          <Confirming
            label={s.ui.resetTeaching}
            armed={s.ui.resetTeachingArmed}
            onConfirm={onResetTeaching}
          />
          {/*
          THIS DEVICE, one level further down (2026-09-08).

          It was a row on MENU, deliberately last and on its own, because
          `More.tsx` has argued since Stage 4 that *"a player looking for the
          manual should never be one mis-tap from erasing three worlds."* That
          argument is unchanged and this move strengthens it: the room where a
          tap can destroy something is now two doors from the board rather than
          one, at the foot of the screen that already holds the other things
          nobody opens twice.
        */}
          <button type="button" data-go="device" onClick={onDevice}>
            {s.ui.thisDevice}
          </button>
        </PanelMenu>
        <p className="note">{s.ui.privacy}</p>
        {/*
          THE THIRD-PARTY NOTICES, WHICH NOTHING POINTED AT (2026-09-09).

          Two OFL typefaces and one MIT icon set are served to every visitor,
          and both licences require their notice to travel with the work. The
          repository held one of the three, in `docs/licences`, which is not
          served — so nothing that reached a player carried a notice at all.
          `scripts/notices.ts` writes `/third-party.txt` from the fonts' own
          name tables, and this is the only thing on any screen that says it is
          there.

          Under the privacy sentence because they answer one question between
          them: what is in this page that is not mine. A plain link rather than
          a panel — it is a legal notice, read once by almost nobody, and a
          screen for it would be a screen to maintain.
        */}
        <p className="note">
          <a href="/third-party.txt" target="_blank" rel="noopener">
            {s.ui.notices}
          </a>
        </p>
      </section>
    </Panel>
  );
}
