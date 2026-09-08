import { PERK_DIALS, UPGRADE_STEPS } from '@content/goals';
import { fmt1, fmtInt, fmtPct, NNBSP, ordinal } from './format';
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
 * - **Aucun tiret cadratin** (2026-08-30, Marc : « no em dashes ... be concise
 *   and simple »). Il en tenait 125 dans ce fichier, faisant à lui seul le
 *   travail du deux-points, du point, de la virgule et du point-médian. Un
 *   deux-points annonce, un point sépare, une virgule joint, et `·` découpe
 *   une étiquette. `text.test.ts` le vérifie, dans les deux langues.
 * - Les NOMS des sols sont des titres, jamais des noms communs avec article,
 *   pour que l’accord ne dépende jamais de la direction artistique chargée.
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
/** Une valeur qui peut porter une décimale, arrondie à un dixième. */
const d1 = (n: number): string => fmt1(n, 'fr-CA');
/** Le mot de pouvoir et son deux-points — avec l’espace fine, ou rien du tout.
 *  Voir `view#powerHead` : une direction dont le nom du sol dit déjà son
 *  pouvoir n’a rien à ajouter. */
const pw = (word: string): string => (word === '' ? '' : `${word}${D}: `);
const pc = (n: number): string => fmtPct(n, 'fr-CA');
const capitalize = (s: string): string => `${s[0]!.toLocaleUpperCase('fr-CA')}${s.slice(1)}`;

const LUCK_CORE = 'La CHANCE est une bourse, pas un score.';
const RARE_STAR =
  'Une tuile rare posée porte un anneau de sa couleur et se tient plus haute, pour que son pouvoir reste repérable sur une carte pleine.';
const LAST_GASP_RULE = `Tu peux poser tant qu’il te reste UNE tuile. La différence est pardonnée à zéro, et ça ne s’enchaîne pas${D}: seule une récolte te ramène au-dessus de zéro.`;
/** The cost curve and the reach rule, shared between the stat note and the
 *  manual's own sections (2026-09-03) — the `LUCK_CORE` pattern: one clause,
 *  two doors, no second wording to drift. */
const COST_CURVE_GRACE = (base: number, grace: number, every: number): string =>
  `Il reste à ${base} pour les ${grace} premières poses, puis monte de +1 toutes les ${every} poses`;
