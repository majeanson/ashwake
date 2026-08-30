import { PERK_DIALS, UPGRADE_STEPS } from '@content/goals';
import { CONCEPT_MARK, LANDMARK_GLYPH } from '@theme/tokens';
import { fmtInt, fmtPct, NNBSP, ordinal } from './format';
import type { Strings } from './Strings';

/**
 * Français (Québec) — la première langue du jeu (Marc, 2026-08-28 :
 * « introduce i18n for fr(qc) first, then en »).
 *
 * Les règles d’écriture, tenues par `text.test.ts` là où un test peut les
 * tenir :
 *
 * - Typographie de l’OQLF, usage québécois : espace fine insécable (U+202F,
 *   `NNBSP`) devant `:` et `%`, et AUCUNE devant `;` `!` `?` (contrairement à
 *   la France); apostrophe typographique `’` partout; accents conservés sur
 *   les majuscules (`RÉSERVE`, `MÛRIT`, `RIVIÈRES`).
 * - Les NOMS des sols sont des titres, jamais des noms communs avec article
 *   (« CENDRES — se nourrit de la pierre… »), pour que l’accord ne dépende
 *   jamais de la direction artistique chargée.
 * - Le glossaire est celui de Marc : MÛR, RÉCOLTER, BRÛLER, POCHE, RÉSERVE,
 *   RELIQUES, CHANCE; les sols du torchlit sont LICHEN · TISONS · CENDRES ·
 *   RIVIÈRES. Tutoiement, comme le « you » anglais est familier.
 * - Mêmes conditions que l’anglais, par construction : ce fichier ne décide
 *   jamais QUAND une phrase se dit, seulement comment elle se dit.
 *
 * Marc relit : la trace `__snapshots__/*.snap` est la surface de révision, puis
 * le manuel sur le téléphone.
 */

/** L’espace fine avant un signe double — `Valeur${D}: 3`. */
const D = NNBSP;
/** Pluriel français : 0 et 1 au singulier. */
const pl = (n: number, one: string, many: string): string => (n > 1 ? many : one);
const nb = (n: number): string => fmtInt(n, 'fr-CA');
/** Le mot de pouvoir et son deux-points — avec l’espace fine, ou rien du tout.
 *  Voir `view#powerHead` : une direction dont le nom du sol dit déjà son
 *  pouvoir n’a rien à ajouter. */
const pw = (word: string): string => (word === '' ? '' : `${word}${D}: `);
const pc = (n: number): string => fmtPct(n, 'fr-CA');
const capitalize = (s: string): string => `${s[0]!.toLocaleUpperCase('fr-CA')}${s.slice(1)}`;

const LUCK_CORE = 'CHANCE — une bourse, pas un score.';
const RARE_STAR =
  'Une tuile rare posée porte une étoile, pour que son pouvoir reste repérable sur une carte pleine.';
const LAST_GASP_RULE = `Tu peux poser tant qu’il te reste UNE tuile — la différence est pardonnée à zéro, et ça ne s’enchaîne pas${D}: seule une récolte te ramène au-dessus de zéro.`;

