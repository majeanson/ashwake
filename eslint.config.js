// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * The layering rule, carried over from Ashwake 1 and now split across a package
 * boundary:
 *
 *   packages/core:   content  <-  engine  <-  meta  <-  view
 *                             <-  theme   <-  render (layout, labels, the BoardView type)
 *                                         <-  sim
 *   apps/game:       board / chrome / shell  ->  core (never the other way)
 *
 * `content` is data and may import nothing. `engine` is pure and may import only
 * `content`. `theme` is the visual contract — data about how roles are painted —
 * and may import only `content`'s types; the engine may not see it, because a
 * rule that can read the palette is a rule that can be changed by repainting.
 * `view` is the props layer: it derives everything a screen shows from state and
 * never touches a screen. Nothing in `packages/core` may import the app, React,
 * three, or the DOM. This file is the only thing that makes that a fact rather
 * than an intention, which is why it earns its length.
 */
const deny = (groups, message) => ({
  'no-restricted-imports': ['error', { patterns: [{ group: groups, message }] }],
});

/** Aliased and relative spellings of the same forbidden folder. */
const layer = (name) => [`@${name}`, `@${name}/*`, `**/${name}`, `**/${name}/*`];

const APP = [
  'react',
  'react-dom',
  'react/*',
  'react-dom/*',
  'three',
  'three/*',
  '@react-three/*',
  '**/apps/*',
];

/**
 * Determinism guards. The engine's whole value is that `reduce(state, action)`
 * returns the same thing every time — which buys replays, golden tests, save
 * files and a headless balance harness. One `Math.random()` costs all four, and
 * it is invisible in review. So it is a lint error instead.
 */
const pure = {
  'no-restricted-globals': [
    'error',
    ...['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'performance'].map(
      (name) => ({ name, message: 'The engine has no DOM. Pass what you need in as an argument.' }),
    ),
    ...['fetch', 'setTimeout', 'setInterval', 'requestAnimationFrame'].map((name) => ({
      name,
      message: 'The engine is synchronous. Timing belongs to the renderer.',
    })),
  ],
  'no-restricted-properties': [
    'error',
    {
      object: 'Math',
      property: 'random',
      message: 'Take an RngStream from state and return the advanced stream.',
    },
    {
      object: 'Date',
      property: 'now',
      message: 'The engine is deterministic. No wall-clock time.',
    },
  ],
  'no-restricted-syntax': [
    'error',
    {
      selector: 'NewExpression[callee.name="Date"]',
      message: 'The engine is deterministic. No wall-clock time.',
    },
  ],
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'coverage/**'] },

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // Node-side files: build configs, the headless harness, scripts.
  {
    files: [
      '**/*.config.{ts,js}',
      '**/scripts/**/*.ts',
      'packages/core/src/sim/**/*.ts',
      'e2e/**/*.ts',
    ],
    languageOptions: { globals: globals.node },
  },
  { files: ['eslint.config.js'], extends: [tseslint.configs.disableTypeChecked] },

  // The whole core package: never the app, never a framework, never a canvas.
  {
    files: ['packages/core/src/**/*.ts'],
    rules: deny(
      APP,
      'packages/core is the rules of the game. It may not import the app, React, three or a canvas.',
    ),
  },

  {
    files: ['packages/core/src/engine/**/*.ts'],
    rules: {
      ...pure,
      ...deny(
        [
          ...layer('view'),
          ...layer('render'),
          ...layer('theme'),
          ...layer('meta'),
          ...layer('sim'),
          ...APP,
        ],
        'The engine may import only from engine/ and content/. A rule that can read the palette is a rule you can change by repainting.',
      ),
    },
  },

  {
    files: ['packages/core/src/content/**/*.ts'],
    rules: {
      ...pure,
      ...deny(
        [
          ...layer('view'),
          ...layer('render'),
          ...layer('theme'),
          ...layer('meta'),
          ...layer('sim'),
          ...layer('engine'),
          ...APP,
        ],
        'content/ is data. It imports nothing but its own types.',
      ),
    },
  },

  {
    files: ['packages/core/src/theme/**/*.ts'],
    rules: deny(
      [
        ...layer('view'),
        ...layer('render'),
        ...layer('meta'),
        ...layer('sim'),
        ...layer('engine'),
        ...APP,
      ],
      'theme/ describes how things look. It may import content/ types and nothing else.',
    ),
  },

  {
    files: ['packages/core/src/render/**/*.ts'],
    rules: deny(
      [...layer('view'), ...layer('sim'), ...APP],
      'render/ in the core is geometry and the BoardView contract. It may not reach into view/ or sim/.',
    ),
  },

  {
    files: ['packages/core/src/meta/**/*.ts', 'packages/core/src/sim/**/*.ts'],
    rules: deny([...layer('view'), ...APP], 'Nothing headless may import view/.'),
  },

  // The app imports the core through its aliases; nothing imports the app.
  {
    files: ['apps/game/src/**/*.{ts,tsx}'],
    rules: deny(
      ['**/packages/core/*'],
      'Import the core through its aliases (@engine, @view, ...), never by path.',
    ),
  },

  prettier,
);