const COST_CURVE_PLAIN = (every: number): string => `Il monte de +1 toutes les ${every} poses`;
const REACH_RULE = (step: number): string =>
  `Chaque ${step} hex de plus monte le multiplicateur de distance de 1, alors la même poche marque plus loin qu’elle est récoltée.`;

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
        'Touche-la pour évaluer sa poche, puis choisis. RÉCOLTER tout de suite paie plus tôt et fait pencher tes prochaines pioches vers la couleur récoltée. Attendre la laisse grandir, et une grosse poche paie plus que ses morceaux.',
      cardPlain: `Touche-la pour évaluer sa poche, puis choisis${D}: RÉCOLTER tout de suite, ou la laisser grandir. Une grosse poche paie plus que ses morceaux.`,
    },
    pop: {
      name: 'RÉCOLTER',
      terms: ['RÉCOLTER', 'RÉCOLTE'],
      core: `RÉCOLTER encaisse une poche mûre${D}: ça paie des tuiles pour continuer à poser, et des points pour le score. Attendre laisse la poche grandir et paie plus, mais chaque pose coûte encore des tuiles, alors trop attendre peut finir la partie avant la récolte.`,
      lean: 'RÉCOLTER fait aussi pencher tes prochaines pioches vers la couleur récoltée.',
      when: 'Petit et souvent achète de la CHANCE et oriente tes pioches. Gros et tard achète des tuiles et du score.',
    },
    sacrifice: {
      name: 'SACRIFIER',
      // SACRIFICE is not here: a term has to appear in its own lesson
      // (`lessons.test.ts`), and the sentences say SACRIFIER — which is what
      // the button says too.
      terms: ['SACRIFIER'],
      core: `SACRIFIER brûle une poche mûre au lieu de l’encaisser${D}: pas de tuiles, pas de points, rien qui revienne dans cette partie.`,
      pays: `Ce que ça paie à la place, ce sont des RELIQUES, et les reliques te suivent quand la partie finit${D}: une poche que tu ne peux pas te permettre d’attendre achète la prochaine partie.`,
    },
    pocket: {
      name: 'POCHE',
      terms: ['POCHE'],
      core: 'Une POCHE, c’est une tuile mûre et toutes les tuiles mûres qui la touchent. Elles se récoltent ensemble, d’un coup. Touche n’importe quelle tuile mûre pour évaluer sa poche; les boutons montrent ce qu’elle paie.',
    },
    worth: {
      name: 'VALEUR',
      terms: ['VALEUR'],
      core: `La VALEUR compte combien des six côtés d’une tuile touchent une ressemblance${D}: la même couleur, ou une tuile rare passe-partout. Une récolte marque la valeur totale de la poche, alors plus il en mûrit ensemble, plus ça paie.`,
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
        `Un SITE paie ${pays} points × sa distance du départ dès que tu le réclames, et il ouvre une PRIME. Les sites se réarment à chaque partie, alors un site réclamé vaut la peine d’y retourner.`,
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
    find: {
      name: 'TROUVAILLE',
      terms: ['TROUVAILLES', 'TROUVAILLE'],
      core: 'Une TROUVAILLE, c’est un trésor enfoui. Touche-la avec une tuile et elle te donne un ATOUT, à toi pour de bon dans ce monde. Les trouvailles ne reviennent pas, et chacune ne donne que ce que tu ne portes pas déjà.',
    },
    stone: {
      name: 'PIERRE',
      terms: ['PIERRE'],
      coreAsh: (red) =>
        `La PIERRE, c’est du sol usé${D}: ce qu’une tuile devient après sa récolte. Elle entoure encore ses voisines et les aide à mûrir, mais seules ${red} la comptent comme une ressemblance.`,
      core: `La PIERRE, c’est du sol usé${D}: ce qu’une tuile devient après sa récolte. Elle entoure encore ses voisines et les aide à mûrir, mais elle ne ressemble jamais.`,
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
      core: `Les reliques ne sont pas des points. Elles achètent la PROCHAINE partie${D}: elles te suivent quand une partie finit, et LA BOUTIQUE de l’écran de fin les dépense, alors chaque partie démarre plus fort que la précédente.`,
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
      more: 'Les tuiles gardées survivent à une repioche. Garde une rare, ou la couleur qu’une poche attend.',
    },
    sizeBonus: {
      name: 'BONUS DE TAILLE',
      terms: ['BONUS DE TAILLE'],
      coreCapped: (cap) =>
        `Le BONUS DE TAILLE, c’est un point de multiplicateur par tuile dans une poche, jusqu’à ${cap}. Passé ça, une plus grosse poche paie plus de valeur, mais pas plus de multiplicateur.`,
      core: 'Le BONUS DE TAILLE, c’est un point de multiplicateur par tuile dans une poche. Plus il s’en récolte ensemble, plus la valeur est multipliée.',
    },
    costRise: {
      name: 'LE COÛT',
      terms: [],
      core: 'Chaque pose dépense des tuiles; la stat COÛT est le prix de la prochaine.',
      rises:
        'Le prix ne fait que monter; il ne redescend jamais. C’est l’horloge qui finit chaque partie.',
      curveGrace: (base, grace, every) => `${COST_CURVE_GRACE(base, grace, every)}.`,
      curvePlain: (every) => `${COST_CURVE_PLAIN(every)}.`,
    },
    reach: {
      name: 'PORTÉE',
      terms: [],
      core: 'La PORTÉE, c’est jusqu’où tu as bâti depuis le départ.',
      multiplier: (step) => REACH_RULE(step),
    },
    field: {
      name: 'TERRE NATALE',
      terms: [],
      core: `Le sol qu’un TERRITOIRE tient est natal de sa couleur${D}: une tuile de cette couleur posée là vaut un de plus.`,
    },
    lens: {
      name: 'LE BROUILLARD',
      terms: [],
      core: 'Le monde se souvient. Le sol que tu as parcouru reste sur la carte entre les parties, tamisé sous le brouillard, et les destinations non réclamées luisent au travers.',
    },
  },
  luckCore: LUCK_CORE,
  rareStar: RARE_STAR,
  rareCard: 'Dépense-la là où beaucoup de tuiles se touchent.',
  lastGaspRule: LAST_GASP_RULE,
  lensHint: 'Touche le brouillard dont tu te souviens pour éclairer son sol.',

  view: {
    groundHead: (name, word) => `${name}${D}: ${word}.`,
    arc: {
      late: `La partie a monté jusque-là${D}: ta plus grosse récolte est tombée dans la dernière ligne droite.`,
      mid: 'Ta plus grosse récolte est venue au milieu; la fin ne l’a jamais dépassée.',
      early: 'Ta plus grosse récolte est venue tôt, et tout le reste a poussé dans son ombre.',
    },
    guide: {
      lowPopNow: `Peu de tuiles${D}: RÉCOLTE une poche maintenant`,
      lowPopTiles: `Peu de tuiles${D}: RÉCOLTE une poche pour des tuiles`,
      lowRipen: `Peu de tuiles${D}: fais mûrir quelque chose à RÉCOLTER`,
      bountyReady: `PRIME PRÊTE${D}: RÉCOLTE cette poche en pts`,
      bountyReadySingle: `PRIME PRÊTE${D}: RÉCOLTE cette poche`,
      tilesSpare: 'Plus de tuiles que tu peux en dépenser. RÉCOLTE pour des PTS dorénavant',
      pockets: (n) => (n > 1 ? `${n} poches prêtes` : 'Poche prête'),
      readySingle: (pockets) =>
        `${pockets}. Touches-en une pour l’évaluer, puis RÉCOLTE ou sacrifie-la`,
      readyFork: (pockets) => `${pockets}. Touches-en une, puis RÉCOLTE pour des tuiles ou des pts`,
    },
    destination: {
      cache: (tiles) => `une cache de ${tiles} tuiles`,
      site: 'un site à points',
      shrine: 'un sanctuaire',
      territory: 'un territoire à réclamer',
    },
    hint: (destination, dist) => `${capitalize(destination)} luit à ${dist} de distance.`,
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
          `La bourse s’est vidée après ${p} poses. Les tuiles étaient à ${cost} pièce, et il ne restait rien pour les payer.`,
        (p, cost) =>
          `${p} poses, et la dernière tuile est tombée toute seule. La suivante aurait coûté ${cost}.`,
        (p, cost) => `L’expédition s’est dépensée${D}: ${p} poses, le prix monté à ${cost}.`,
        (p, cost) =>
          `Plus une tuile après ${p} poses. La plaine en demandait ${cost} chacune rendu là.`,
        (p, cost) => `La torche a porté ${p} poses. À ${cost} la tuile, le noir a eu la dernière.`,
        (p, cost) =>
          `Chaque tuile dépensée${D}: ${p} poses, le coût à ${cost} et la bourse à rien.`,
        (p, cost) =>
          `${p} poses, puis la main est revenue vide. Les tuiles étaient à ${cost} pièce à la fin.`,
      ],
      walled: [
        (p) => `Emmuré après ${p} poses. Plus nulle part où bâtir, plus rien à récolter.`,
        (p) => `La pierre s’est refermée à ${p} poses. Chaque hex libre était pris.`,
        (p) => `${p} poses, et les murs ont eu le dernier mot.`,
        (p) => `Plus nulle part où se tenir après ${p} poses. La plaine a emmuré la partie.`,
        (p) =>
          `La partie s’est bâtie dans un coin${D}: ${p} poses, et plus un sol qu’une tuile pouvait prendre.`,
        (p) => `De la pierre de tous côtés après ${p} poses. Le passage ne s’est jamais ouvert.`,
      ],
      spent: (placements, unripe) =>
        `L’expédition est finie${D}: ${placements} poses dépensées. ` +
        (unripe > 0
          ? `${unripe} tuile${pl(unripe, '', 's')} encore debout, jamais récoltée${pl(unripe, '', 's')}.`
          : `Tout ce que tu as bâti a été récolté.`),
    },
    rarity: {
      magic: `MAGIQUE est passe-partout${D}: elle ressemble à chaque tuile voisine, peu importe la couleur, et elles lui ressemblent en retour.`,
      unique: `UNIQUE est passe-partout et pèse lourd${D}: chaque ressemblance dont elle fait partie compte DOUBLE, des deux côtés.`,
    },
    pocket: {
      head: (count, worth) => `POCHE DE ${count}, valeur totale ${d1(worth)}.`,
      pays: (tiles, pts) => `RÉCOLTER paie +${tiles} tuiles et ${nb(pts)} pts.`,
      score: (worth, sizeBonus, multiplier, bounty, placedRate, rare) => {
        const added =
          (placedRate === null ? '' : ` + valeur ${d1(worth)} × ${d1(placedRate)} pour la pose`) +
          (rare === null ? '' : ` + valeur rare ${d1(rare.worth)} × ${d1(rare.rate)} en gros lot`);
        const product = `valeur ${d1(worth)} × bonus de taille ${d1(sizeBonus)} × distance ${multiplier}${added}`;
        return `Le score${D}: ${bounty === null ? product : added === '' ? `${product} × prime ${bounty}` : `(${product}) × prime ${bounty}`}.`;
      },
      bar: (count, cap) => `POCHE ${count}/${cap}`,
      treasure: (rarity) =>
        `RÉCOLTER pour le trésor${D}: une tuile ${rarity.toLocaleUpperCase('fr-CA')}.`,
      bounty: (bonus) => `Cette poche encaisse la prime${D}: ×${bonus} sur son score.`,
      rares: (n) =>
        `${n} tuile${pl(n, '', 's')} rare${pl(n, '', 's')} là-dedans ser${pl(n, 'a', 'ont')} dépensée${pl(n, '', 's')} par la récolte.`,
    },
    harvest: {
      firstPop: `TA PREMIÈRE RÉCOLTE
La poche est devenue de la PIERRE. Elle entoure encore, mais elle n’apparie jamais. Le sol déjà récolté s’appauvrit; le monde reste riche plus loin.`,

      head: (count, worth) => `RÉCOLTÉ ${count}, valeur totale ${d1(worth)}`,
      bountyCollected: (bonus) => `Prime ×${bonus}${D}: ENCAISSÉE.`,
      bountyMissed: (bonus, need, radius) =>
        `Prime ×${bonus}${D}: manquée (+0). Récolte ${need} tuiles ou plus à ${radius} du site.`,
      tiles: (tiles, perTile, worthPerExtra, depthRings) =>
        `+${tiles} tuiles${D}: ${perTile} par tuile, +1 de plus par ${worthPerExtra} de valeur${depthRings === null ? '' : `, +${depthRings} pour la profondeur`}.`,
      scored: (pts, worth, count, sizeBonus, cap, multiplier, bounty, rate, placedRate, rare) => {
        const added =
          (placedRate === null ? '' : ` + valeur ${d1(worth)} × ${d1(placedRate)} pour la pose`) +
          (rare === null ? '' : ` + valeur rare ${d1(rare.worth)} × ${d1(rare.rate)} en gros lot`);
        const product = `valeur ${d1(worth)} × bonus de taille ${d1(sizeBonus)} pour ${count} tuile${pl(count, '', 's')}${cap === null ? '' : ` (arrêté à ${cap})`} × distance ${multiplier}${added}`;
        const whole =
          bounty === null
            ? product
            : added === ''
              ? `${product} × PRIME ${bounty}`
              : `(${product}) × PRIME ${bounty}`;
        return `+${nb(pts)} pts = ${whole}, à ${pc(rate)} par récolte.`;
      },
      luck: (gained, oddsRose) =>
        `Chance +${gained}.${oddsRose ? ' Tes chances de tuile rare viennent de monter.' : ''}`,
      treasure: (rarity) =>
        `Une tuile ${rarity.toLocaleUpperCase('fr-CA')} va dans ta réserve. Pas de tuiles, pas de points.`,
      points: (pts, worth, count, sizeBonus, cap, multiplier, bounty, placedRate, rare) => {
        const added =
          (placedRate === null ? '' : ` + valeur ${d1(worth)} × ${d1(placedRate)} pour la pose`) +
          (rare === null ? '' : ` + valeur rare ${d1(rare.worth)} × ${d1(rare.rate)} en gros lot`);
        const product = `valeur ${d1(worth)} × bonus de taille ${d1(sizeBonus)} pour ${count} tuile${pl(count, '', 's')}${cap === null ? '' : ` (arrêté à ${cap})`} × distance ${multiplier}${added}`;
        return `+${nb(pts)} pts = ${bounty === null ? product : added === '' ? `${product} × PRIME ${bounty}` : `(${product}) × PRIME ${bounty}`}`;
      },
    },
    purse: {
      redraw: (cost) => `REPIOCHER · ${cost}. Jette cette main pour une nouvelle.`,
      steer: (name, cost, draws) =>
        `${name} · ${cost}. Une main qui penche ${name}, et les ${draws} prochaines pioches avec.`,
      forge: (cost) => `FORGER · ${cost}. Rends UNIQUE la carte choisie.`,
      sacrifice: (pct) =>
        `SACRIFIER LA CHANCE${D}: TOUTE la bourse échangée contre des reliques à ${pc(pct)}. Mieux que de mourir dessus.`,
      lostPartly: (pct) =>
        `la fin de la partie ne rend que ${pc(pct)} de ce qui reste, alors une bourse pleine sur laquelle tu meurs est presque toute perdue`,
      lostAll: 'ce qui reste à la fin de la partie est perdu net',
      lead: (lost) =>
        `LA CHANCE, ÇA SE DÉPENSE\n` +
        `Chaque bouton sous ta main se paie en chance, et tu PEUX tout perdre${D}: ${lost}. Dépense-la.`,
    },
    stat: {
      tiles: `TUILES${D}: ce qui te garde en vie. Chaque pose en dépense; les récoltes, les caches et les territoires en redonnent. À zéro sans rien de mûr à récolter, la partie finit.`,
      points: `POINTS${D}: le score. Une poche récoltée en points paie sa valeur × sa taille × sa distance du départ.`,
      luck: (rate) =>
        `${LUCK_CORE} La rangée sous ta main la dépense` +
        (rate === null
          ? '.'
          : `; ce qui reste à la fin de la partie revient en reliques, à ${pc(rate)}.`),
      reach: (step) => `PORTÉE${D}: jusqu’où tu as bâti depuis le départ. ${REACH_RULE(step)}`,
      costCurveGrace: COST_CURVE_GRACE,
      costCurvePlain: COST_CURVE_PLAIN,
      cost: (cost, curve) =>
        `COÛT${D}: le prix de la prochaine pose, ${cost}. ${curve}, et il ne redescend jamais. C’est l’horloge qui finit chaque partie. ${LAST_GASP_RULE}`,
      left: `RESTE${D}: les poses qu’il reste à l’expédition. À zéro elle finit; ce qui est déjà mûr peut encore être récolté.`,
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
      cacheClaimed: `CACHE${D}: déjà réclamée. Elle a donné ses tuiles.`,
      cache: (tiles) =>
        `CACHE${D}: pose une tuile qui la touche pour réclamer ${tiles} tuiles sur-le-champ.`,
      siteClaimed: `SITE${D}: déjà réclamé.`,
      site: (pays, bonus) =>
        `SITE${D}: réclame-le pour ${pays} pts × sa distance. Il ouvre une prime qui vaut ×${bonus}.`,
      shrineDetourClaimed: `SANCTUAIRE${D}: éveillé. Sur ton propre monde, ça allume un système pour de bon.`,
      shrineDetour: `SANCTUAIRE${D}: touche-le avec une tuile. Sur ton propre monde, en éveiller un allume un système pour de bon.`,
      shrineClaimed: `SANCTUAIRE${D}: éveillé. Il a allumé un système pour ce monde.`,
      shrineCrossing: (dowry) =>
        `SANCTUAIRE${D}: ce monde est tout éveillé, alors l’atteindre offre le passage. Un NOUVEAU MONDE, avec ${dowry} reliques emportées pour ce que tu laisses.`,
      shrineAwake: `SANCTUAIRE${D}: ce monde est tout éveillé. Il ne reste plus rien à débloquer, alors c’est une marche dont tu n’as pas besoin.`,
      shrine: (next) =>
        `SANCTUAIRE${D}: réclame-le pour débloquer ${next ?? 'un système'} pour ce monde, pour de bon.`,
      findClaimed: 'Une trouvaille cachée, dépensée. Elle a donné ce qu’elle avait.',
      find: 'Il y a quelque chose ici. Touche-le avec une tuile.',
      territoryClaimed: (radius, owns) =>
        `TERRITOIRE${D}: à toi. Le sol à ${radius} hex à la ronde est natal de ${owns}.`,
      territory: (radius, owns) =>
        `TERRITOIRE${D}: réclame-le et le sol à ${radius} hex à la ronde devient natal de ${owns}, pour de bon.`,
      someColour: 'une couleur',
      chainOut: (sentence) => `${sentence} Fais grandir ta chaîne jusque-là.`,
      shimmers: 'Quelque chose scintille ici. Fais grandir ton sol jusque-là.',
      remembered: 'Souvenir d’une partie d’avant. Cette partie n’a pas encore poussé ici.',
      dark: `Sol noir${D}: rien qu’aucune partie n’a encore vu. Pousse vers lui.`,
      wallBuildable: (mult) => `Mur${D}: tu peux bâtir dessus, à ${mult}× le coût de la pose.`,
      wall: `Mur${D}: on ne peut pas bâtir dessus.`,
      wallAsh: (standing, red) =>
        `${standing} Il entoure, alors il aide à mûrir, mais il ne ressemble jamais, sauf pour ${red}, qui le comptent.`,
      wallPlain: (standing) =>
        `${standing} Il entoure, alors il aide à mûrir, mais il ne ressemble jamais.`,
      stone: (red) =>
        `Sol usé, une tuile récoltée. Il entoure mais ne ressemble jamais, sauf pour ${red}, qui s’en nourrissent.`,
      tile: (name, worth) =>
        `Tuile ${name}, valeur ${worth}. Elle mûrit quand ses six côtés sont couverts.`,
      open: `Sol libre${D}: tu peux bâtir ici dès que quelque chose à toi le touche.`,
      native: (name) => `Sol natal de ${name}${D}: une tuile ${name} ici vaut un de plus.`,
    },
  },

  perkRow: {
    gain: (text) => `TU GAGNES${D}: ${text}`,
    lose: (text) => `TU PERDS${D}: ${text}`,
    play: (text) => `COMMENT JOUER${D}: ${text}`,
  },
  figure: {
    ripen: `Six côtés couverts${D}: la tuile du milieu est mûre, et vaut ce qui lui ressemble.`,
    destinations: 'Allumé, c’est non réclamé et ça paie encore. Éteint, tu l’as déjà dépensé.',
    place:
      'Les bords qui luisent sont là où une tuile peut aller. Le chiffre pâle est ce qu’elle paierait.',
    pop: 'Des tuiles mûres qui se touchent font UNE poche. Elles se récoltent ensemble, et laissent de la pierre.',
    rare: `Une rare posée porte un anneau de sa couleur${D}: magique, puis unique.`,
    stash:
      'La case pointillée, c’est la réserve. Touche-la pour garder la carte choisie pour plus tard.',
    hold: 'GARDER',
    held: 'GARDÉE',
  },

  perk: {
    rootbound: {
      name: 'ENRACINÉ',
      note: `Le sol natal paie jusqu’à ${PERK_DIALS.rootboundNativeMax}×, et le sol qui n’est pas à toi paie moins. Les deux se durcissent à mesure que ta chance se remplit.`,
      gain: `Ton propre sol paie ${PERK_DIALS.rootboundNative}× au départ et ${PERK_DIALS.rootboundNativeMax}× à pleine chance. Le bonus du sol est compté d’abord, puis le tout multiplie.`,
      lose: `Le sol qui n’est pas à toi paie ${PERK_DIALS.rootboundStray}× au départ, et RIEN une fois ta chance pleine. Plus tes chances montent, moins la plaine pardonne.`,
      play: 'Pousse le long du champ d’UNE couleur et récolte dedans. Au début, une poche qui déborde paie encore quelque chose; amasse assez de chance et elle ne paie plus du tout, alors la règle se durcit exactement quand tu t’enrichis.',
    },
    secondwind: {
      name: 'SECOND SOUFFLE',
      note: `La première fois qu’une partie finirait à sec, on tire à pile ou face${D}: ${pc(Math.round(PERK_DIALS.secondWindChance * 100))} du temps tu continues avec ${PERK_DIALS.secondWindTiles} tuiles, et le reste du temps non.`,
      gain: `La première fois qu’une partie finirait À SEC, on tire à pile ou face${D}: ${pc(Math.round(PERK_DIALS.secondWindChance * 100))} du temps tu continues avec ${PERK_DIALS.secondWindTiles} tuiles.`,
      lose: 'Rien de ce que tu avais. La pièce ne se lance qu’une fois par partie, et seulement pour une fin À SEC; toute autre fin reste une fin.',
      play: `Un sursis sur lequel tu ne peux pas compter, alors ça vaut une pose de plus que tu n’oserais, pas dix. Si la pièce tombe du bon bord, rejoins une poche et RÉCOLTE avant que les ${PERK_DIALS.secondWindTiles} tuiles soient parties.`,
    },
    stonewalker: {
      name: 'MARCHE-PIERRE',
      note: `Les poses à côté de la pierre coûtent ${PERK_DIALS.stoneDiscount} de moins.`,
      gain: `Les poses à côté de la pierre coûtent ${PERK_DIALS.stoneDiscount} de moins, jusqu’à gratuit et jamais en dessous.`,
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
      lose: 'PAS DE RÉSERVE. L’étagère disparaît tant que tu le portes, alors rien ne peut être mis de côté pour plus tard.',
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
      note: 'Plus de caches, de sites et de territoires à trouver là-bas, et des caches plus riches quand tu les atteins.',
    },
    pace: {
      name: 'PAS RÉGULIER',
      note: 'Les poses restent pas chères plus longtemps, à chaque partie, pour de bon.',
    },
    sense: {
      name: 'BON FLAIR',
      note: `Les trouvailles cachées scintillent quand ton sol pousse près d’elles, +${UPGRADE_STEPS.sense} hex de plus loin par niveau.`,
    },
  },
  onceARun: {
    newGround: `TERRAIN NEUF${D}: plus loin que ce monde n’est jamais allé.`,
    unique: `UNIQUE${D}: chaque appariement compte double, des deux côtés.`,
  },
  goalMet: (goal, relics) => `OBJECTIF ATTEINT${D}: ${goal} · +${relics} reliques`,
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
    camp: `Les camps${D}: les prochaines parties peuvent commencer à ton territoire le plus loin`,
  },
  shed: {
    lastError:
      'Le stockage était plein. Un rapport de diagnostic a été effacé pour que ta partie puisse être sauvegardée.',
    otherReceipts:
      'Le stockage était plein. Des notes de tes autres mondes ont été effacées pour que ta partie puisse être sauvegardée.',
    timeline:
      'Le stockage était plein. Ton journal a été effacé pour que ta partie puisse être sauvegardée; tes mondes, tes reliques et tes atouts sont intacts.',
    otherWorlds:
      'Le stockage était plein. Tes AUTRES mondes ont été oubliés pour que cette partie puisse être sauvegardée; le monde où tu es est intact.',
    lost: 'Le stockage est plein et cette partie ne peut pas être sauvegardée. Libère de l’espace sur ton appareil, ou finis la partie dans cet onglet.',
  },
  feature: {
    'debug.overlay': {
      label: 'Calque de débogage',
      note: 'Affiche les chiffres bruts de la partie sous le plateau, pour signaler un bogue.',
    },
    'ui.sound': {
      label: 'Son',
      note: 'Quelques notes discrètes quand tu récoltes et réclames.',
    },
    'ui.haptics': {
      label: 'Vibrations',
      note: 'Une brève vibration quand tu poses, récoltes et réclames.',
    },
  },
  // Le cadre bouge, les verbes ne bougent pas : ce sont ceux du glossaire (D4).
  story: [
    'Un établissement au bord d’une plaine noire. Le sol connaît déjà ton pas.',
    'Personne ne se souvient qui est resté ici le premier. Certains soirs, on dirait que c’était toi.',
    `Tu sors au crépuscule avec une lampe et un peu de terrain${D}: un champ, un étal, une entaille dans la pierre, un chemin. Tu le poses là où il rapporte, sur un sol qui semble déjà l’attendre.`,
    'Ce que tu ramènes n’est jamais grand-chose. Cet endroit en a plus qu’hier, certains soirs plus que ce que tu te souviens d’y avoir laissé.',
  ],

  share: {
    run: (name, pts, placements, arc) =>
      `${name}${D}: ${nb(pts)} pts en ${placements} poses${arc === '' ? '' : ` · ${arc}`}. Bats ma partie${D}:`,
    daily: (name, day, pts, reach, arc, tries) =>
      `${name} ${day} · ${nb(pts)} pts · portée ${reach}${arc === '' ? '' : ` · ${arc}`} · ${ordinal(tries, 'fr-CA')} essai · bats-la${D}:`,
    cardScore: (points) => `${nb(points)} pts`,
    cardReach: (reach) => `PORTÉE ${reach}`,
    cardSeed: (seed) => `GRAINE ${seed}`,
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
+${nb(pts)} pts en banque, et cette étoile ouvre une PRIME${D}: récolte une poche de ${need}+ à moins de ${radius} hexes pour ×${bonus}.`,
    territory: (radius, owns) =>
      `TERRITOIRE RÉCLAMÉ
Le sol à moins de ${radius} hexes est natif de ${owns} maintenant, et il te reste entre les parties.`,
    shrine: (unlock) =>
      `SANCTUAIRE ÉVEILLÉ
${unlock}
À toi dès ta prochaine partie, dans ce monde pour de bon.`,
    shrineCrossing: (dowry, carried) =>
      `LE MONDE EST ÉVEILLÉ
Chaque déblocage est à toi, et ce sanctuaire est un passage. Traverse vers un NOUVEAU MONDE en emportant ${nb(dowry)} reliques pour ce que tu laisses${carried > dowry ? `, plus ${nb(carried - dowry)} de cette partie` : ''}. Tes reliques et tes trouvailles te suivent. Le sol, les territoires, les sanctuaires éveillés ici et tout ce que tu as ACHETÉ restent derrière. Ou reste, et continue de bâtir ce monde.`,
    crossLabel: (carried) => `TRAVERSER · EMPORTER ${nb(carried)} RELIQUES`,
    crossArmed: `TOUCHE ENCORE${D}: CE MONDE EST OUBLIÉ`,
    stay: 'RESTER',
    shrineAwake: `SANCTUAIRE ÉVEILLÉ
Ce monde est entièrement éveillé. Chaque déblocage est à toi.`,
    shrineDetour: `SANCTUAIRE ÉVEILLÉ
Sur ton propre monde, un sanctuaire allume un système pour de bon. Une partie partagée ne garde rien, mais elle compte quand même la prise.`,
    found: (perk, worn) =>
      `TROUVÉ${D}: ${perk}
${worn ? 'Déjà porté, ça fonctionne à partir d’ici.' : 'À toi pour de bon, dans CE monde. PORTE-le ici pour jouer sous son effet dès cette pose.'}`,
    findNothing: `UNE TROUVAILLE CACHÉE
Rien de neuf dedans. Une trouvaille ne donne que ce que tu ne portes pas déjà, et seulement sur ton propre monde.`,
  },

  spent: {
    reroll: (paid) => `Une main neuve, pour ${nb(paid)} chance.`,
    steer: (name, draws, paid) =>
      `${name} chauffe${D}: une nouvelle main tirée sous cette couleur, et les ${draws} prochaines pioches penchent de son côté. ${nb(paid)} chance.`,
    forge: (paid) =>
      `Forgé UNIQUE${D}: sauvage, et chaque appariement compte double, des deux côtés. ${nb(paid)} chance.`,
    tithe: (paid, relics) =>
      `${nb(paid)} chance sacrifiée pour ${nb(relics)} relique${pl(relics, '', 's')}.`,
  },

  backup: {
    describe: (worlds, relics, date) =>
      `${worlds} monde${pl(worlds, '', 's')} · ${nb(relics)} reliques${date === null ? '' : ` · ${date}`}`,
    fromV1: 'Vient d’Ashwake 1. Ces mondes seront transportés ici.',
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
    daily: 'QUOTIDIEN',
    shop: 'LA BOUTIQUE',
    hold: 'GARDER',
    holdEmpty: 'Garder la tuile choisie pour plus tard',
    holdSwap: (ground) => `Reprendre la tuile ${ground} en réserve`,
    holdNothing: 'Rien en main à garder. Touche d’abord une carte.',
    holdTrades: `Touche d’abord une carte${D}: la réserve échange, elle ne distribue pas.`,
    pop: 'RÉCOLTER',
    take: 'PRENDRE',
    sacrifice: 'SACRIFIER',
    relicsPaid: (n) => `${nb(n)} relique${pl(n, '', 's')}`,
    luckPaid: (n) => `+${nb(n)} chance`,
    redraw: 'REPIOCHER',
    forge: 'FORGER',
    sacrificeLuck: 'SACRIFIER LA CHANCE',
    sacrificeLuckFor: (relics) => `SACRIFIER LA CHANCE POUR ${relics}`,
    tabs: { start: 'EXPÉDITION', play: 'JOUER', hand: 'MAIN' },
    fame: { title: 'TEMPLE DE LA RENOMMÉE', diary: 'JOURNAL', totals: 'TOTAUX' },
    tabGrows: 'il y a plus à venir ici en jouant',
    language: 'LANGUE',
    languages: { 'fr-CA': 'FRANÇAIS', en: 'ENGLISH' },
    appearance: 'APPARENCE',
    auto: 'AUTO',
    sound: 'SON',
    soundOn: 'Le son est allumé. Touche pour couper.',
    soundOff: 'Le son est coupé. Touche pour l’allumer.',
    menu: 'MENU',
    menuGroups: { play: 'JOUER', record: 'TON PARCOURS', device: 'CET APPAREIL' },
    luckPurse: (luck) => `CHANCE${D}: ${luck}. Ouvre la bourse.`,
    resetTeaching: 'RÉINITIALISER LES LEÇONS',
    details: 'DÉTAILS',
    theStory: 'L’HISTOIRE',
    howToPlay: 'COMMENT JOUER',
    perkFound: (name) => `UNE TROUVAILLE${D}: tu portes ${name} maintenant.`,
    woke: (what) => `ÉVEILLÉ${D}: ${what}`,
    theMap: 'LE SOL QUE TU AS PARCOURU',
    walkTheMap: 'Déplace-toi sur le plateau que tu as laissé.',
    backToEnding: 'RETOUR À LA FIN',
    expedition: {
      title: 'L’EXPÉDITION',
      lines: [
        'Tu marches vers une plaine noire. Tu poses des tuiles, elles mûrissent, tu récoltes, et tu pousses plus loin.',
        'Chaque pose coûte des tuiles. Récolter en redonne. Une partie finit quand tu n’en as plus, et c’est la forme du jeu, pas une erreur de ta part.',
        'Les reliques rentrent avec toi. La boutique les dépense, alors la prochaine expédition commence plus forte que celle-ci.',
      ],
    },
    camera: { flat: 'À PLAT', home: 'DÉFAUT', mine: 'MA VUE' },
    sharpness: {
      label: 'NETTETÉ',
      note: 'Combien de l’écran le plateau dessine vraiment. Plus net, mais plus énergivore.',
    },
    board: {
      label: 'Le plateau',
      reach:
        'Les flèches promènent un repère sur le plateau et disent ce qu’il touche. Entrée fait ce qu’un doigt ferait sur cette case.',
      keys: {
        title: 'CLAVIER',
        move: `Flèches${D}: promène le repère, et dit ce qu’il touche.`,
        act: `Entrée ou Espace${D}: fait ce qu’un doigt ferait sur cette case.`,
        pan: `Majuscule et une flèche${D}: fait glisser le plateau.`,
        zoom: `+ et −${D}: plus près, plus loin.`,
        turn: `Q et E, ou Origine et Fin${D}: fait tourner le plateau.`,
        lean: `R et F, ou Page précédente et Page suivante${D}: incline la caméra.`,
        view: `0${D}: le bouton de vue, sans aller le chercher.`,
        cards: `1 à 8${D}: prend cette carte dans la main.`,
        hold: `H${D}: mets la carte choisie en RÉSERVE, ou reprends celle qui y est.`,
        mouse:
          'Glisse avec le bouton droit, ou en tenant Majuscule, pour tourner et incliner. La roulette zoome.',
      },
    },
    resume: 'REPRENDRE',
    fromTerritories: (tiles) => `+${tiles} tuiles des territoires que tu tiens.`,
    gotIt: 'COMPRIS',
    thisDevice: 'CET APPAREIL',
    noStorage: `Ce navigateur ne garde rien${D}: ta partie ne survivra pas à la fermeture de l’onglet.`,
    backUp: 'SAUVEGARDER MES MONDES',
    restore: 'RESTAURER UNE SAUVEGARDE',
    restoreArmed: 'TOUT REMPLACER SUR CET APPAREIL?',
    resetAll: 'TOUT EFFACER',
    resetAllArmed: 'EFFACER TOUS LES MONDES?',
    restartArmed: 'FINIR CETTE PARTIE ET RECOMMENCER?',
    resetTeachingArmed: 'REVOIR TOUTES LES LEÇONS?',
    newWorldArmed: (n) => `ABANDONNER LE MONDE ${nb(n)} ET TOUT SON TERRAIN?`,
    worlds: 'MES MONDES',
    worldN: (n) => `MONDE ${n}`,
    perksFound: 'ATOUTS TROUVÉS',
    noPerksYet: 'Aucun pour l’instant. Les trouvailles cachées sont là, dehors.',
    atlasRuns: 'PARTIES',
    atlasBest: 'MEILLEUR',
    atlasFarthest: 'PLUS LOIN',
    atlasKnown: 'CONNU',
    atlasTerritories: 'TERRITOIRES',
    atlasShrines: 'SANCTUAIRES',
    atlasFinds: 'TROUVAILLES',
    atlasUnlocked: 'DÉBLOQUÉ',
    survey: 'L’ARPENTAGE',
    thisWorld: 'CE MONDE',
    emptyWorld: 'nouvelle partie',
    which: {
      title: 'QUELLE PARTIE',
      nowWorld: `EN CE MOMENT${D}: TON PROPRE MONDE. Tout ce manuel s’applique.`,
      nowShared: `EN CE MOMENT${D}: UNE PARTIE PARTAGÉE. Rien de ce qui suit sur garder ou acheter ne s’applique ici.`,
      nowDaily: `EN CE MOMENT${D}: LE QUOTIDIEN. Rien de ce qui suit sur garder ou acheter ne s’applique ici.`,
      world:
        'TON MONDE est un des trois que cet appareil garde. Il se souvient d’une partie à l’autre, et se joue avec tout ce que tu as acheté et trouvé.',
      shared: `UNE PARTIE PARTAGÉE est un lien qui porte une graine. Le monde de quelqu’un d’autre, joué nu${D}: pas d’améliorations, pas d’atout, rien de gardé.`,
      daily:
        'LE QUOTIDIEN est un monde que tout le monde reçoit pour cette date. Joué nu, tes essais comptés, ton propre monde intact.',
      howToShare: 'PARTAGER, à la fin d’une partie, transforme la tienne en un tel lien.',
    },
    beginShared: 'COMMENCER · PARTIE PARTAGÉE',
    beginDaily: (day) => `COMMENCER LE QUOTIDIEN ${day}`,
    settleWorld: (slot) => `S’ÉTABLIR ICI · garder la graine comme MONDE ${slot}`,
    settleNote: `La graine devient un monde à toi${D}: neuf, inexploré, et joué avec tes reliques et ses propres sanctuaires à partir de là. Cette partie reste exactement telle quelle.`,
    cameByLink: 'Ce monde t’est arrivé par un lien. Il repart par le même chemin.',
    ending: {
      scored: (n) => `Partie terminée${D}: ${nb(n)} point${pl(n, '', 's')}`,
      newBest: 'NOUVEAU RECORD',
      shortOfBest: (n) => `${nb(n)} sous le record`,
      run: (n) => `PARTIE ${n}`,
      try: (n) => `ESSAI ${n}`,
      tryAgain: 'REJOUER',
      continueInWorld: 'CONTINUER DANS MON MONDE',
      importInto: `GARDE CE PLATEAU COMME L’UN DE TES MONDES${D}:`,
      importKeeps:
        'Le terrain que tu as parcouru te suit. Les reliques, les sanctuaires et le score restent au quotidien.',
      relicsBanked: (n) => `${nb(n)} reliques mises de côté`,
      placements: 'POSES',
      popped: 'RÉCOLTES',
      biggestPop: 'PLUS GROSSE',
      biggestPopAt: (points, pct) => `${nb(points)} à ${pc(pct)}`,
      destinations: 'DESTINATIONS',
      bounties: 'PRIMES',
      none: '0',
    },
    camp: (ring) => `PARTIR DU CAMP · ton territoire le plus loin, anneau ${ring}`,
    stats: { tiles: 'TUILES', points: 'PTS', map: 'PORTÉE', cost: 'COÛT', left: 'RESTE' },
    flag: { on: 'ACTIVÉ', off: 'DÉSACTIVÉ', notBuilt: 'PAS ENCORE FAIT' },
    worn: 'PORTÉ',
    wear: 'PORTER',
    takeOff: 'RETIRER',
    maxed: 'AU MAX',
    buy: (name, price) => `Acheter ${name} pour ${nb(price)} reliques`,
    relicsHeld: (n) => `${nb(n)} relique${pl(n, '', 's')}`,
    perksTally: (found, all) =>
      `${nb(found)} atout${pl(found, '', 's')} trouvé${pl(found, '', 's')} sur ${nb(all)}`,
    handEmpty: 'Ta main est vide. Touche une carte en bas pour en prendre une.',
    lensOn: (ground) =>
      `Sol ${ground} dont on se souvient${D}: chaque parcelle connue est éclairée. Touche encore le brouillard pour lâcher.`,
    lensOff: 'La lentille est éteinte.',
    lensClear: 'ÉTEINDRE',
    lensClearLabel: (ground) => `Éteindre la lentille ${ground}`,
    newVersion: 'NOUVELLE VERSION · TOUCHER POUR CHARGER',
    install: 'INSTALLER ASHWAKE',
    inApp:
      'Tu es dans le navigateur d’une autre application, et ton monde risque de ne pas être gardé ici. Ouvre cette page dans Safari ou Chrome pour le garder.',
    dismiss: 'Pas maintenant',
    share: 'PARTAGER',
    copied: 'COPIÉ',
    shareFailed: 'PARTAGE IMPOSSIBLE',
    crash: {
      broke:
        'Quelque chose a brisé. Ta partie est sauvegardée. CONTINUER si le jeu fonctionne encore en dessous, RECHARGER sinon.',
      noWebgl:
        'Ashwake a besoin de WebGL pour dessiner son plateau, et ce navigateur ne l’a pas ou l’a désactivé. Essaie Safari ou Chrome, ou réactive l’accélération matérielle.',
      seen: (n) => `vu ×${n}`,
      continue: 'CONTINUER',
      reload: 'RECHARGER',
      send: 'ENVOYER LE RAPPORT',
      sending: 'ENVOI…',
      sent: 'ENVOYÉ, merci',
      sendFailed: 'PAS DE CONNEXION, réessaie ou copie',
      copy: 'COPIER LE RAPPORT',
      selectAbove: 'SÉLECTIONNE LE TEXTE CI-DESSUS',
      lastError: 'DERNIÈRE ERREUR',
      noError: 'Rien n’a brisé sur cet appareil.',
    },
    legendGrounds: 'LES SOLS',
    legendPlaces: 'LES DESTINATIONS',
    legendMarks: 'LES AUTRES MARQUES',
    legendRare: 'Une tuile rare posée porte un anneau de sa couleur, et se tient plus haute.',
    legendWall: `Mur${D}: impossible d’y bâtir. Il entoure quand même.`,
    legendRipe: `Bord MÛR${D}: cette tuile est prête à récolter.`,
    legendLegal: `Bord permis${D}: tu peux poser ici.`,
    privacy: `Rien ne quitte ton téléphone${D}: pas de compte, pas d’analytique, pas de serveur. Partager n’envoie que ce que tu vois dans la feuille de partage, et un rapport de plantage seulement si tu touches ENVOYER LE RAPPORT.`,
  },
  payout: {
    heading: 'D’OÙ VIENNENT LES POINTS',
    byColour: 'PAR COULEUR',
    byRarity: 'PAR RARETÉ',
    bySource: 'PAR SOURCE',
    rarity: { common: 'COMMUNE', magic: 'MAGIQUE', unique: 'UNIQUE' },
    treasureCount: (n, rarity) => `${nb(n)} ${rarity}`,
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
    pops: 'RÉCOLTES',
    reachBonus: (reach, per) => `PORTÉE ${reach} × ${per}`,
    claimBonus: (claims, per) => `RÉCLAMÉS ${claims} × ${per}`,
    total: 'TOTAL',
  },
};