export const STRINGS_FR: Strings = {
  locale: 'fr-CA',
  typography: { sentenceEnd: /[.!?…»]$/ },

  lesson: {
    ripe: {
      name: 'MÛR',
      terms: ['MÛRIT'],
      core: `Entourée sur ses six côtés, une tuile MÛRIT et montre sa VALEUR${D}: le nombre de voisines qui lui ressemblent.`,
      stoneAsh: (red) =>
        `La pierre, les murs et le bord de la carte entourent aussi. Seules ${red} comptent la pierre comme une ressemblance.`,
      stone: 'La pierre, les murs et le bord de la carte entourent aussi; aucun ne ressemble.',
      cardLean:
        'Touche-la pour évaluer sa poche, puis choisis : RÉCOLTER tout de suite (ça paie plus tôt, et tes prochaines pioches penchent vers la couleur récoltée) ou la laisser grandir (une grosse poche paie plus que ses morceaux).',
      cardPlain:
        'Touche-la pour évaluer sa poche, puis choisis : RÉCOLTER tout de suite, ou la laisser grandir — une grosse poche paie plus que ses morceaux.',
    },
    pop: {
      name: 'RÉCOLTER',
      terms: ['RÉCOLTER', 'RÉCOLTE'],
      core: `RÉCOLTER encaisse une poche mûre${D}: ça paie des tuiles pour continuer à poser, et des points pour le score. Attendre laisse la poche grandir et paie plus, mais chaque pose coûte encore des tuiles, alors trop attendre peut finir la partie avant la récolte.`,
    },
    pocket: {
      name: 'POCHE',
      terms: ['POCHE'],
      core: 'Une POCHE, c’est une tuile mûre et toutes les tuiles mûres qui la touchent — elles se récoltent ensemble, d’un coup. Touche n’importe quelle tuile mûre pour évaluer sa poche; les boutons montrent ce qu’elle paie.',
    },
    worth: {
      name: 'VALEUR',
      terms: ['VALEUR'],
      core: 'La VALEUR compte combien des six côtés d’une tuile touchent une ressemblance — la même couleur, ou une tuile rare passe-partout. Une récolte marque la valeur totale de la poche, alors plus il en mûrit ensemble, plus ça paie.',
    },
    cache: {
      name: 'CACHE',
      terms: ['CACHE'],
      coreRing: (pays, perRing) =>
        `Une CACHE paie ${pays} tuiles sur-le-champ, +${perRing} par anneau de distance, dès que tu poses une tuile qui la touche. Les caches se réarment à chaque partie, alors un terrain déjà connu vaut encore le détour.`,
      core: (pays) =>
        `Une CACHE paie ${pays} tuiles sur-le-champ dès que tu poses une tuile qui la touche. Les caches se réarment à chaque partie, alors un terrain déjà connu vaut encore le détour.`,
    },
    site: {
      name: 'SITE',
      terms: ['SITE'],
      core: (pays) =>
        `Un SITE paie ${pays} points, × sa distance du départ, dès que tu le réclames — et il ouvre une PRIME. Les sites se réarment à chaque partie, alors un site réclamé vaut la peine d’y retourner.`,
    },
    shrine: {
      name: 'SANCTUAIRE',
      terms: ['SANCTUAIRE'],
      core: 'Un SANCTUAIRE allume un système pour ton monde, pour de bon, dès que tu le réclames. Une fois tous les sanctuaires éveillés, le suivant offre plutôt un passage vers un nouveau monde.',
    },
    territory: {
      name: 'TERRITOIRE',
      terms: ['TERRITOIRE'],
      core: (radius, tiles, cap) =>
        `Un TERRITOIRE rend le sol à ${radius} hex à la ronde natal de sa couleur, pour de bon.${
          tiles > 0
            ? ` Chacun que tu tiens fait commencer tes prochaines parties avec +${tiles} tuiles, jusqu’à +${cap}.`
            : ''
        }`,
    },
    stone: {
      name: 'PIERRE',
      terms: ['PIERRE'],
      coreAsh: (red) =>
        `La PIERRE, c’est du sol usé — ce qu’une tuile devient après sa récolte. Elle entoure encore ses voisines et les aide à mûrir, mais seules ${red} la comptent comme une ressemblance.`,
      core: 'La PIERRE, c’est du sol usé — ce qu’une tuile devient après sa récolte. Elle entoure encore ses voisines et les aide à mûrir, mais elle ne ressemble jamais.',
    },
    rare: {
      name: 'MAGIQUE',
      terms: ['MAGIQUE'],
      core: `MAGIQUE est passe-partout${D}: elle ressemble à chaque voisine, peu importe la couleur, et elles lui ressemblent en retour.`,
    },
    rareUnique: {
      name: 'UNIQUE',
      terms: ['UNIQUE'],
      core: `UNIQUE est passe-partout et pèse lourd${D}: chaque ressemblance qu’elle fait compte DOUBLE, des deux côtés.`,
    },
    luck: {
      name: 'CHANCE',
      terms: ['CHANCE'],
      core: `${LUCK_CORE} Chaque récolte en paie un peu, et la rangée sous ta main la dépense${D}: une nouvelle pioche, une couleur appelée, une tuile rare forgée.`,
    },
    relic: {
      name: 'RELIQUES',
      terms: ['RELIQUES', 'RELIQUE'],
      core: `Les reliques ne sont pas des points — elles achètent la PROCHAINE partie. Elles te suivent quand une partie finit, et LA BOUTIQUE de l’écran de fin les dépense${D}: chaque partie fait démarrer la suivante plus fort.`,
    },
    bounty: {
      name: 'PRIME',
      terms: ['PRIME'],
      core: (need, radius, bonus) =>
        `Une PRIME, c’est le deuxième paiement d’un site${D}: récolte ${need} tuiles ou plus à ${radius} hex de son étoile et cette récolte marque ×${bonus}. Elle est active dès que tu réclames le site, et n’importe quelle récolte à portée peut l’encaisser.`,
    },
    stash: {
      name: 'RÉSERVE',
      terms: ['RÉSERVE'],
      coreMany: (slots) =>
        `Les cartes pointillées GARDER mettent ${slots} tuiles de côté. Touches-en une pour y mettre la carte choisie; touche une carte gardée pour la reprendre en RÉSERVE contre ta tuile.`,
      coreOne:
        'La carte pointillée GARDER met une tuile de côté, en RÉSERVE. Touche-la pour y mettre la carte choisie; touche-la encore pour reprendre cette tuile.',
      more: 'Les tuiles gardées survivent à une repioche — garde une rare, ou la couleur qu’une poche attend.',
    },
    sizeBonus: {
      name: 'BONUS DE TAILLE',
      terms: ['BONUS DE TAILLE'],
      coreCapped: (cap) =>
        `Le BONUS DE TAILLE, c’est un point de multiplicateur par tuile dans une poche, jusqu’à ${cap}${D}: une plus grosse poche paie plus de valeur, mais passé ça, seulement plus de valeur, pas plus de multiplicateur.`,
      core: 'Le BONUS DE TAILLE, c’est un point de multiplicateur par tuile dans une poche — plus il s’en récolte ensemble, plus la valeur est multipliée.',
    },
  },
  luckCore: LUCK_CORE,
  rareStar: RARE_STAR,
  rareCard: 'Dépense-la là où beaucoup de tuiles se touchent.',
  lastGaspRule: LAST_GASP_RULE,

  view: {
    arc: {
      late: 'La partie a monté jusque-là — ta plus grosse récolte est tombée dans la dernière ligne droite.',
      mid: 'Ta plus grosse récolte est venue au milieu; la fin ne l’a jamais dépassée.',
      early: 'Ta plus grosse récolte est venue tôt — tout le reste a poussé dans son ombre.',
    },
    guide: {
      lowPopNow: 'Peu de tuiles — RÉCOLTE une poche maintenant',
      lowPopTiles: 'Peu de tuiles — RÉCOLTE une poche pour des tuiles',
      lowRipen: 'Peu de tuiles — fais mûrir quelque chose à RÉCOLTER',
      bountyReady: 'PRIME PRÊTE — RÉCOLTE cette poche en pts',
      tilesSpare: 'Plus de tuiles que tu peux en dépenser — RÉCOLTE pour des PTS dorénavant',
      pockets: (n) => (n > 1 ? `${n} poches prêtes` : 'Poche prête'),
      readySingle: (pockets) =>
        `${pockets} — touches-en une pour l’évaluer, puis RÉCOLTE ou sacrifie-la`,
      readyFork: (pockets) =>
        `${pockets} — touches-en une, puis RÉCOLTE pour des tuiles ou des pts`,
    },
    destination: {
      cache: (tiles) => `une cache de ${tiles} tuiles`,
      site: 'un site à points',
      shrine: 'un sanctuaire',
      territory: 'un territoire à réclamer',
    },
    hint: (destination, dist) => `${capitalize(destination)} luit à ${dist} de distance`,
    glows: {
      atEdge: (destination) => `${capitalize(destination)} luit encore, juste à ton bord.`,
      past: (destination, beyond) =>
        `${capitalize(destination)} luit encore à ${beyond} au-delà de ton bord.`,
    },
    odds: (magic, unique) => `magique ${pc(magic)} · unique ${pc(unique)}`,
    epitaph: {
      broke: [
        (p, cost) =>
          `Plus de tuiles sur la plaine, après ${p} poses. Elles coûtaient ${cost} chacune à la fin.`,
        (p, cost) =>
          `La bourse s’est vidée après ${p} poses — ${cost} la tuile à la fin, et plus rien pour la payer.`,
        (p, cost) =>
          `${p} poses, et la dernière tuile est tombée toute seule. La suivante aurait coûté ${cost}.`,
        (p, cost) => `L’expédition s’est dépensée${D}: ${p} poses, le prix monté à ${cost}.`,
        (p, cost) =>
          `Plus une tuile après ${p} poses. La plaine en demandait ${cost} chacune rendu là.`,
        (p, cost) => `La torche a porté ${p} poses. À ${cost} la tuile, le noir a eu la dernière.`,
        (p, cost) => `Chaque tuile dépensée — ${p} poses, le coût à ${cost} et la bourse à rien.`,
        (p, cost) =>
          `${p} poses, puis la main est revenue vide. Les tuiles étaient à ${cost} pièce à la fin.`,
      ],
      walled: [
        (p) => `Emmuré après ${p} poses — plus nulle part où bâtir, plus rien à récolter.`,
        (p) => `La pierre s’est refermée à ${p} poses. Chaque hex libre était pris.`,
        (p) => `${p} poses, et les murs ont eu le dernier mot.`,
        (p) => `Plus nulle part où se tenir après ${p} poses — la plaine a emmuré la partie.`,
        (p) =>
          `La partie s’est bâtie dans un coin${D}: ${p} poses, et plus un sol qu’une tuile pouvait prendre.`,
        (p) => `De la pierre de tous côtés après ${p} poses. Le passage ne s’est jamais ouvert.`,
      ],
      spent: (placements, unripe) =>
        `L’expédition est finie — ${placements} poses dépensées. ` +
        (unripe > 0
          ? `${unripe} tuile${pl(unripe, '', 's')} encore debout, jamais récoltée${pl(unripe, '', 's')}.`
          : `Tout ce que tu as bâti a été récolté.`),
    },
    rarity: {
      magic: `MAGIQUE — passe-partout${D}: elle ressemble à chaque tuile voisine, peu importe la couleur, et elles lui ressemblent en retour.`,
      unique: `UNIQUE — passe-partout et pèse lourd${D}: chaque ressemblance dont elle fait partie compte DOUBLE, des deux côtés.`,
    },
    pocket: {
      head: (count, worth) => `POCHE DE ${count} — valeur totale ${worth}.`,
      pays: (tiles, pts) => `RÉCOLTER paie +${tiles} tuiles et ${nb(pts)} pts.`,
      score: (worth, pocket, multiplier, bounty) =>
        `Le score${D}: valeur ${worth} × poche ${pocket} × distance ${multiplier}${bounty === null ? '' : ` × prime ${bounty}`}.`,
      bar: (count, cap) => `POCHE ${count}/${cap}`,
      treasure: (rarity) =>
        `RÉCOLTER pour le trésor${D}: une tuile ${rarity.toLocaleUpperCase('fr-CA')}.`,
      bounty: (bonus) =>
        `${LANDMARK_GLYPH.site} Cette poche encaisse la prime${D}: ×${bonus} sur son score.`,
      rares: (n) =>
        `${n} tuile${pl(n, '', 's')} rare${pl(n, '', 's')} là-dedans ser${pl(n, 'a', 'ont')} dépensée${pl(n, '', 's')} par la récolte.`,
    },
    harvest: {
      firstPop: `TA PREMIÈRE RÉCOLTE
La poche est devenue de la PIERRE — elle entoure encore, mais elle n’apparie jamais. Le sol déjà récolté s’appauvrit; le monde reste riche plus loin.`,
      firstPopWhen:
        'Petit et souvent achète de la CHANCE et oriente tes pioches. Gros et tard achète des tuiles et du score.',

      head: (count, worth) => `RÉCOLTÉ ${count} — valeur totale ${worth}`,
      bountyCollected: (bonus) => `${LANDMARK_GLYPH.site} Prime ×${bonus} — ENCAISSÉE.`,
      bountyMissed: (bonus, need, radius) =>
        `${LANDMARK_GLYPH.site} Prime ×${bonus} — manquée (+0). Récolte ${need} tuiles ou plus à ${radius} de l’étoile ${LANDMARK_GLYPH.site}.`,
      tiles: (tiles, perTile, worthPerExtra, depthRings) =>
        `+${tiles} tuiles${D}: ${perTile} par tuile, +1 de plus par ${worthPerExtra} de valeur${depthRings === null ? '' : `, +${depthRings} pour la profondeur`}.`,
      scored: (pts) => `+${nb(pts)} pts.`,
      luck: (gained, oddsRose) =>
        `Chance +${gained}.${oddsRose ? ' Tes chances de tuile rare viennent de monter.' : ''}`,
      treasure: (rarity) =>
        `Une tuile ${rarity.toLocaleUpperCase('fr-CA')} va dans ta réserve — pas de tuiles, pas de points.`,
      points: (pts, worth, counted, cap, multiplier, bounty) =>
        `+${nb(pts)} pts = valeur ${worth} × poche ${counted}${cap === null ? '' : ` (le bonus de taille s’arrête à ${cap})`} × distance ${multiplier}` +
        (bounty === null ? '' : ` × PRIME ${bounty}`),
    },
    purse: {
      redraw: (cost) => `REPIOCHER · ${cost} — jette cette main pour une nouvelle.`,
      steer: (mark, name, cost, draws) =>
        `${mark} ${name} · ${cost} — une main qui penche ${name}, et les ${draws} prochaines pioches avec.`,
      forge: (cost) => `FORGER · ${cost} — rends UNIQUE la carte que tu as choisie.`,
      sacrifice: (pct) =>
        `SACRIFIER LA CHANCE — TOUTE la bourse échangée contre des reliques à ${pc(pct)}, mieux que de mourir dessus.`,
      lostPartly: (pct) =>
        `la fin de la partie ne rend que ${pc(pct)} de ce qui reste, alors une bourse pleine sur laquelle tu meurs est presque toute perdue`,
      lostAll: 'ce qui reste à la fin de la partie est perdu net',
      lead: (lost) =>
        `${CONCEPT_MARK.luck}  LA CHANCE, ÇA SE DÉPENSE\n` +
        `Chaque bouton sous ta main se paie en chance — et tu PEUX tout perdre${D}: ${lost}. Dépense-la.`,
    },
    stat: {
      tiles:
        'TUILES — ce qui te garde en vie. Chaque pose en dépense; les récoltes, les caches et les territoires en redonnent. À zéro sans rien de mûr à récolter, la partie finit.',
      points:
        'POINTS — le score. Une poche récoltée en points paie sa valeur × sa taille × sa distance du départ.',
      luck: (rate) =>
        `${LUCK_CORE} La rangée sous ta main la dépense` +
        (rate === null
          ? '.'
          : `; ce qui reste à la fin de la partie revient en reliques, à ${pc(rate)}.`),
      reach: (step) =>
        `PORTÉE — jusqu’où tu as bâti depuis le départ. Chaque ${step} hex de plus monte le multiplicateur de distance de 1, alors la même poche marque plus loin qu’elle est récoltée.`,
      costCurveGrace: (base, grace, every) =>
        `Il reste à ${base} pour les ${grace} premières poses, puis monte de +1 toutes les ${every} poses`,
      costCurvePlain: (every) => `Il monte de +1 toutes les ${every} poses`,
      cost: (cost, curve) =>
        `COÛT — le prix de la prochaine pose${D}: ${cost}. ${curve}, et il ne redescend jamais — l’horloge qui finit chaque partie. ${LAST_GASP_RULE}`,
      left: 'RESTE — les poses qu’il reste à l’expédition. À zéro elle finit; ce qui est déjà mûr peut encore être récolté.',
    },
    colour: {
      green: (head, name, bonus) =>
        `${head} Veut une seule grosse gang de sa couleur${D}: +${bonus} de valeur par voisine ${name} passé la première.`,
      yellow: (head, bonus, all) =>
        `${head} Marque dans le sol mêlé${D}: +${bonus} de valeur par ${all ? 'voisine d’une autre couleur' : 'couleur différente à côté'}.`,
      red: (head, walls) =>
        `${head} La pierre${walls ? ' et les murs' : ''} compte${walls ? 'nt' : ''} comme des ressemblances pour elles${D}: elles se nourrissent du sol usé que tout le monde abandonne.`,
      blue: (head, every) =>
        `${head} Vaut peu au départ, beaucoup à la frontière${D}: +1 de valeur par ${every} hex de distance du départ.`,
    },
    power: {
      green: (head, name, bonus) =>
        ` · ${pw(head)}+${bonus} de valeur par voisine ${name} passé la première`,
      yellow: (head, bonus, all) =>
        ` · ${pw(head)}+${bonus} de valeur par ${all ? 'voisine d’une autre couleur' : 'couleur différente à côté'}`,
      // « à côté de NOM » : les huit noms de sol des quatre directions
      // commencent par une consonne, donc pas d’élision à faire. Une direction
      // qui nommerait un sol ÉTABLE ou ÎLE en aurait besoin — et ce serait ici.
      red: (head, name, walls) =>
        ` · ${pw(head)}la pierre${walls ? ' et les murs' : ''} à côté de ${name} compte${walls ? 'nt' : ''} comme des ressemblances`,
      blue: (head, every) => ` · ${pw(head)}+1 de valeur par ${every} hex de distance du départ`,
    },
    hex: {
      cacheClaimed: `${LANDMARK_GLYPH.cache} CACHE — déjà réclamée. Elle a donné ses tuiles.`,
      cache: (tiles) =>
        `${LANDMARK_GLYPH.cache} CACHE — pose une tuile qui la touche pour réclamer ${tiles} tuiles sur-le-champ.`,
      siteClaimed: `${LANDMARK_GLYPH.site} SITE — déjà réclamé.`,
      site: (pays, bonus) =>
        `${LANDMARK_GLYPH.site} SITE — réclame-le pour ${pays} pts × sa distance, et il ouvre une prime qui vaut ×${bonus}.`,
      shrineDetourClaimed: `${LANDMARK_GLYPH.shrine} SANCTUAIRE — éveillé. Sur ton propre monde, ça allume un système pour de bon.`,
      shrineDetour: `${LANDMARK_GLYPH.shrine} SANCTUAIRE — touche-le avec une tuile. Sur ton propre monde, en éveiller un allume un système pour de bon.`,
      shrineClaimed: `${LANDMARK_GLYPH.shrine} SANCTUAIRE — éveillé. Il a allumé un système pour ce monde.`,
      shrineCrossing: (dowry) =>
        `${LANDMARK_GLYPH.shrine} SANCTUAIRE — ce monde est tout éveillé, alors l’atteindre offre le passage${D}: un NOUVEAU MONDE, avec ${dowry} reliques emportées pour ce que tu laisses.`,
      shrine: (next) =>
        `${LANDMARK_GLYPH.shrine} SANCTUAIRE — réclame-le pour débloquer ${next ?? 'un système'} pour ce monde, pour de bon.`,
      findClaimed: `${LANDMARK_GLYPH.find} Une trouvaille cachée — dépensée. Elle a donné ce qu’elle avait.`,
      find: `${LANDMARK_GLYPH.find} Il y a quelque chose ici. Touche-le avec une tuile.`,
      territoryClaimed: (radius, owns) =>
        `${LANDMARK_GLYPH.territory} TERRITOIRE — à toi. Le sol à ${radius} hex à la ronde est natal de ${owns}.`,
      territory: (radius, owns) =>
        `${LANDMARK_GLYPH.territory} TERRITOIRE — réclame-le et le sol à ${radius} hex à la ronde devient natal de ${owns}, pour de bon.`,
      someColour: 'une couleur',
      chainOut: (sentence) => `${sentence} Fais grandir ta chaîne jusque-là.`,
      shimmers: 'Quelque chose scintille ici. Fais grandir ton sol jusque-là.',
      remembered: 'Souvenir d’une partie d’avant — cette partie n’a pas encore poussé ici.',
      dark: 'Sol noir — rien qu’aucune partie n’a encore vu. Pousse vers lui.',
      wallBuildable: (mult) =>
        `${CONCEPT_MARK.wall} Mur — tu peux bâtir dessus, à ${mult}× le coût de la pose.`,
      wall: `${CONCEPT_MARK.wall} Mur — on ne peut pas bâtir dessus.`,
      wallAsh: (standing, red) =>
        `${standing} Il entoure (alors il aide à mûrir) mais ne ressemble jamais, sauf pour ${red}, qui le comptent.`,
      wallPlain: (standing) =>
        `${standing} Il entoure (alors il aide à mûrir) mais ne ressemble jamais.`,
      stone: (red) =>
        `${CONCEPT_MARK.stone} Sol usé — une tuile récoltée. Il entoure mais ne ressemble jamais, sauf pour ${red}, qui s’en nourrissent.`,
      tile: (name, worth) =>
        `Tuile ${name}, valeur ${worth}. Elle mûrit quand ses six côtés sont couverts.`,
      open: 'Sol libre — tu peux bâtir ici dès que quelque chose à toi le touche.',
      native: (name) => `Sol natal de ${name} — une tuile ${name} ici vaut un de plus.`,
    },
  },

  perkRow: {
    gain: (text) => `TU GAGNES — ${text}`,
    lose: (text) => `TU PERDS — ${text}`,
    play: (text) => `COMMENT JOUER — ${text}`,
  },
  figure: {
    ripen: `Six côtés couverts${D}: la tuile du milieu est mûre, et vaut ce qui lui ressemble.`,
    destinations: 'Allumé, c’est non réclamé et ça paie encore. Éteint, tu l’as déjà dépensé.',
    place:
      'Les bords qui luisent sont là où une tuile peut aller. Le chiffre pâle est ce qu’elle paierait.',
    pop: 'Des tuiles mûres qui se touchent font UNE poche — elles se récoltent ensemble, et laissent de la pierre.',
    rare: `Une rare posée porte une étoile de sa couleur${D}: magique, puis unique.`,
    stash:
      'La case pointillée, c’est la réserve. Touche-la pour garder la carte choisie pour plus tard.',
    hold: 'GARDER',
    held: 'GARDÉE',
  },

  perk: {
    rootbound: {
      name: 'ENRACINÉ',
      note: `Le sol natal paie jusqu’à ${PERK_DIALS.rootboundNativeMax}×, et le sol qui n’est pas à toi paie moins — les deux se durcissent à mesure que ta chance se remplit.`,
      gain: `Ton propre sol paie ${PERK_DIALS.rootboundNative}× au départ et ${PERK_DIALS.rootboundNativeMax}× à pleine chance — le bonus du sol est compté d’abord, puis le tout multiplie.`,
      lose: `Le sol qui n’est pas à toi paie ${PERK_DIALS.rootboundStray}× au départ, et RIEN une fois ta chance pleine. Plus tes chances montent, moins la plaine pardonne.`,
      play: 'Pousse le long du champ d’UNE couleur et récolte dedans. Au début, une poche qui déborde paie encore quelque chose; amasse assez de chance et elle ne paie plus du tout, alors la règle se durcit exactement quand tu t’enrichis.',
    },
    secondwind: {
      name: 'SECOND SOUFFLE',
      note: `La première fois qu’une partie finirait à sec, on tire à pile ou face${D}: ${pc(Math.round(PERK_DIALS.secondWindChance * 100))} du temps tu continues avec ${PERK_DIALS.secondWindTiles} tuiles, et le reste du temps non.`,
      gain: `La première fois qu’une partie finirait À SEC, on tire à pile ou face${D}: ${pc(Math.round(PERK_DIALS.secondWindChance * 100))} du temps tu continues avec ${PERK_DIALS.secondWindTiles} tuiles.`,
      lose: 'Rien de ce que tu avais — mais la pièce ne se lance qu’une fois par partie, et seulement pour une fin À SEC. Toute autre fin reste une fin.',
      play: `Un sursis sur lequel tu ne peux pas compter, alors ça vaut une pose de plus que tu n’oserais, pas dix. Si la pièce tombe du bon bord, rejoins une poche et RÉCOLTE avant que les ${PERK_DIALS.secondWindTiles} tuiles soient parties.`,
    },
    stonewalker: {
      name: 'MARCHE-PIERRE',
      note: `Les poses à côté de la pierre coûtent ${PERK_DIALS.stoneDiscount} de moins.`,
      gain: `Les poses à côté de la pierre coûtent ${PERK_DIALS.stoneDiscount} de moins — jusqu’à gratuit, jamais en dessous.`,
      lose: 'Rien. Celui-là, c’est du rabais pur.',
      play: 'La pierre arrête d’être un sol à contourner et devient le sol le moins cher qui soit. Bâtis LE LONG d’une crête plutôt qu’en t’en éloignant.',
    },
    wallbreaker: {
      name: 'BRISE-MUR',
      note: `On peut bâtir sur les murs, à ${PERK_DIALS.wallBuildCostMult}× le coût.`,
      gain: 'On peut bâtir SUR les murs, ce que rien d’autre dans le jeu ne peut faire.',
      lose: `Une pose sur un mur coûte ${PERK_DIALS.wallBuildCostMult}× une pose normale, et les tuiles sont dépensées que la poche mûrisse un jour ou non.`,
      play: 'Un mur entoure sans jamais ressembler, alors en briser un JOINT deux poches qui n’auraient jamais pu se toucher. Ça vaut la peine pour fermer une grosse poche; jamais pour sauver un pas.',
    },
    openhand: {
      name: 'MAIN OUVERTE',
      note: `Pioche ${PERK_DIALS.openHandDraft} tuiles. Pas de réserve.`,
      gain: `Tu pioches ${PERK_DIALS.openHandDraft} tuiles à chaque main au lieu de la donne habituelle.`,
      lose: 'PAS DE RÉSERVE. L’étagère disparaît tant que tu le portes — rien ne peut être mis de côté pour plus tard.',
      play: `Plus de choix maintenant, rien de gardé. Prends la meilleure des ${PERK_DIALS.openHandDraft} à chaque tour au lieu de mettre une tuile de côté pour une poche à deux coups de là.`,
    },
  },
  upgrade: {
    tiles: {
      name: 'BOURSE PLUS PROFONDE',
      note: `+${UPGRADE_STEPS.tiles} tuiles au départ de chaque partie.`,
    },
    odds: {
      name: 'ŒIL PLUS FIN',
      note: 'Les tuiles magiques et uniques sortent plus souvent, à chaque partie, pour de bon.',
    },
    world: {
      name: 'MONDES PLUS RICHES',
      note: 'Plus de caches, de sites et de territoires à trouver là-bas — et des caches plus riches quand tu les atteins.',
    },
    pace: {
      name: 'PAS RÉGULIER',
      note: 'Les poses restent pas chères plus longtemps, à chaque partie, pour de bon.',
    },
    sense: {
      name: 'BON FLAIR',
      note: `Les trouvailles cachées scintillent quand ton sol pousse près d’elles — +${UPGRADE_STEPS.sense} hex de plus loin par niveau.`,
    },
  },
  onceARun: {
    newGround: 'TERRAIN NEUF — plus loin que ce monde n’est jamais allé.',
    unique: 'UNIQUE — chaque appariement compte double, des deux côtés.',
  },
  goalMet: (goal, relics) => `OBJECTIF ATTEINT — ${goal} · +${relics} reliques`,
  goal: {
    reach20: 'Atteindre 20 hex du départ',
    territories4: 'Tenir 4 territoires',
    known40: `Connaître ${pc(40)} du monde`,
    shrinesAll: 'Éveiller chaque sanctuaire',
    perksAll: 'Trouver chaque atout',
  },
  unlock: {
    draft: 'Une quatrième carte à piocher',
    hold: 'Une deuxième case de réserve',
    luck: 'Deux fois les chances de tuile rare',
    reach: 'Les destinations luisent de deux fois plus loin',
    camp: 'Les camps — les prochaines parties peuvent commencer à ton territoire le plus loin',
  },
  shed: {
    lastError:
      'Le stockage était plein — un rapport de diagnostic a été effacé pour que ta partie puisse être sauvegardée.',
    otherReceipts:
      'Le stockage était plein — des notes de tes autres mondes ont été effacées pour que ta partie puisse être sauvegardée.',
    timeline:
      'Le stockage était plein — ton journal a été effacé pour que ta partie puisse être sauvegardée. Tes mondes, tes reliques et tes atouts sont intacts.',
    otherWorlds:
      'Le stockage était plein — tes AUTRES mondes ont été oubliés pour que cette partie puisse être sauvegardée. Le monde où tu es est intact.',
  },
  feature: {
    'debug.overlay': {
      label: 'Calque de débogage',
      note: 'Affiche les chiffres bruts de la partie sous le plateau, pour signaler un bogue.',
    },
    'ui.sound': {
      label: 'Son',
      note: 'Quelques notes discrètes quand tu récoltes et réclames. Le bouton ♪ sur le plateau est ce même interrupteur.',
    },
  },
  // Le cadre bouge, les verbes ne bougent pas : ce sont ceux du glossaire (D4).
  tagline:
    'Un établissement au bord d’une plaine noire. Pose, fais mûrir, récolte, et pousse plus loin.',
  story: [
    'Quelqu’un est resté ici, autrefois. La plaine a tout repris.',
    'Tu sors au crépuscule avec une lampe et un peu de terrain — un champ, un étal, une entaille dans la pierre, un chemin — et tu le poses là où il rapporte.',
    'Ce que tu ramènes n’est jamais grand-chose. Cet endroit en a quand même plus qu’hier.',
  ],

  share: {
    run: (name, pts, placements, arc) =>
      `${name}${D}: ${nb(pts)} pts en ${placements} poses${arc === '' ? '' : ` · ${arc}`}. Bats ma partie${D}:`,
    daily: (name, day, pts, reach, arc, tries) =>
      `${name} ${day} · ${nb(pts)} pts · portée ${reach}${arc === '' ? '' : ` · ${arc}`} · ${ordinal(tries, 'fr-CA')} essai · bats-la${D}:`,
  },
  daily: {
    badge: (day, record, streak) =>
      `QUOTIDIEN ${day}` +
      (record === null
        ? ''
        : ` · meilleur ${nb(record.best)} · ${record.tries} essai${pl(record.tries, '', 's')}`) +
      (streak > 1 ? ` · ${streak} jours d’affilée` : ''),
  },
  claim: {
    cache: (tiles) => `CACHE RÉCLAMÉE
+${nb(tiles)} tuiles, sur-le-champ.`,
    site: (pts, need, radius, bonus) =>
      `SITE RÉCLAMÉ
+${nb(pts)} pts en banque — et cette étoile ouvre une PRIME${D}: récolte une poche de ${need}+ à moins de ${radius} hexes pour ×${bonus}.`,
    territory: (radius, owns) =>
      `TERRITOIRE RÉCLAMÉ
Le sol à moins de ${radius} hexes est natif de ${owns} maintenant — et il te reste entre les parties.`,
    shrine: (unlock) =>
      `SANCTUAIRE ÉVEILLÉ
${unlock}
À toi dès ta prochaine partie, dans ce monde pour de bon.`,
    shrineCrossing: (dowry, carried) =>
      `LE MONDE EST ÉVEILLÉ
Chaque déblocage est à toi — et ce sanctuaire est un passage. Traverse vers un NOUVEAU MONDE en emportant ${nb(dowry)} reliques pour ce que tu laisses${carried > dowry ? `, plus ${nb(carried - dowry)} de cette partie` : ''}. Tes reliques et tes trouvailles te suivent. Le sol, les territoires, les sanctuaires éveillés ici et tout ce que tu as ACHETÉ restent derrière. Ou reste, et continue de bâtir ce monde.`,
    crossLabel: (carried) => `TRAVERSER — emporter ${nb(carried)} reliques`,
    crossArmed: 'TOUCHE ENCORE — ce monde est oublié',
    stay: 'RESTER',
    shrineAwake: `SANCTUAIRE ÉVEILLÉ
Ce monde est entièrement éveillé — chaque déblocage est à toi.`,
    shrineDetour: `SANCTUAIRE ÉVEILLÉ
Sur ton propre monde, un sanctuaire allume un système pour de bon. Une partie partagée ne garde rien — mais elle compte quand même la prise.`,
    found: (perk, worn) =>
      `TROUVÉ — ${perk}
${worn ? 'Déjà porté — ça fonctionne à partir d’ici.' : 'À toi pour de bon, dans CE monde. PORTE-le dans LA BOUTIQUE, à l’écran de fin.'}`,
    findNothing: `UNE TROUVAILLE CACHÉE
Rien de neuf dedans — une trouvaille ne donne que ce que tu ne portes pas déjà, et seulement sur ton propre monde.`,
  },

  spent: {
    reroll: (paid) => `Une main neuve, pour ${nb(paid)} chance.`,
    steer: (name, draws, paid) =>
      `${name} chauffe${D}: une nouvelle main tirée sous cette couleur, et les ${draws} prochaines pioches penchent de son côté. ${nb(paid)} chance.`,
    forge: (paid) =>
      `Forgé UNIQUE — sauvage, et chaque appariement compte double, des deux côtés. ${nb(paid)} chance.`,
    tithe: (paid, relics) =>
      `${nb(paid)} chance sacrifiée pour ${nb(relics)} relique${pl(relics, '', 's')}.`,
  },

  backup: {
    describe: (worlds, relics, date) =>
      `${worlds} monde${pl(worlds, '', 's')} · ${nb(relics)} reliques${date === null ? '' : ` · ${date}`}`,
    fromV1: 'Vient d’Ashwake 1 — ces mondes seront transportés ici.',
    refused:
      'Ce n’est pas une sauvegarde d’Ashwake. Colle le texte au complet, de la première accolade à la dernière.',
    paste: 'Colle une sauvegarde ici',
    saved: (how) =>
      how === 'shared'
        ? 'Sauvegarde envoyée au menu de partage.'
        : how === 'downloaded'
          ? 'Sauvegarde enregistrée comme fichier.'
          : 'Sauvegarde copiée. Colle-la quelque part où tu l’auras encore le mois prochain.',
    failed:
      'Cet appareil a refusé de laisser sortir la sauvegarde. Rien n’est perdu. Essaie dans un onglet ordinaire.',
  },

  ui: {
    begin: 'COMMENCER',
    newRun: 'NOUVELLE PARTIE',
    mainMenu: 'MENU PRINCIPAL',
    settings: 'RÉGLAGES',
    restart: 'RECOMMENCER',
    newWorld: 'NOUVEAU MONDE',
    back: 'RETOUR',
    closeAll: 'TOUT FERMER',
    more: 'PLUS',
    daily: 'QUOTIDIEN',
    shop: 'LA BOUTIQUE',
    hold: 'GARDER',
    holdEmpty: 'Garder la tuile choisie pour plus tard',
    holdSwap: (ground) => `Reprendre la tuile ${ground} en réserve`,
    holdNothing: 'Rien en main à garder — touche d’abord une carte.',
    holdTrades: 'Touche d’abord une carte — la réserve échange, elle ne distribue pas.',
    pop: 'RÉCOLTER',
    take: 'PRENDRE',
    sacrifice: 'SACRIFIER',
    relicsPaid: (n) => `${nb(n)} relique${pl(n, '', 's')}`,
    luckPaid: (n) => `+${nb(n)} chance`,
    redraw: 'REPIOCHER',
    forge: 'FORGER',
    sacrificeLuck: 'SACRIFIER LA CHANCE',
    tabs: { menu: 'MENU', start: 'EXPÉDITION', play: 'JOUER', hand: 'MAIN', after: 'APRÈS' },
    language: 'LANGUE',
    languages: { 'fr-CA': 'FRANÇAIS', en: 'ENGLISH' },
    appearance: 'APPARENCE',
    auto: 'AUTO',
    sound: 'SON',
    resetTeaching: 'RÉINITIALISER LES LEÇONS',
    details: 'DÉTAILS',
    howToPlay: 'COMMENT JOUER',
    perkFound: (name) => `UNE TROUVAILLE — tu portes ${name} maintenant.`,
    woke: (what) => `ÉVEILLÉ — ${what}`,
    theMap: 'LE SOL QUE TU AS PARCOURU',
    expedition: {
      title: 'L’EXPÉDITION',
      lines: [
        'Tu marches vers une plaine noire. Tu poses des tuiles, elles mûrissent, tu récoltes, et tu pousses plus loin.',
        'Chaque pose coûte des tuiles. Récolter en redonne. Une partie finit quand tu n’en as plus — c’est la forme du jeu, pas une erreur de ta part.',
        'Les reliques rentrent avec toi. La boutique les dépense, alors la prochaine expédition commence plus forte que celle-ci.',
      ],
    },
    camera: { fit: 'CADRER', here: 'ICI', flat: 'À PLAT', home: 'DÉFAUT' },
    board: {
      label: 'Le plateau',
      reach:
        'Les flèches promènent un repère sur le plateau et disent ce qu’il touche. Entrée fait ce qu’un doigt ferait sur cette case.',
      keys: {
        title: 'CLAVIER',
        move: 'Flèches — promène le repère, et dit ce qu’il touche.',
        act: 'Entrée ou Espace — fait ce qu’un doigt ferait sur cette case.',
        pan: 'Majuscule et une flèche — fait glisser le plateau.',
        zoom: '+ et − — plus près, plus loin.',
        turn: 'Q et E, ou Origine et Fin — fait tourner le plateau.',
        lean: 'R et F, ou Page précédente et Page suivante — incline la caméra.',
        view: '0 — le bouton de vue, sans aller le chercher.',
        cards: '1 à 8 — prend cette carte dans la main.',
        hold: 'H — mets la carte choisie en RÉSERVE, ou reprends celle qui y est.',
        mouse:
          'Glisse avec le bouton droit, ou en tenant Majuscule, pour tourner et incliner. La roulette zoome.',
      },
    },
    resume: 'REPRENDRE',
    gotIt: 'COMPRIS',
    thisDevice: 'CET APPAREIL',
    noStorage:
      'Ce navigateur ne garde rien : ta partie ne survivra pas à la fermeture de l’onglet.',
    backUp: 'SAUVEGARDER MES MONDES',
    restore: 'RESTAURER UNE SAUVEGARDE',
    restoreArmed: 'TOUT REMPLACER SUR CET APPAREIL?',
    resetAll: 'TOUT EFFACER',
    resetAllArmed: 'EFFACER TOUS LES MONDES?',
    worlds: 'MES MONDES',
    worldN: (n) => `MONDE ${n}`,
    atlasRuns: 'PARTIES',
    atlasBest: 'MEILLEUR',
    atlasFarthest: 'PLUS LOIN',
    atlasKnown: 'CONNU',
    atlasTerritories: 'TERRITOIRES',
    atlasShrines: 'SANCTUAIRES',
    atlasFinds: 'TROUVAILLES',
    atlasUnlocked: 'DÉBLOQUÉ',
    emptyWorld: 'nouvelle partie',
    camp: (ring) => `PARTIR DU CAMP — ton territoire le plus loin, anneau ${ring}`,
    worn: 'PORTÉ',
    wear: 'PORTER',
    maxed: 'AU MAX',
    handEmpty: 'Ta main est vide — touche une carte en bas pour en prendre une.',
    lensOn: (ground) =>
      `Sol ${ground} dont on se souvient — chaque parcelle connue est éclairée. Touche encore le brouillard pour lâcher.`,
    lensOff: 'La lentille est éteinte.',
    newVersion: 'NOUVELLE VERSION — TOUCHER POUR CHARGER',
    share: 'PARTAGER',
    copied: 'COPIÉ',
    crash: {
      broke:
        'Quelque chose a brisé. Ta partie est sauvegardée — CONTINUER si le jeu fonctionne encore en dessous, RECHARGER sinon.',
      noWebgl:
        'Ashwake a besoin de WebGL pour dessiner son plateau, et ce navigateur ne l’a pas ou l’a désactivé. Essaie Safari ou Chrome — ou réactive l’accélération matérielle.',
      seen: (n) => `vu ×${n}`,
      continue: 'CONTINUER',
      reload: 'RECHARGER',
      send: 'ENVOYER LE RAPPORT',
      sending: 'ENVOI…',
      sent: 'ENVOYÉ — merci',
      sendFailed: 'PAS DE CONNEXION — réessaie ou copie',
      copy: 'COPIER LE RAPPORT',
      selectAbove: 'SÉLECTIONNE LE TEXTE CI-DESSUS',
      lastError: 'DERNIÈRE ERREUR',
      noError: 'Rien n’a brisé sur cet appareil.',
    },
    legendGrounds: 'LES SOLS',
    legendPlaces: 'LES DESTINATIONS',
    legendMarks: 'LES AUTRES MARQUES',
    legendRare: 'Une tuile rare posée porte une étoile de sa couleur.',
    legendStone: 'Sol dépensé — une tuile récoltée. Elle entoure, mais n’apparie jamais.',
    legendWall: 'Mur — impossible d’y bâtir. Il entoure quand même.',
    legendRipe: 'Bord MÛR — cette tuile est prête à récolter.',
    legendLegal: 'Bord permis — tu peux poser ici.',
    privacy: `Rien ne quitte ton téléphone${D}: pas de compte, pas d’analytique, pas de serveur. Partager n’envoie que ce que tu vois dans la feuille de partage, et un rapport de plantage seulement si tu touches ENVOYER LE RAPPORT.`,
  },
  payout: {
    heading: 'D’OÙ VIENNENT LES POINTS',
    byColour: 'PAR COULEUR',
    byRarity: 'PAR RARETÉ',
    bySource: 'PAR SOURCE',
    rarity: { common: 'COMMUNE', magic: 'MAGIQUE', unique: 'UNIQUE' },
    source: {
      matches: 'VOISINES PAREILLES',
      power: 'POUVOIR DE COULEUR',
      rare: 'TUILES RARES',
      native: 'TERRE NATALE',
      pocket: 'TAILLE DE LA POCHE',
      distance: 'DISTANCE',
      bounty: 'PRIMES',
    },
    sites: 'SITES RÉCLAMÉS',
    arc: 'LA COURBE DE LA PARTIE',
  },
};
