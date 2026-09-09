import { readFileSync, writeFileSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';

/**
 * The third-party notices, generated from the files they are about
 * (2026-09-09).
 *
 * Ashwake serves two OFL typefaces and one MIT icon set, and both licences
 * require their copyright notice to be distributed WITH the work. Until today
 * the repository held one notice — the icons' — in `docs/licences`, a
 * directory that is not served. So nothing that reached a player carried a
 * notice at all, on a page whose fonts are self-hosted precisely so that
 * nothing has to be fetched from anybody else.
 *
 * **The copyright lines are READ OUT OF THE FONTS**, from the `name` table
 * every OpenType file carries, rather than transcribed from a web page. That
 * is the whole reason this is a script: a transcribed copyright is a fact that
 * can be wrong and that nobody will ever re-check, while the authoritative
 * copy is sitting in the bytes being served. Swap a font and its notice
 * follows.
 *
 * The OFL body is copied verbatim from a licence already vendored in
 * `node_modules`, for the same reason — legal text must not be retyped.
 *
 *   pnpm exec tsx scripts/notices.ts
 */

/** Where the licence body comes from, so it is never retyped. */
const OFL_SOURCE =
  'node_modules/.pnpm/three@0.183.2/node_modules/three/examples/fonts/MPLUSRounded1c/OFL.txt';

/** The `name` table out of an uncompressed OpenType file. */
function sfntNameTable(b: Buffer): Buffer {
  const numTables = b.readUInt16BE(4);
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    if (b.toString('ascii', record, record + 4) !== 'name') continue;
    const offset = b.readUInt32BE(record + 8);
    return b.subarray(offset, offset + b.readUInt32BE(record + 12));
  }
  throw new Error('no name table');
}

/**
 * Every table of a woff2, decompressed and concatenated.
 *
 * woff2 brotli-compresses the whole font into one stream, anchored at the TAIL
 * by the header's `totalCompressedSize` — these fonts carry a `metaOffset`
 * that points past their own end, so the end of the table directory is not a
 * usable start and the header's own measure is.
 *
 * **The directory is deliberately NOT walked to locate `name` inside the
 * result.** A first attempt did that and got a wrong offset: `glyf` and `loca`
 * inverse the meaning of the transform flag, and the entries' stream lengths
 * are what accumulate rather than their original lengths. Getting that right
 * is a page of spec whose only purpose here is finding one string — so the
 * notice is scanned for instead (see `copyrightOf`). Still read out of the
 * font's own bytes, which is the property that matters; a byte offset was
 * never the point.
 */
function woff2Tables(b: Buffer): Buffer {
  const compressedSize = b.readUInt32BE(20);
  const start = b.length - compressedSize;
  return brotliDecompressSync(b.subarray(start, start + compressedSize));
}

/** One string out of a name table, by nameID. Platform 3 stores UTF-16BE. */
function nameRecord(table: Buffer, wanted: number): string | null {
  const count = table.readUInt16BE(2);
  const strings = table.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    const record = 6 + i * 12;
    if (table.readUInt16BE(record + 6) !== wanted) continue;
    const platform = table.readUInt16BE(record);
    const length = table.readUInt16BE(record + 8);
    const offset = strings + table.readUInt16BE(record + 10);
    const raw = table.subarray(offset, offset + length);
    const even = raw.subarray(0, raw.length - (raw.length % 2));
    const text =
      platform === 3 ? Buffer.from(even).swap16().toString('utf16le') : raw.toString('latin1');
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean !== '') return clean;
  }
  return null;
}

/**
 * The copyright notice this font carries about itself.
 *
 * An uncompressed file is read properly, by nameID: `name` record 0 IS the
 * notice, and there is no ambiguity. A woff2 is decompressed and scanned,
 * because locating one table inside the stream is a page of spec spent on
 * nothing (see `woff2Tables`) — the scan looks in UTF-16BE first, which is how
 * a Windows-platform name record stores text, and then in Latin-1.
 *
 * Either way it throws rather than guessing: a notice that cannot be read is a
 * notice nobody should be inventing, and this script exists precisely so that
 * no copyright line in this repository is typed by hand.
 */
function copyrightOf(file: string): string {
  const b = readFileSync(file);

  if (b.toString('ascii', 0, 4) !== 'wOF2') {
    const notice = nameRecord(sfntNameTable(b), 0);
    if (notice === null || !notice.startsWith('Copyright')) {
      throw new Error(`${file}: no copyright notice in the name table`);
    }
    return notice;
  }

  const tables = woff2Tables(b);
  const even = tables.subarray(0, tables.length - (tables.length % 2));
  const haystacks = [Buffer.from(even).swap16().toString('utf16le'), tables.toString('latin1')];
  for (const hay of haystacks) {
    const hit = /Copyright[\x20-\x7e]{10,220}/.exec(hay);
    if (hit !== null) return hit[0].replace(/\s+/g, ' ').trim();
  }
  throw new Error(`${file}: no copyright notice found in the decompressed tables`);
}

const FONTS = [
  {
    // The TTF rather than the woff2: this font ships BOTH (troika cannot read
    // woff2, which is why the board's own face is a TTF), and an uncompressed
    // file needs no brotli and no directory walk. Read the simplest
    // authoritative copy available.
    file: 'apps/game/public/fonts/cinzel.ttf',
    licence: 'docs/licences/cinzel-OFL.txt',
    name: 'Cinzel',
    role: 'the display and label face',
    served: '/fonts/cinzel.woff2, /fonts/cinzel.ttf',
  },
  {
    file: 'apps/game/public/fonts/ebgaramond.woff2',
    licence: 'docs/licences/ebgaramond-OFL.txt',
    name: 'EB Garamond',
    role: 'the body face',
    served: '/fonts/ebgaramond.woff2, /fonts/ebgaramond-italic.woff2',
  },
] as const;

const oflWhole = readFileSync(OFL_SOURCE, 'utf8').trim();
const oflBody = oflWhole.slice(oflWhole.indexOf('This Font Software is licensed')).trim();
if (!oflBody.startsWith('This Font Software is licensed')) {
  throw new Error(`${OFL_SOURCE}: not the OFL body this script expects`);
}
const phosphor = readFileSync('docs/licences/phosphor-LICENSE', 'utf8').trim();
const notices = FONTS.map((font) => copyrightOf(font.file));

// One licence file per font, beside the icons', for anyone reading the repo.
FONTS.forEach((font, i) => {
  writeFileSync(
    font.licence,
    `${notices[i]}\n\n(Read from the font's own name table by scripts/notices.ts — the\nauthoritative source, rather than transcribed from a web page.)\n\n${oflBody}\n`,
  );
});

const entries = FONTS.map(
  (font, i) => `
-------------------------------------------------------------------------------
${i + 1}. ${font.name} — ${font.role} (${font.served})
-------------------------------------------------------------------------------

${notices[i]}

Licensed under the SIL Open Font License, Version 1.1, reproduced in full at the
end of this file.
`,
).join('');

// And the one a PLAYER can reach, which is the half that was missing.
const served = `ASHWAKE — third-party notices
=============================

Ashwake serves two typefaces and one icon set that somebody else made, and both
licences require their copyright notice to travel with the work. This file is
that notice, served from the same origin as the fonts and the marks it covers —
which is the point: a licence kept in a repository nobody visits is not
distributed with anything.

Nothing here runs any code of its own. Ashwake has no backend, no account and no
analytics; SETTINGS says what does and does not leave your phone.

Generated from the files themselves by scripts/notices.ts — the copyright lines
are read out of each font's own name table, so they cannot drift from what is
actually being served.
${entries}
-------------------------------------------------------------------------------
${FONTS.length + 1}. Phosphor Icons — every mark the game draws
-------------------------------------------------------------------------------

The marks are vendored as path data, so no Phosphor code ships — but the paths
are the Software and the notice travels with them.

${phosphor}


-------------------------------------------------------------------------------
SIL OPEN FONT LICENSE, VERSION 1.1 — applies to the typefaces above
-------------------------------------------------------------------------------

${oflBody}
`;

writeFileSync('apps/game/public/third-party.txt', served);

console.log('notices written from the files themselves:');
for (const notice of notices) console.log('  ' + notice);
// Phosphor's notice is a file in this repository rather than something read
// out of a binary, so there is nothing to discover and nothing to print but
// the fact that it was carried.
console.log('  Phosphor Icons: MIT, notice carried verbatim');
