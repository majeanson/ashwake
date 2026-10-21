# STRANGER.md — a reader who meets the lessons as the game delivers them

Written by `pnpm stranger`. **Do not edit by hand** — regenerate it.

2026-10-21. The stranger is a Claude Code subagent (Haiku) on the subscription, one `pnpm stranger:play` per turn, graded by Claude Code, by hand, against the manual. 4 condition(s) × 3 seed(s), seeds 1–3, the first-run economy (`shell/economy.ts`, `home`, nothing earned). Played one turn at a time with `pnpm stranger:play`: the player is a Claude Code subagent that was told never to read this repository and whose transcript shows only those commands; its memory is its own context, every screen and every line the game said, whole.

**What it cannot see:** the pictures on the cards (their captions are given), the glow on a legal edge (given as a list), the ripe ring (an asterisk), a lit cue (nothing), and the camera. It reads perfectly and never gets bored; it never mis-taps, so it has nothing to undo, and it rarely explores — `annuler` and `toucher` going unused says little about the game (2026-10-21, Marc’s ruling). This measures the words and their timing, not the screen — the screen is Session C’s (`PLAYTEST.md`).

## The table

The sim’s own columns (`sim/report.ts`), the stranger’s rows beside the scripted floor and ceiling on the same seeds and economy.

```
policy           runs  points  best  depth  max  reach  places  harvests  claims  quests  relics  %tiles  pops/place   arc  stalled  capped
---------------  ----  ------  ----  -----  ---  -----  ------  --------  ------  ------  ------  ------  ----------  ----  -------  ------
random-legal        3     104   141    5.0    7      5      24         1       0       0       0      50        0.07  0.92        0       0
blind               3     219   318    5.0    5      5      56         9       0       0       5     100        0.62  0.39        0       0
bank20              3     926  1013   10.0   11     10      98        17       1       0      11     100        0.62  0.45        0       0
stranger:drip       3     513   552    8.0    9      8      70        34       1       0      16     100        0.57  0.64        0       0
stranger:ask        2     375   490    8.0    9      8      60        24       1       0      12     100        0.51  0.70        0       0
stranger:flood      2     564   597    9.0    9      9      79        40       1       0      16     100        0.59  0.75        0       0
stranger:silent     2     300   382    8.0    9      8      63        32       0       0      13     100        0.58  0.53        0       0
```

stalled/capped on a stranger row is the player, not a rule: a stall is eight turns in a row that changed nothing.

## drip — the cards, lines and coach at their moments, as the phone delivers them

### Untaught — offered, never made

In every run: **annuler**. Per run: seed 1: toucher, annuler · seed 2: annuler, bourse, stat · seed 3: toucher, annuler, depenser, stat.

### Confusions — a belief that contradicts a lesson already told

- seed 1, turn 27, **RÉCOLTER**: « La poche en -1,-2 est mûre et rapporte 3 tuiles et 5 points. Je la récolte pour ne pas laisser la valeur s'user. » — RÉCOLTER (dit au tour 9) : « Une poche mûre n’expire jamais ». Le joueur croit qu’une poche laissée perd de la valeur.

### Quiz — one sentence per concept, after the run

seed 1 (died, 513 pts, 81 places, 40 harvests):

- expedition: « Je pense que c'est la partie entière : on sort avec quelques tuiles, on pose et on récolte jusqu'à ce qu'il n'en reste plus. » — **juste** (Sortir avec quelques tuiles, poser et récolter jusqu’à ce qu’il n’en reste plus : c’est la forme du jeu telle que la carte la dit.)
- ripe: « Une tuile mûre est entourée sur ses six côtés, et sa valeur compte ses voisines de même couleur. » — **juste** (Six côtés, valeur = voisines de même couleur.)
- pop: « Récolter encaisse une poche mûre : ça rend des tuiles, des points et de la chance, et ça laisse de la pierre. » — **juste** (Tuiles, points, chance, et la pierre laissée.)
- end: « La fin arrive quand il ne reste plus de tuiles et plus rien de mûr à récolter ; la chance restante ne rapporte que 5 %. » — **juste** (Plus de tuiles et rien de mûr; la chance restante ne rend que 5 %.)
- map: « La carte se souvient entre les parties ; les caches et sites lointains paient quand une tuile les touche. Je ne suis pas sûr de tout ce qu'ils font. » — **juste** (Le monde se souvient entre les parties; les destinations paient quand une tuile les touche.)
- caravan: « Je ne sais pas vraiment : la caravane est apparue en fin de partie avec la mention EN VILLE, je n'ai pas compris son rôle. » — **ne sait pas** (EN VILLE n’est apparu qu’à la fin, la première partie cache sa ligne.)
- luck: « La chance est une bourse qui monte à chaque récolte ; on la dépense pour repiocher (12), appeler une couleur (20) ou forger une tuile unique (40). » — **juste** (Une bourse qui monte à chaque récolte, avec les trois dépenses et leurs prix.)
- magic: « La tuile magique ressemble à toutes les voisines quelle que soit leur couleur, donc elle sert dans les gros blocs. » — **juste** (Passe-partout, utile dans les gros blocs.)
- stash: « Je ne sais pas : une RÉSERVE vide est apparue à la fin, je n'ai pas compris ce qu'elle garde. » — **ne sait pas** (La RÉSERVE n’est révélée qu’après la première partie.)
- grounds: « Les quatre sols sont la ferme, le marché, la carrière et les chemins, chacun avec son bonus ; la carrière profite de la pierre et des murs. » — **juste** (Les quatre sols nommés, chacun avec son bonus; la carrière et la pierre sont justes. Incomplet mais fidèle.)

seed 2 (died, 552 pts, 70 places, 34 harvests):

- expedition: « Je ne sais pas trop: je crois que c est le voyage de toute la partie, poser des tuiles et recolter pour aller plus loin vers le site. » — **juste** (« Le voyage de toute la partie, poser et récolter pour aller plus loin » — hésitant, mais c’est la forme du jeu.)
- ripe: « Une tuile mure est une tuile entouree sur ses six cotes, et sa valeur compte ses voisines de meme couleur. » — **juste** (Six côtés, la valeur = voisines de même couleur.)
- pop: « Recolter encaisse une poche mure: on gagne des tuiles et des points, et la recolte laisse de la pierre a la place. » — **juste** (Tuiles, points, la pierre. Au tour 29 il a laissé une poche d’une tuile « si petite » — la clause d’attente, tenue; aux tours 20 et 22 il a récolté « petit et souvent » en citant la carte.)
- end: « La partie finit quand on n a plus de tuiles pour poser et plus rien de mur a recolter; la plaine demande un cout qui croit a chaque pose. » — **juste** (Plus de tuiles et rien de mûr; le coût qui croît.)
- map: « La carte garde le terrain parcouru entre les parties; un SITE se reclame en posant une tuile qui le touche et rapporte des points selon sa distance. » — **juste** (Le terrain gardé entre les parties, le site réclamé au toucher et payé selon la distance.)
- caravan: « Je ne sais pas: je n ai pas utilise la caravane et je ne comprends pas bien ce qu elle fait. » — **ne sait pas** (Jamais rencontrée.)
- luck: « La chance est une bourse qui se remplit a chaque recolte et se depense pour repiocher la main, appeler une couleur ou forger une tuile unique. » — **juste** (La bourse et ses trois dépenses.)
- magic: « La tuile MAGIQUE ressemble a toutes ses voisines quelle que soit la couleur, donc je la pose la ou beaucoup de tuiles se touchent. » — **juste** (Passe-partout, posée là où beaucoup de tuiles se touchent.)
- stash: « Je ne sais pas: la RESERVE etait vide pendant ma partie et je n ai pas compris comment la remplir. » — **ne sait pas** (Vide toute la partie, jamais révélée.)
- grounds: « Il y a quatre sols, FERME, MARCHE, CARRIERE et CHEMINS, et chacun marque a sa facon: la ferme veut un gros bloc, le marche aime le terrain melange, la carriere profite de la pierre, les chemins valent plus loin du depart. » — **juste** (Les quatre sols et la règle de chacun, comme la carte.)

seed 3 (died, 284 pts, 66 places, 28 harvests):

- expedition: « Je ne suis pas sur. Je suppose que c'est le voyage que fait la caravane quand une recolte la declenche, mais je n'ai pas vu d'expedition en tant que telle. » — **faux** (« Le voyage que fait la caravane » — l’expédition est la partie elle-même : poser, mûrir, récolter, le pari.)
- ripe: « Une tuile est mure quand ses six cotes sont couverts. Sa valeur compte les voisines de sa couleur, et une tuile mure peut etre recoltee. » — **juste** (Six côtés, valeur = voisines de sa couleur.)
- pop: « RECOLTER encaisse une poche mure: ca donne des tuiles pour continuer et des points. Plus la poche est grosse, plus elle paie, et il reste de la pierre. » — **juste** (Tuiles et points, plus grosse paie plus, la pierre. Au tour 16 il a laissé grossir une poche « parce que la carte dit qu’une poche mûre n’expire pas » — la clause d’attente, tenue.)
- end: « La partie finit quand il n'y a plus assez de tuiles pour poser et plus aucune poche mure a recolter. A la fin, il ne reste presque rien de la chance. » — **juste** (Plus assez de tuiles et rien de mûr; la chance presque perdue à la fin.)
- map: « Le plateau est un champ hexagonal qui s'agrandit a chaque pose. Il y a aussi des lueurs au loin, comme une cache, que je n'ai pas su atteindre. » — **juste** (Le plateau qui s’agrandit, les lueurs au loin : ce qu’une partie montre.)
- caravan: « La caravane arrive apres une recolte et propose une marchandise a choisir: tous les pouvoirs, une tuile de plus, ou des tirages rares. J'ai pris tous les pouvoirs et les valeurs ont augmente. » — **juste** (Arrive après une récolte, propose trois marchandises, il en a pris une (TOUS LES POUVOIRS) et a vu l’effet. Le premier lecteur à pouvoir choisir, depuis la correction du harnais.)
- luck: « La CHANCE est une bourse qui monte a chaque recolte et se depense pour repiocher, appeler une couleur ou forger une tuile unique. Je n'ai pas tout depense, et c'est probablement une erreur. » — **juste** (La bourse et ses trois dépenses; il note lui-même l’erreur de ne pas la dépenser.)
- magic: « Une tuile MAGIQUE ressemble a chaque voisine quelle que soit sa couleur, et les voisines lui ressemblent en retour. Elle a fait monter fortement les valeurs. » — **juste** (Passe-partout dans les deux sens, et l’effet vu.)
- stash: « Je ne sais pas vraiment. Je suppose que c'est la reserve de tuiles qui alimente la main, et elle etait vide a la fin. » — **ne sait pas** (Suppose le stock de tuiles, et dit ne pas savoir; la RÉSERVE n’est révélée qu’après la première partie.)
- grounds: « Il y a quatre sols: FERME (une grosse foule de sa couleur), MARCHE (le terrain melange), CARRIERE (la pierre et les murs la nourrissent), CHEMINS (valeur croissante loin du depart). » — **juste** (Les quatre sols et leur règle chacun, comme la carte.)

### The journal — the first sentences, and the last

seed 1:

- t1 (0 poses): Je suppose qu'il faut poser des tuiles à côté de la carrière pour faire un grand bloc d'une même couleur, et que la tuile éclairée est celle que je pose.
- t2 (1 poses): Je comprends que poser une tuile contre une tuile de même couleur donne de la valeur. Je suppose que le +3 veut dire que la pose vaut plus, je prends 1,-1 qui est à +3.
- t3 (2 poses): La carrière de départ est passée de 1 à 2 quand j'ai posé le marché à côté, donc je suppose que la valeur dépend des voisins. Je pose la carrière (0,-1) pour voir si elle grandit aussi.
- t4 (3 poses): Je comprends maintenant qu'une tuile mûrit quand ses six côtés sont couverts, et que seules les tuiles mûres rapportent des points. Je suppose que la valeur monte avec les voisins de même couleur. Je pose la carrière en -1,0 qui vaut +2.
- t5 (4 poses): La main a changé : la tuile choisie est maintenant une FERME. Je ne sais pas encore pourquoi le marché a grimpé à 4, je suppose que la valeur dépend du nombre de voisins. Je pose la ferme en 1,1 où il y a déjà une ferme native.
- t6 (5 poses): Une lueur au loin, une CACHE de 14 tuiles à 6 de distance : je ne sais pas ce que ça veut dire, peut-être un bonus à aller chercher. Pour l'instant je pose le marché en 0,1 qui vaut +4, en suivant la valeur.
- t7 (6 poses): Les points restent à 0 et je ne sais pas comment on les gagne. Je demande l'explication des points pour comprendre avant de continuer.
- t8 (6 poses): Je comprends maintenant que les points viennent de la récolte d'une poche (valeur x taille x distance du départ). Je veux donc grossir une poche. Je pose les chemins en -1,1 qui touche le départ et vaut +1.
- t9 (7 poses): La poche mûre en 0,0 rapporte 4 tuiles et 9 points tout de suite. Je suppose que la récolte encaisse maintenant, et qu'attendre la ferait grossir, mais chaque pose coûte une tuile. Je récolte pour voir l'effet.
- t10 (7 poses): Après la récolte, la case de départ est devenue de la PIERRE et je gagne de la chance. Je suppose que la pierre ne se repose pas. Je continue à grossir les poches : je pose les chemins en 2,0 (+1).
- t11 (8 poses): Je comprends qu'il faut choisir une couleur et la faire grandir en un bloc. Je pose la ferme en 0,2 qui vaut +2 et touche les fermes natives. Je suppose que plus de voisines identiques donnent plus de valeur.
- t12 (9 poses): Je pose la carrière en -1,-1 qui vaut +2 : je ne sais pas encore si la couleur de la main compte, mais je cherche la plus grosse valeur.
- …
- t125 (79 poses): La poche unique de chemins en -5,-2 est mûre : 6 tuiles et 20 points. Je la récolte.
- t126 (79 poses): Je pose les chemins en -7,-1 (+3), près des chemins natifs et de la poche récoltée.
- t127 (80 poses): Il me reste 3 tuiles, moins que le coût de 4. Je pose la carrière en -4,8 (+1), la seule case utile qui reste pour la carrière, en tentant de voir si une poche peut mûrir.

seed 2:

- t1 (0 poses): Je suppose que je dois faire grandir une couleur en un gros bloc, donc je pose le marche a cote de la ferme.
- t2 (1 poses): Le jeu dit de poser contre des tuiles de meme couleur pour de la valeur. Je suppose que CHEMINS sur sol natif CHEMINS en 1,1 donne plus, donc je pose la a 1,1.
- t3 (2 poses): Je vois que la valeur de MARCHE est passee a 2 quand j ai pose CHEMINS a cote. Je ne suis pas sur de ce qui fait monter la valeur. Je pose la FERME a 0,1 pour voir si elle monte aussi.
- t4 (3 poses): Je suppose que la valeur monte avec le nombre de voisins de la meme couleur, mais je ne suis pas sur. Je pose MARCHE a 1,-1 qui affiche +2.
- t5 (4 poses): Je comprends que la valeur compte les voisins de meme couleur, et un MUR est apparu en 1,-2 (je ne sais pas encore ce que ca change). Je pose MARCHE a 0,-1 qui touche deux MARCHE.
- t6 (5 poses): Je suppose que la valeur est le nombre de voisins de meme couleur, et que la tuile mure quand ses six cotes sont couverts. Je pose MARCHE a 2,-1 qui vaut +2 pour continuer le bloc.
- t7 (6 poses): Je ne suis pas sur de la regle de valeur: elle semble baisser pour les cases qui touchent moins de meme couleur. Je pose CARRIERE a -1,-1 ou il y a deja du sol carriere, pour tester.
- t8 (7 poses): Je pose CARRIERE a -2,-1 qui vaut +2 et touche deja une carriere. Je cherche encore comment une tuile devient mure et quand on peut recolter.
- t9 (8 poses): Je suppose que la valeur est plus haute quand la tuile touche beaucoup de tuiles de meme couleur, donc MARCHE a -1,0 qui vaut +3 est le meilleur choix maintenant.
- t10 (9 poses): Je suppose que la valeur monte quand on agrandit le groupe de meme couleur. Je ne vois toujours pas de tuile mure ni de gestes de recolte. Je pose CHEMINS a 2,0 qui vaut +2.
- t11 (10 poses): Je comprends maintenant: une tuile mure quand ses six cotes sont pris, sa valeur compte ses voisines de meme couleur, et RECOLTER donne des tuiles et des points. Je suppose que recolter maintenant est sur, je le fais sur la poche 1,0 qui rapporte +4 tuiles et +4 pts.
- t12 (10 poses): Apres la recolte j ai 16 tuiles et 4 points. Je suppose que PIERRE est une case qu on ne peut plus utiliser, et que COUT 1 veut dire que poser coute une tuile. Je pose CARRIERE a -1,-2 qui vaut +3.
- …
- t105 (68 poses): J ai 3 tuiles et aucune poche mure. Je pose quand meme FERME a 0,4 (+0 a 1) pour essayer de faire grandir un bloc. Je suppose que sans poche mure la partie peut finir.
- t106 (69 poses): J ai zero tuile. La poche 0,3 est mure, +1 tuile et +1 pt. Je la recolte pour pouvoir continuer.
- t107 (69 poses): Je n ai qu une tuile et le cout est 4, mais le jeu dit que je peux encore poser. Je pose FERME a 1,4 (+1) pour voir si la partie continue.

seed 3:

- t1 (0 poses): Je suppose que je dois faire grossir une seule couleur en un bloc. Je pose ma tuile FERME a cote de la carriere, pour voir comment le terrain reagit.
- t2 (1 poses): Le jeu dit de poser contre des tuiles de meme couleur pour avoir de la valeur. Je ne sais pas encore ce que vaut CHEMINS sans voisin de sa couleur. Je pose CHEMINS en 0,1 pour tester la valeur.
- t3 (2 poses): Je suppose que la valeur vient des voisins de la meme couleur. Je pose FERME en 1,-1 qui est a cote de ma FERME en 1,0, pour voir si ca monte a +1 ou plus.
- t4 (3 poses): Je crois que la valeur compte les voisins de meme couleur. Je ne sais pas encore ce que veut dire mur, mais je suppose qu'il faut couvrir les six cotes. Je pose CARRIERE en 2,0 ou elle a deja du sol natif.
- t5 (4 poses): Le jeu dit qu'une pose ratee se reprend avec ANNULER, donc je dois viser juste. Je suppose que la valeur vient des voisins de meme couleur. Je pose CHEMINS en -1,1 a cote de mon CHEMINS en 0,1.
- t6 (5 poses): Je ne connais pas encore la couleur MARCHE. Le jeu affiche +3 en 1,1, la valeur monte donc quand la tuile touche plusieurs tuiles qui vont avec. Je suppose que c'est une bonne case et je la prends.
- t7 (6 poses): Je vois que la valeur peut donner des decimales, +2.7. Je suppose que plus une tuile est entouree de sa couleur, plus elle vaut. Je pose FERME en 2,-1 ou elle touche deux FERME.
- t8 (7 poses): Je comprends maintenant : une tuile mure quand ses six cotes sont couverts, sa valeur compte les voisines de sa couleur, et une poche mure se recolte pour des tuiles et des points. Je suppose que recolter maintenant est un choix petit et tot. Je recolte la poche en 1,0.
- t9 (7 poses): La recolte m'a donne 2 tuiles, 2 points et de la chance, et la case est devenue PIERRE. Je ne sais pas encore ce que COUT 1 fait exactement, je suppose que chaque pose le consomme. Je pose MARCHE en 0,-1, valeur +2.
- t10 (8 poses): Je pense que chaque pose coute 1 tuile, et que la valeur d'une case compte ses voisines de meme couleur. Je pose FERME en 2,-2 ou elle vaut 2.7, a cote de deux FERME.
- t11 (9 poses): Je suppose que ma tuile CARRIERE gagne de la valeur a cote de mes CARRIERE. Je pose CARRIERE en 2,1, valeur +2, a cote de ma CARRIERE en 2,0.
- t12 (10 poses): Je continue la meme logique : la valeur monte avec les voisines de meme couleur. Je pose CHEMINS en -1,2, a cote de mes deux CHEMINS, valeur +2.
- …
- t94 (64 poses): Je pose CHEMINS en -3,0 ou elle vaut +3, a cote de mes CHEMINS en -3,1 et -4,1.
- t95 (65 poses): Il reste 1 tuile. Je recolte la poche mure en -3,1 qui rapporte 2 tuiles et 3 points.
- t96 (65 poses): J'ai 3 tuiles et le cout est 3, aucune poche n'est mure. Je pose FERME en 3,-6 ou elle vaut 3.05, entre mes FERME en 3,-5 et 2,-5.

### What the stranger said afterwards — verbatim

seed 1:

> Partie terminée (drip-1, seed 1) : fin à 513 pts, 81 poses, 40 récoltes, 127 tours.
> 
> Ce que j'ai compris du jeu en cinq phrases :
> 1. On pose des tuiles (4 sols : ferme, marché, carrière, chemins, plus une version magique et une version unique forgée) sur un plateau hexagonal ; une tuile vaut le nombre de voisines de même couleur (la magique ressemble à toutes).
> 2. Une tuile mûrit quand ses six côtés sont couverts ; les tuiles mûres qui se touchent forment une poche, qu'on récolte d'un coup pour gagner des tuiles, des points et de la chance.
> 3. La chance s'accumule à chaque récolte et se dépense (repiocher 12, appeler une couleur 20, forger une tuile unique 40 qui compte ses ressemblances double) ; en fin de partie il n'en reste que 5 %.
> 4. Chaque pose coûte des tuiles, et ce coût monte (1, 2, 3, puis 4) ; quand les tuiles s'épuisent, on récolte la plus grosse poche mûre pour repartir, et la partie finit quand il n'y a plus rien à récolter.
> 5. Les caches (paient des tuiles quand une tuile les touche, la plus grosse ~7 tuiles, plus loin davantage) et la pierre laissée par les récoltes (utile à la carrière) comptent ; je n'ai pas compris le rôle de la caravane, du site ou de la réserve.
> 
> Les trois moments où j'ai été le plus perdu :
> - Tour 3 à 5 : je ne comprenais pas pourquoi les valeurs changeaient et pourquoi les points restaient à 0 tant que rien n'était récolté.
> - Tour 40-50 : j'ai posé une carrière en -2,-3 en croyant qu'elle toucherait des carrières ; elle n'en touchait pas, sa valeur est tombée à 1. Je n'avais pas vérifié les voisins avant de poser.
> - Tour 120-127 : la caravane (EN VILLE) et la réserve vide sont apparues en fin de partie sans explication ; je n'ai pas su quoi en faire.

seed 2:

> Partie terminée (drip-2, seed 2): 552 pts, 70 poses, 34 récoltes, 107 tours. Fin: plus de tuiles pour poser et aucune poche mûre.
> 
> Ce que j'ai compris du jeu en cinq phrases:
> 1. On pose des tuiles sur un plateau hexagonal; une tuile devient mûre quand ses six côtés sont couverts, et sa valeur = nombre de voisines de même couleur.
> 2. RÉCOLTER une poche (groupe de tuiles mûres qui se touchent) rapporte des tuiles et des points, et laisse de la PIERRE sur les cases récoltées (elles ne sont plus posables).
> 3. Chaque pose coûte des tuiles (COÛT monte au fil de la partie: 1, 2, 3, 4), donc la tuile finit par manquer; la CHANCE (qui monte à chaque récolte) se dépense (repiocher 12, appeler une couleur 20, forger une tuile UNIQUE 40 qui double les ressemblances).
> 4. Les SITES sur la carte se réclament en posant une tuile qui les touche (25 pts × distance); ils ouvrent une PRIME ×3 si on récolte une poche d'au moins 8 tuiles à 12 hex, que je n'ai jamais réussi (toutes les récoltes ont été « manquée »).
> 5. La partie finit quand il n'y a plus de tuiles et plus rien de mûr à récolter; la CHANCE restante (288) n'a pas pu être convertie en tuiles, ce qui était ma plus grande erreur.
> 
> Les trois moments où j'ai été le plus perdu:
> - Tour 3-4: je ne savais pas ce qui fait monter la valeur d'une tuile (le jeu ne l'a dit qu'au tour 10 et j'ai dû deviner avec les chiffres « (+n) » des arêtes).
> - Tour 41-42: le SITE à 1,-6 — je ne savais pas comment le toucher; j'ai tenté toucher puis posé à 0,-5 et j'ai gagné des points, mais je n'ai pas compris la condition de PRIME.
> - Tour 98-107: tuiles à 0 avec COÛT 3-4 et chance de 278; je ne savais pas que la CHANCE ne se convertit pas directement en tuiles, et je n'ai pas réussi à faire une grosse poche (8 tuiles) pour la prime.

seed 3:

> Partie terminée au tour 96 (284 pts, 66 poses, 28 récoltes).
> 
> Ce que j'ai compris du jeu en cinq phrases :
> 1. On pose des tuiles hexagonales ; une tuile devient mûre quand ses six côtés sont couverts, et sa valeur compte les voisines de sa couleur.
> 2. Une poche mûre (tuiles mûres qui se touchent) se récolte pour gagner des tuiles et des points ; plus la poche est grosse, plus elle paie, et la récolte laisse de la pierre.
> 3. Chaque pose coûte des tuiles (le COÛT monte au fil de la partie) ; quand les tuiles tombent à zéro, il faut récolter ce qui est mûr, et sans rien de mûr la partie finit.
> 4. La CHANCE s'accumule à chaque récolte et se dépense (repiocher, appeler une couleur, forger une tuile unique) ; la caravane, déclenchée par une grosse récolte, propose une marchandise à choisir, et une tuile MAGIQUE ressemble à tous ses voisins.
> 5. Je n'ai jamais compris la CACHE lointaine, la RÉSERVE ni ce qu'est exactement l'EXPÉDITION ; j'ai gardé 281 de chance sans les dépenser, ce qui était probablement une erreur vu que la fin ne rend que 5 %.
> 
> Les trois moments où j'ai été le plus perdu :
> - Tour 8 : première récolte, je ne savais pas ce que COÛT 1 signifiait ni si la poche devait grossir avant d'être récoltée.
> - Tour 38 : ouverture de la bourse de CHANCE (80 points) ; je ne savais pas si FORGER ou REPIOCHER valait la dépense.
> - Tour 64 : les tuiles tombent sous le coût, et la règle « récolte ce qui est mûr » m'a obligé à récolter sans savoir si d'autres poches allaient grossir.

## ask — the drip, plus the manual on demand (`manuel`)

### Untaught — offered, never made

In every run: **toucher, annuler, stat**. Per run: seed 1: toucher, annuler, bourse, stat · seed 2: toucher, annuler, stat.

### Confusions — a belief that contradicts a lesson already told

_None found._

### Quiz — one sentence per concept, after the run

seed 1 (died, 259 pts, 58 places, 25 harvests):

- expedition: « La partie se termine quand l'expedition s'est depensee: j'ai fait 58 poses et le prix (COUT) est monte a 3; je ne suis pas sur de la regle exacte qui fixe le nombre de poses. » — **faux** (Décrit la fin de la partie (58 poses, le COÛT à 3), pas l’expédition : poser jusqu’à mûr, récolter, le pari entre encaisser et bâtir.)
- ripe: « Une tuile murit quand ses six cotes sont couverts; sa valeur est le nombre de voisines qui lui ressemblent (meme couleur ou magique). » — **juste** (Six côtés couverts, valeur = voisines qui ressemblent, magique comprise.)
- pop: « RECOLTER encaisse une poche mure (les tuiles mures qui se touchent): on gagne des tuiles pour continuer a poser et des points; la recolte laisse de la pierre et donne aussi de la CHANCE. » — **juste** (La poche mûre encaissée d’un coup, tuiles et points, la pierre qu’elle laisse, la CHANCE.)
- end: « Je crois que la partie finit quand je n'ai plus de tuiles et qu'il n'y a plus de case lumineuse ou poser, mais je ne sais pas la regle exacte; j'ai eu le message apres 58 poses et 0 tuile. » — **faux** (« Plus de case lumineuse » n’est pas la règle; il manque « rien de mûr à récolter » et le COÛT qui monte comme horloge.)
- map: « Le plateau grandit a chaque pose; il y a des murs qui bloquent la construction, une cache lointaine luit, et la PORTEE montre la distance; je ne comprends pas tout de la carte. » — **juste** (La cache qui luit au loin et la portée sont ce qu’une seule partie montre; la mémoire entre les parties ne se vit pas en une.)
- caravan: « Je ne sais pas: je n'ai pas ouvert la section CARAVANE et je n'ai pas utilise le geste caravane. » — **ne sait pas** (Jamais vue en ville dans une première partie; le geste n’a jamais été offert.)
- luck: « La CHANCE monte a chaque recolte (+10) et se depense sous la main (repiocher 12, couleur 20, forger 40); a la fin seule une petite partie compte, donc il faut la depenser. » — **juste** (Une bourse qui monte à chaque récolte et se dépense sous la main, avec les trois prix.)
- magic: « MAGIQUE est une tuile passe-partout: elle ressemble a chaque voisine quelle que soit la couleur, et elles lui ressemblent en retour; on la depense la ou beaucoup de tuiles se touchent. » — **juste** (Passe-partout dans les deux sens.)
- stash: « Je ne sais pas: la RESERVE est restee vide pendant toute la partie et je n'ai pas ouvert le manuel sur ce sujet. » — **ne sait pas** (La RÉSERVE est restée vide; elle n’est révélée qu’après la première partie.)
- grounds: « Il y a quatre sols: FERME veut un gros bloc de sa couleur, MARCHE gagne en melangeant les couleurs, CARRIERE profite de la pierre et des murs, CHEMINS gagne loin du depart (jusqu'a +1). » — **juste** (Les quatre sols décrits comme la carte les décrit : la foule, le mélange, la pierre, la distance.)

seed 2 (died, 490 pts, 61 places, 23 harvests):

- expedition: « Je crois que c'est la phase ou l'on pose des tuiles pour batir un terrain, en faisant grossir une couleur en gros bloc pour gagner des points. » — **juste** (Poser pour bâtir un terrain, une couleur en gros bloc, pour des points — la forme du jeu et le conseil d’ouverture.)
- ripe: « Une tuile est mure quand ses six cotes sont couverts; elle montre alors sa valeur, le nombre de voisines qui lui ressemblent. » — **juste** (Six côtés, et la valeur qui compte les voisines qui ressemblent — la carte, mot pour mot.)
- pop: « Recolter une poche mure donne des tuiles, des points et de la chance; attendre la fait grossir mais chaque pose coute des tuiles. » — **juste** (Tuiles, points, chance, ET la clause d’attente (grossir, chaque pose coûte).)
- end: « La partie finit quand la main est vide et qu'il n'y a plus rien de mur a recolter avec des tuiles qui manquent. » — **juste** (Main vide et rien de mûr à récolter.)
- map: « Les sites lointains se reclament en les touchant par une tuile; ils paient des points selon leur distance au depart, et ouvrent une prime. » — **juste** (Le site réclamé au toucher, payé selon la distance, et la prime qu’il ouvre : ce que cette partie a montré.)
- caravan: « Je ne sais pas vraiment : j'ai vu le mot CARAVANE et un message disant que la caravane n'en a pas voulu, mais je n'ai pas compris a quoi elle sert. » — **ne sait pas** (Un reçu l’a nommée (« n’en a pas voulu ») avant toute carte; rien d’autre.)
- luck: « La CHANCE est une bourse qu'on depense pour repiocher la main, appeler une couleur ou forger une tuile; elle monte a chaque recolte. » — **juste** (La bourse, les trois dépenses, montée par récolte.)
- magic: « Je ne sais pas : je n'ai pas vu de tuile magique ni de regle de magie pendant ma partie. » — **ne sait pas** (Aucune tuile magique rencontrée, dit-il.)
- stash: « Je ne sais pas vraiment : la RESERVE etait vide a la fin, je suppose que ce sont des tuiles gardees de cote, mais je ne l'ai pas verifie. » — **ne sait pas** (Suppose des tuiles mises de côté, mais le dit lui-même non vérifié; la RÉSERVE n’est révélée qu’après la première partie.)
- grounds: « Chaque couleur a sa propre regle de valeur : FERME aime le gros bloc, MARCHE les terrains melanges, CARRIERE la pierre et les murs, CHEMINS la distance au depart. » — **juste** (Les quatre sols avec chacun sa règle, comme la carte les dit. Note : ce lecteur n’a pas pu ouvrir une section du manuel (défaut du harnais, corrigé après) et a appris tout cela des cartes du drip.)

### The journal — the first sentences, and the last

seed 1:

- t1 (0 poses): Je suppose que je dois poser des tuiles qui se touchent pour faire grandir une seule couleur, et que la tuile CHEMINS va a cote de la carriere magique.
- t2 (1 poses): Je ne sais pas encore ce que fait MARCHE; je suppose que les cases marquees +3 valent plus car elles touchent plusieurs tuiles.
- t3 (2 poses): Je crois que la valeur monte quand une tuile touche une tuile de meme couleur; je pose une CARRIERE contre la CARRIERE de depart.
- t4 (3 poses): Je suppose qu'une tuile est mure quand ses six cotes sont couverts; je veux entourer la carriere de depart avec des CARRIERES.
- t5 (4 poses): Je ne comprends pas encore bien quand une tuile devient mure ni ce que rapporte la recolte; j'ouvre le manuel.
- t6 (4 poses): Je veux savoir quand une tuile est mure, donc j'ouvre la section MUR.
- t7 (4 poses): Je crois que la valeur compte les voisins de meme couleur; je pose ma FERME sur le sol natif FERME en 1,1 pour faire un bloc de fermes, en supposant que ca ne fait pas de mal.
- t8 (5 poses): Je suppose que la valeur +4 en 0,1 vient de la MARCHE voisine de la carriere magique; je pose la MARCHE la-bas. Je ne sais pas encore ce que fait la CACHE au loin.
- t9 (6 poses): Je pense que les tuiles qui ressemblent (meme couleur) autour de ma case rapportent de la valeur; je pose CHEMINS sur le chemin natif en -1,-1 pour toucher mes tuiles.
- t10 (7 poses): Les valeurs montent quand je touche des tuiles semblables; je pose CHEMINS en -2,-1 qui touche mon chemin et donne +2.
- t11 (8 poses): Je suppose que je dois entourer mes tuiles pour les faire murir; je pose FERME en 2,0 pour toucher mon bloc de fermes (+2).
- t12 (9 poses): Je ne sais pas encore quand la recolte se fait; je pose CHEMINS en -1,-2 qui donne le plus de valeur (+3) pour l'instant.
- …
- t86 (56 poses): Je pose CARRIERE en -1,4 (+3)? Non, il est liste (+3) hier; je pose en -1,4 si la case est libre, sinon je cherche ailleurs.
- t87 (56 poses): -1,4 est deja pose, je l'avais oublie. Je pose CARRIERE en -1,5 (+2), qui figure dans les aretes lumineuses.
- t88 (57 poses): Il ne me reste que 3 tuiles et aucune poche mure. Je pose CHEMINS en -6,-1 (+4), la plus haute valeur, pour tenter de faire murir quelque chose.

seed 2:

- t1 (0 poses): Je suppose qu'il faut faire grossir une couleur en un seul bloc, donc je pose une FERME a cote de la FERME de depart.
- t2 (1 poses): Je ne comprends pas encore bien la valeur (+0 ou +1) : je suppose qu'un voisin de meme couleur ou un sol natif de meme couleur la donne. Je pose CHEMINS en 1,1 qui est marquee +1.
- t3 (2 poses): Je crois que la valeur monte quand la tuile touche des tuiles de sa couleur : 1,-1 touche deux FERME, donc +2.7. Je pose la FERME en 1,-1 pour grossir le bloc de fermes.
- t4 (3 poses): Je ne comprends pas ce que valent les nombres (+2, +3) ni ce que veut dire MUR. J'ouvre le manuel, table des matieres.
- t5 (3 poses): Je veux comprendre la valeur des tuiles et le MUR. J'ouvre la section sur l'expedition, qui semble parler de la pose.
- t6 (3 poses): La section sur l'expedition n'est pas ouverte, je reessaie avec le nom plus court.
- t7 (3 poses): Le manuel ne s'ouvre toujours pas sur la section. J'essaie le mot MUR qui apparait sur mon ecran.
- t8 (3 poses): Le manuel ne s'ouvre pas sur un sujet, je joue sans lui. Je ne sais pas pourquoi MARCHE vaut +3 en 0,1, je suppose que c'est lie aux tuiles voisines. Je pose la tuile MARCHE la-bas pour voir.
- t9 (4 poses): Je pense que la valeur compte les voisins de meme couleur : -1,1 touche MARCHE en 0,1, donc +2. Je fais grossir le bloc de marches.
- t10 (5 poses): Ca confirme : MARCHE en 0,1 est passe de 3 a 4 quand j'en ai mis une a cote. Je suppose que la valeur est la somme des voisins de meme couleur. Je continue avec une MARCHE en -1,0 (+2).
- t11 (6 poses): Je crois que chaque tuile vaut la somme des voisins de meme couleur, et que les sols natifs comptent aussi. La CARRIERE n'a pas de voisin de sa couleur, mais -1,-1 est sur un sol CARRIERE natif, donc +1. Je pose la CARRIERE la.
- t12 (7 poses): La valeur semble etre la somme des voisins de meme couleur, sols natifs compris. J'ai une CARRIERE, je la pose en -1,-2 qui touche ma CARRIERE en -1,-1 et une CARRIERE native, donc +2.
- …
- t88 (58 poses): Je pose la CARRIERE en -5,-4 (+4), qui touche mes CARRIERES en -4,-4 et -5,-3.
- t89 (59 poses): Je pose la CHEMINS en 3,4 (+4), qui touche mes CHEMINS en 2,4 et 3,3.
- t90 (60 poses): Il me reste 2 tuiles pour un cout de 3. Je pose quand meme la CHEMINS en 1,5 (+4), qui touche mes CHEMINS en 1,4.

### What the stranger said afterwards — verbatim

seed 1:

> Partie terminée : 259 pts, 58 poses, 25 récoltes, 88 tours.
> 
> Ce que j'ai compris en cinq phrases :
> 1. Chaque tuile posée touche des voisines ; sa VALEUR est le nombre de voisines qui lui ressemblent (même couleur, ou MAGIQUE), et les murs/pierres comptent surtout pour CARRIÈRE.
> 2. Une tuile mûrit quand ses six côtés sont couverts ; les tuiles mûres qui se touchent forment une poche, récoltée d'un coup pour des tuiles (1 + 1 par 2 de valeur) et des points.
> 3. Chaque pose coûte des tuiles (le COÛT monte au fil de la partie), donc il faut récolter pour continuer ; récolter donne aussi de la CHANCE.
> 4. La CHANCE se dépense sous la main (REPIOCHER 12, couleur 20, FORGER 40) ; je ne l'ai dépensée qu'une fois.
> 5. La partie s'arrête quand l'expédition est épuisée (58 poses) et que je n'ai plus de tuiles ; je n'ai pas bien compris la RÉSERVE ni la CARAVANE.
> 
> Manuel : ouvert 2 fois (table des matières, puis section MÛR), plus une fois pour la recherche de règles en cours de jeu ; le texte MÛR a levé mes doutes sur la valeur et la poche.
> 
> Trois moments les plus perdus :
> - Tour 1-5 : je ne savais pas ce que faisait la valeur (+3, +4) ni le lien entre pose et couleur ; j'ai posé à l'aveugle.
> - Tour 10 : le MUR apparu en -1,-3 : je ne savais pas s'il entrait dans le score.
> - Tour 73 et 84 : deux refus pour des cases déjà occupées (je n'avais pas relu la liste des arêtes), donc mauvaise lecture de l'état, pas de la règle.
> 
> Point à noter : je n'ai jamais su quel est le rôle de la RÉSERVE (restée vide) ni de la CARAVANE, et la fin de partie est arrivée sans que j'anticipe la règle exacte.

seed 2:

> Partie terminée (fin à la main vide, 61 poses, 23 récoltes, 90 tours). Score final 490 points, 219 de CHANCE non dépensée.
> 
> Ce que j'ai compris du jeu (cinq phrases) :
> 1. On pose des tuiles sur un plateau hexagonal ; la valeur d'une tuile compte ses voisines de même couleur, et les sols natifs de même couleur comptent aussi.
> 2. Une tuile est mûre quand ses six côtés sont couverts ; une poche (tuiles mûres qui se touchent) se récolte pour gagner des tuiles et des points, et une récolte laisse de la pierre.
> 3. Chaque pose coûte des tuiles (le COÛT monte au fil de la partie), donc il faut récolter pour ne pas tomber à zéro ; à zéro sans rien de mûr, la partie finit.
> 4. La CHANCE s'accumule à chaque récolte et se dépense (repiocher, appeler une couleur, forger) ; en fin de partie il n'en reste que 5 %, ce qui rend la dépense utile.
> 5. Un SITE lointain se réclame en le touchant par une tuile et rapporte des points selon sa distance au départ ; la PRIME associée demande une grosse poche (8 tuiles ou plus) près du site, et ma tentative a été manquée.
> 
> Manuel : j'ai ouvert la table des matières une fois (geste "manuel" sans sujet, qui a marché). Trois tentatives avec un sujet (« L'EXPÉDITION », « expedition », « MUR ») n'ont ouvert aucune section ; le manuel est resté la table. J'ai ensuite lu les règles surtout dans les cartes que le jeu affichait lui-même (MÛR, LES QUATRE SOLS, CHANCE, LA CARTE). Je n'ai jamais ouvert CARAVANE, MAGIQUE ou RÉSERVE dans le manuel.
> 
> Les trois moments où j'ai été le plus perdu :
> - Vers le tour 4-8 : le « MUR » apparu sur le plateau ("impossible d'y bâtir") et les nombres +2,7 / +3 des arêtes, sans savoir ce qu'ils voulaient dire ; j'ai supposé la règle de voisinage, qui s'est confirmée ensuite.
> - Vers le tour 69 : la PRIME ×3 a été manquée alors que la poche valait 8 tuiles ; j'ai recollé la poche sans comprendre qu'il fallait 8 tuiles réellement posées dans la poche (ou une autre condition) — je ne l'ai pas identifié.
> - Vers le tour 72 : le message « La caravane n'en a pas voulu » après une récolte, sans savoir ce qu'est la caravane ni pourquoi elle refuse des tuiles.
> Fin (tours 80-86) : je n'ai pas vu venir l'épuisement des tuiles à COÛT 3 ; j'ai posé avec 2 tuiles sans rien de mûr, et la partie s'est terminée.

## flood — the story, the goal and the whole manual before the first tile; nothing after

### Untaught — offered, never made

In every run: **toucher, annuler**. Per run: seed 1: toucher, annuler · seed 2: toucher, annuler, bourse, stat.

### Confusions — a belief that contradicts a lesson already told

- seed 1, turn 23, **RÉCOLTER**: « Je suppose que la poche mure 0,-2 vaut 3 tuiles et 3 points; je la recolte car les tuiles sont la monnaie pour poser et la poche ne disparait pas si j attends, mais elle ne rapporte pas plus si je pose d autres tuiles. » — Le manuel, lu au départ : « Attendre laisse la poche grandir et paie plus ». Au tour 16 le joueur le savait encore; au tour 23 il croit l’inverse.

### Quiz — one sentence per concept, after the run

seed 1 (died, 597 pts, 90 places, 49 harvests):

- expedition: « Je pose des tuiles qui coutent chacune une tuile; je recolte pour en regagner, et la partie finit quand je n'en ai plus. » — **juste** (Poser coûte, récolter regagne, la partie finit quand il n’en reste plus — la forme du jeu, sans le pari ni le conseil d’une couleur.)
- ripe: « Une tuile murit quand ses six cotes sont occupes, pierre comprise; sa valeur compte les voisines de meme couleur. » — **juste** (Six côtés, pierre comprise; valeur = voisines de même couleur.)
- pop: « Recolter prend toute la poche mure: ca donne des tuiles et des points, et les cases deviennent de la pierre. » — **juste** (La poche entière, tuiles et points, la pierre.)
- end: « La partie finit quand je n'ai plus de tuiles pour poser; le cout monte par paliers et ne redescend jamais. » — **juste** (Plus de tuiles; le COÛT par paliers qui ne redescend jamais. Il manque « rien de mûr », rien de faux.)
- map: « Je n'ai pas tout compris de la carte; les caches m'ont donne des tuiles quand j'ai touche la lueur, et j'ai vu des sites et des sanctuaires au loin. » — **juste** (Les caches payées au toucher de la lueur, les sites et sanctuaires au loin : ce qu’une partie montre.)
- caravan: « Je ne sais pas: je ne l'ai jamais vue apparaitre clairement sur l'ecran pendant la partie. » — **ne sait pas** (Jamais vue à l’écran : sa ligne attend la première partie finie.)
- luck: « La chance monte a chaque recolte et sert a depenser: forger une tuile en UNIQUE, repiocher, acheter une main; je ne sais pas ce qu'elle rapporte en tuiles. » — **juste** (Monte à chaque récolte, se dépense en forge, repioche, main d’une couleur.)
- magic: « Une tuile MAGIQUE ressemble a toutes ses voisines; UNIQUE double les ressemblances, mais je ne suis pas sur de tous les details. » — **juste** (Passe-partout; UNIQUE double les ressemblances.)
- stash: « Je ne sais pas: je n'ai jamais utilise la reserve. » — **ne sait pas** (Jamais utilisée; révélée après la première partie.)
- grounds: « Chaque sol vaut differemment: CARRIERE aime la pierre et FERME monte en grosse foule; je ne suis pas sur de MARCHE et je crois que CHEMINS vaut plus loin du depart. » — **juste** (CARRIÈRE et la pierre, FERME en foule, CHEMINS loin du départ; MARCHÉ laissé en doute plutôt que faux.)

seed 2 (died, 531 pts, 67 places, 30 harvests):

- expedition: « Je crois que c'est une course: on pose des tuiles, on recolte pour gagner points et tuiles, et la partie s'arrete quand on ne peut plus payer le cout de pose. » — **juste** (Poser, récolter pour des points et des tuiles, s’arrêter quand on ne peut plus payer — la forme du jeu.)
- ripe: « Une tuile mure est entouree sur ses six cotes; elle affiche sa valeur (nombre de voisines semblables) et peut etre recoltee. » — **juste** (Six côtés, la valeur = voisines semblables.)
- pop: « Recolter encaisse une poche mure: on gagne des tuiles et des points selon sa valeur totale, et la poche ne disparait pas. » — **juste** (Tuiles et points selon la valeur totale, et « la poche ne disparaît pas » — la clause d’attente, tenue.)
- end: « La partie finit quand il ne reste plus assez de tuiles pour payer le cout de la pose, et ce cout monte au fil des poses. » — **faux** (« Plus assez de tuiles pour payer le coût » : la différence est pardonnée à zéro, on pose avec UNE tuile; la fin est zéro tuile et rien de mûr. Il l’a oublié et l’a dit lui-même dans son rapport.)
- map: « Poser une tuile a cote d'un site le reclame et rapporte beaucoup de points; les sites lointains valent plus, mais je n'ai pas tout compris. » — **juste** (Le site réclamé au toucher, payé selon la distance : ce que la partie a montré.)
- caravan: « La caravane veut une poche d'une taille donnee et paie une fois; je n'ai pas bien compris quelle taille elle attendait. » — **juste** (Une poche d’une taille donnée, payée une fois — le manuel, retenu; la taille jamais devinée, ce qui est la règle (« sans jamais dire laquelle »).)
- luck: « La CHANCE est une bourse gagnee en recoltant; elle sert a repiocher la main, appeler une couleur ou forger une tuile unique. » — **juste** (La bourse gagnée en récoltant, les trois dépenses.)
- magic: « Une tuile magique est passe-partout: elle ressemble a toutes les voisines, peu importe la couleur. » — **juste** (Passe-partout.)
- stash: « Je ne sais pas: je n'ai pas utilise la reserve. » — **ne sait pas** (Jamais utilisée.)
- grounds: « Chaque tuile a un sol (CHEMINS, CARRIERE, FERME, MARCHE) qui change sa valeur; je suppose que CARRIERE aime la pierre, mais je ne suis pas sur des autres sols. » — **juste** (Chaque sol change la valeur, CARRIÈRE et la pierre; le reste laissé en doute, rien de faux.)

### The journal — the first sentences, and the last

seed 1:

- t1 (0 poses): Je suppose que poser une tuile coute des tuiles de ma reserve et que les poches mures se recoltent pour payer; je commence par poser CHEMINS a cote de mon depart.
- t2 (1 poses): Je suppose que la valeur entre parentheses est ce que la tuile vaudrait a cet endroit; je pose MARCHE sur la case la plus payante, +3, pour garder un bloc.
- t3 (2 poses): Je suppose que la valeur monte quand une tuile est entouree de ses semblables, et que le cout d une pose est de 1 tuile pour l instant; je pose CARRIERE a cote du depart.
- t4 (3 poses): Je suppose que les valeurs augmentent avec les voisines de meme couleur, et que je ne vois pas encore de poche mure; je pose CARRIERE a -1,0 qui vaut +2.
- t5 (4 poses): Je suppose qu une tuile devient mure quand ses six cotes sont occupes; je ne sais pas encore si une tuile posee sur un sol natif compte differemment; je pose FERME a 1,1 qui est un sol natif FERME.
- t6 (5 poses): Je suppose que la valeur d une case est la somme des voisines semblables, donc 0,1 en vaut 4 pour MARCHE; je pose MARCHE la, et je vois une CACHE lointaine en 1,-6 que je ne comprends pas encore.
- t7 (6 poses): Je suppose qu une tuile est mure quand ses six cotes sont pleins; le depart 0,0 n a plus qu un vide en -1,1, donc je pose CHEMINS la pour le fermer et voir si une recolte devient possible.
- t8 (7 poses): Je suppose que recolter une poche me rend des tuiles et des points, et que la poche de 0,0 vaut 9 points et 4 tuiles maintenant; je recolte pour recuperer des tuiles, car j en ai 15 et chaque pose en coute une.
- t9 (7 poses): Je suppose que la recolte a laisse 0,0 en PIERRE, qui aide les voisines a murir; je ne comprends pas encore la CHANCE, qui est une bourse que je ne peux pas depenser pour l instant; je pose CHEMINS a -1,-1 pour grossir le bloc CHEMINS.
- t10 (8 poses): Je suppose que la valeur d une case depend des voisines de meme couleur, donc FERME en 2,0 vaut +2 a cote de FERME natif; je pose FERME la.
- t11 (9 poses): Je suppose que les valeurs ne montent que pour les voisines de meme couleur; je pose CARRIERE a 0,-2 qui touche la CARRIERE de 0,-1.
- t12 (10 poses): Je suppose que la CHANCE me servira a repiocher ou a choisir une couleur quand elle atteindra son prix, et qu elle monte a chaque recolte; je pose CARRIERE a 1,-2 qui vaut +2.
- …
- t143 (88 poses): Je suppose qu avec une tuile restante je peux encore poser et que la difference est pardonnee; CARRIERE a 4,-6 vaut +5 et touche 5,-6 et 5,-5, je pose la.
- t144 (89 poses): Je suppose que la poche mure 4,-5 rapporte 4 tuiles et 7 points; je n ai plus de tuiles, donc je la recolte.
- t145 (89 poses): Je suppose que MARCHE vaut +2 en 6,0 au contact de mes marches de 6,-2 et 6,-3 pres; je pose MARCHE la.

seed 2:

- t1 (0 poses): Je suppose que je dois faire grossir un seul bloc de la meme couleur, donc je pose ma MARCHE a cote de la case de depart.
- t2 (1 poses): Je suppose que la case a son sol natif (CHEMINS) et que poser sur ce sol le transforme; je tente la pose sur 2,0 avec la CHEMINS en main, meme si je ne comprends pas encore bien la valeur.
- t3 (2 poses): Je suppose que je dois grouper ma couleur: la FERME a un bonus quand elle est entouree de sa propre couleur, donc je pose la FERME a cote du depart en 0,1.
- t4 (3 poses): Je vois que la valeur affichee monte quand la case est entouree de tuiles voisines; la case 1,1 affiche +3, je suppose que c'est le meilleur endroit pour la MARCHE.
- t5 (4 poses): Ma main est toute en MARCHE; je suppose que la MARCHE vaut plus quand elle touche des tuiles d'autres couleurs, donc je la pose en 1,-1 (+2) pour former un groupe mixte.
- t6 (5 poses): Je suppose que la valeur affichee est le nombre de voisines semblables; 2,-1 vaut +3 pour la MARCHE, je la pose la.
- t7 (6 poses): Une tuile MARCHE est mure (*) et l'ecran dit RECOLTER donne +4 tuiles et +4 points; je suppose que recolter maintenant est sur, et je veux voir ce que ca rend.
- t8 (6 poses): La recolte a rendu des tuiles et des points, et la case 1,0 est devenue PIERRE; je suppose que la CARRIERE aime la pierre, donc je pose la CARRIERE en 0,-1 pour etre a cote de la pierre.
- t9 (7 poses): Je ne suis pas sur de ce que veut dire la valeur d'une case quand elle est en pose possible; je pose la MARCHE en 2,-2 (+2) qui touche mes tuiles MARCHE, pour grossir ce bloc.
- t10 (8 poses): La tuile 1,-1 est mure et l'ecran propose de recolter pour +3 tuiles et +3 points; je suppose que recolter tot est sans danger, donc je recolte.
- t11 (8 poses): Je pose la MARCHE en 3,-1 (+2), a cote de mon groupe de MARCHE, en supposant que la valeur indique combien de voisines semblables elle aura.
- t12 (9 poses): Ma main commence par CHEMINS; je la pose en 3,0 (+2) sur son sol natif, en supposant que les CHEMINS valent plus loin du depart.
- …
- t99 (65 poses): Je pose la CARRIERE (index 1) en 2,-6 (+2), tout pres du site deja reclame, en supposant que ca pousse la valeur voisine.
- t100 (66 poses): Il me reste 1 tuile et le cout est 4; la poche 1,-5 est mure pour +2 tuiles et +3 points, je recolte pour pouvoir continuer.
- t101 (66 poses): J'ai 3 tuiles, cout 4; je peux encore poser avec une tuile restante. Je pose la FERME (index 0) en 3,-5 (+2) pour toucher la FERME voisine.

### What the stranger said afterwards — verbatim

seed 1:

> Partie flood-1 terminée : 597 points, 90 poses, 49 récoltes, 145 tours.
> 
> Ce que j'ai compris du jeu en cinq phrases :
> 1. On pose des tuiles qui coûtent chacune une tuile, et on récolte les poches mûres pour regagner des tuiles et des points.
> 2. Une tuile mûrit quand ses six côtés sont occupés (pierre et murs comptent), et sa valeur compte les voisines de même couleur.
> 3. Récolter transforme les cases en pierre ; la pierre aide à faire mûrir, mais seule la CARRIÈRE la compte comme ressemblance.
> 4. La CHANCE monte à chaque récolte et se dépense (forger en UNIQUE à 40, repiocher, acheter une main) ; UNIQUE double les ressemblances, et forger une CARRIÈRE m'a rapporté une grosse poche (jusqu'à 21 points).
> 5. Le coût monte par paliers (1, 2, 3, 4, 5) et la partie finit quand on n'a plus de tuile ; j'ai fini à 0 tuile.
> 
> Ce que j'ai retenu du manuel du début, et ce que j'ai oublié :
> - Retenu : récolter donne tuiles et points, poser coûte des tuiles, la partie finit quand il n'y en a plus, la chance se dépense, forger rend UNIQUE.
> - Oublié ou jamais compris : la CARAVANE (je ne l'ai jamais vue dans l'écran), la RÉSERVE (jamais utilisée), et le détail de la CARTE (sites, sanctuaires, primes) que je n'ai pas exploitée. J'ai aussi raté que la CHANCE ne se convertit pas en tuiles.
> 
> Les trois moments où j'étais le plus perdu :
> - Tour 8 (et 13) : la récolte donnait des tuiles et un "Chance +10" sans que je comprenne ce que la chance faisait, et "stat chance" a été refusé (bouton absent de l'écran).
> - Tour 118-125 : je tombais à 12, 8, 5 tuiles sans poche mûre ; j'ai dû deviner qu'il fallait fermer le sixième côté d'une tuile (y compris la pierre) pour la faire mûrir.
> - Tour 129-131 : à 1 tuile, coût 4, j'ai posé en croyant qu'une pose à découvert était permise avec une tuile restante (c'était le cas), sans savoir si l'écart serait pardonné ; la réponse est venue au tour suivant.

seed 2:

> Partie terminée, 531 points, 67 poses, 30 récoltes, 101 tours.
> 
> Ce que j'ai compris en cinq phrases : on pose des tuiles sur le plateau, et une poche mûre (entourée de tous les côtés) se récolte pour gagner des tuiles et des points. Le coût de pose monte au fil des poses et la partie s'arrête quand on ne peut plus le payer. Récolter remplit aussi une bourse de CHANCE, que l'on dépense pour repiocher la main, appeler une couleur (20) ou forger une tuile unique (40, valeurs doublées). Poser à côté d'un site le réclame et rapporte beaucoup de points, mais la prime (×3 pour une poche de 8+ tuiles à 12 hex du site) a toujours été manquée faute de poche assez grosse et lointaine. Je n'ai jamais su exactement quelle taille la caravane attendait, ni ce que faisait la RÉSERVE, que je n'ai pas utilisée.
> 
> Ce que j'ai retenu du manuel du début : la récolte rend des tuiles et des points, une poche mûre ne expire pas, une tuile magique est passe-partout. J'avais oublié la règle de la prime (distance de 12 hex du site, 8 tuiles minimum), la règle de la bourse (dépenses listées sur la ligne CHANCE), et que l'on peut poser avec une tuile restante même si le coût est plus élevé (la différence est pardonnée à zéro).
> 
> Les trois moments où j'ai été le plus perdu :
> - Tour 2 à 5 : je ne savais pas ce que signifiait la valeur affichée sur les cases en pose possible (ex. +3), et j'ai posé au hasard en supposant que plus de voisines semblables donnait plus de valeur.
> - Tour 34 (environ) : la prime a été manquée après une récolte trop proche du site, sans que l'écran me dise clairement pourquoi avant le résultat.
> - Tour 59 à 67 : j'ai épuisé mes tuiles (1 à 2 restantes, coût 3 à 4) sans poche mûre à récolter, et les dépenses de CHANCE (sacrifier) étaient refusées ; j'ai dû poser à découvert pour finir.

## silent — the board, the receipts and the taps’ answers; the game never speaks first

### Untaught — offered, never made

In every run: **annuler**. Per run: seed 1: annuler · seed 2: annuler.

### Confusions — a belief that contradicts a lesson already told

- seed 1, turn 8, **MÛR (réponse au toucher)**: « Je remarque que les tuiles voisines prennent de la valeur quand je pose a cote d'elles, meme la FERME 1,1 est passee de 1 a 2. Je suppose que la valeur monte avec les voisines de couleur differente. » — Au tour 6, le toucher d’un MARCHÉ avait répondu « +1 par voisine d’une autre couleur » — le pouvoir du MARCHÉ. Le joueur en fait la règle de toutes les tuiles (tours 8, 20, 35, 45, et le quiz), alors que la VALEUR compte les voisines qui ressemblent. Rien d’autre ne le lui a dit : la partie est silencieuse.

### Quiz — one sentence per concept, after the run

seed 1 (died, 382 pts, 76 places, 42 harvests):

- expedition: « Je ne sais pas ce que veut dire L'EXPEDITION, je n'ai rien vu de tel pendant la partie. » — **ne sait pas** (Jamais dit dans une partie silencieuse.)
- ripe: « Une tuile est mure quand ses six cotes sont couverts par d'autres tuiles ou par des murs ; l'ecran la marque alors d'une etoile. » — **juste** (Six côtés couverts, tuiles ou murs; l’astérisque de l’écran. La valeur n’est pas définie, mais rien de faux.)
- pop: « Recolter une poche mure rapporte des tuiles (une de base, plus une par deux de valeur) et des points, puis la case devient PIERRE et ne peut plus recevoir de tuile ; une recolte entraine aussi les mures voisines. » — **juste** (Tuiles (une, plus une par deux de valeur), points, la pierre, et la poche entière d’un coup — tout lu sur les reçus.)
- end: « La partie finit quand il n'y a plus de tuile et plus rien de mur a recolter ; le COUT monte d'un point toutes les 22 poses, ce qui pousse vers la fin. » — **juste** (Plus de tuile et rien de mûr; le COÛT qui monte d’un point toutes les 22 poses, lu sur la stat.)
- map: « Le plateau est un hexagone de cases q,r ; des lueurs au loin cachent des CACHE, des SITE et des SANCTUAIRE a decouvrir, et des MUR bloquent certaines cases. » — **juste** (Les lueurs au loin, les trois destinations, les murs : ce qu’une partie montre. La mémoire entre les parties ne se voit pas en une.)
- caravan: « Je ne sais pas ce que fait la CARAVANE ; je n'ai vu le mot qu'a la fin, avec EN VILLE. » — **ne sait pas** (Vue seulement à la fin, EN VILLE.)
- luck: « La CHANCE est une bourse gagnee a chaque recolte (+10) ; je la depense avec depenser : repiocher pour 12, une main entiere d'une couleur pour 20, ou forger une tuile pour 40 pour la rendre unique ; le reste en fin de partie devient des reliques. » — **juste** (La bourse, ses trois dépenses et leurs prix, les reliques à la fin — lus sur la stat et la bourse.)
- magic: « Je ne suis pas sur : les tuiles MAGIQUES, comme la carriere magique, semblaient grandir a chaque pose a cote d'elles et murir ensuite, mais je ne l'ai pas verifie. » — **faux** (« Grandir à chaque pose à côté » est le mûrissement de toute tuile; rien sur le passe-partout.)
- stash: « Je ne sais pas ce que veut dire RESERVE ; l'ecran l'affichait vide a la fin, sans que je comprenne. » — **ne sait pas** (Vide à la fin, jamais expliquée.)
- grounds: « Il y a quatre sols de couleur, FERME, CARRIERE, MARCHE et CHEMINS, et des sols natifs que l'on peut poser ; une tuile prend la couleur du sol qu'elle recouvre, et les voisines de couleur differente la font grandir. » — **faux** (« Les voisines de couleur différente la font grandir » est le pouvoir du MARCHÉ seul; « prend la couleur du sol qu’elle recouvre » n’est pas la règle du sol natif (une tuile sur son sol natif vaut un de plus).)

seed 2 (died, 218 pts, 49 places, 22 harvests):

- expedition: « L'expedition est la partie entiere : je posais des tuiles et recoltais des poches jusqu'a epuiser la reserve, la partie s'est finie apres 49 poses. » — **juste** (La partie entière, poser et récolter jusqu’à épuiser les tuiles — la forme du jeu, lue sur l’écran seul.)
- ripe: « Une tuile murit quand elle est entouree sur ses six cotes ; le * l'indique, et sa valeur compte les voisines semblables. » — **juste** (Six côtés, l’astérisque, et — depuis le toucher du tour 8 — la valeur qui compte les voisines semblables. Le toucher dit la règle maintenant (2026-10-21).)
- pop: « Recolter une tuile mure donne des tuiles (reserve), des points, et de la chance ; la tuile devient PIERRE. » — **juste** (Tuiles, points, chance, la pierre.)
- end: « La fin arrive quand la reserve de tuiles est vide et qu'il n'y a plus d'aretes lumineuses ou je peux poser ; c'est arrive a 0 tuiles. » — **faux** (« Plus d’arêtes lumineuses » n’est pas la règle; il manque « rien de mûr à récolter » et le COÛT comme horloge.)
- map: « La carte est le plateau d'hexagones : je posais sur les aretes lumineuses, et les lueurs au loin (SITE, CACHE) indiquaient des choses hors plateau que je n'ai pas exploitees. » — **juste** (Les lueurs au loin et leurs noms : ce qu’une partie silencieuse montre.)
- caravan: « Je ne sais pas vraiment ce que la CARAVANE fait ; le mot est apparu en fin de partie sans que je l'utilise. » — **ne sait pas** (Vue seulement à la fin.)
- luck: « La chance est une bourse qui monte de 10 a chaque recolte ; on la depense pour repiocher une main (12) ou prendre une main d'une couleur (20). » — **juste** (La bourse, +10 par récolte, repiocher et une main d’une couleur avec leurs prix.)
- magic: « Je ne sais pas ce que MAGIQUE veut dire ; je n'ai jamais vu de tuile ou de geste magique. » — **ne sait pas** (Aucune tuile magique rencontrée, dit-il.)
- stash: « La reserve est le stock de tuiles qu'il reste a poser ; elle se remplit par les recoltes et se vide a chaque pose. » — **faux** (Confond la RÉSERVE (la case qui met une tuile de côté) avec le compteur TUILES. Rien ne la lui a dite : elle n’est révélée qu’après la première partie.)
- grounds: « Les sols que j'ai vus sont FERME, MARCHE, CHEMINS et CARRIERE, avec PIERRE et MUR comme etats differents ; je ne suis pas sur de tout le reste. » — **juste** (Les quatre sols nommés, la pierre et le mur distingués, rien de faux; rien non plus sur ce que chacun marque. Incomplet mais fidèle.)

### The journal — the first sentences, and the last

seed 1:

- t1 (0 poses): Je vois une main de 3 tuiles, dont CHEMINS (choisie), et des cases lumineuses autour de la carriere de depart. Je suppose qu'il faut poser les tuiles sur les cases lumineuses, je ne sais pas encore ce que valent les points.
- t2 (1 poses): Apres la pose, la carriere est passee de 0 a 1 et la main a tourne. Je suppose que la valeur d'une case grandit avec les voisins, et que le chiffre entre parentheses est la valeur de la tuile choisie. Je ne sais pas encore ce que sont les points.
- t3 (2 poses): Je ne comprends pas encore les points ni le mot mure. Je vais demander l'aide de l'ecran sur le mot points avant de jouer une case.
- t4 (2 poses): L'ecran dit que les points sont une recolte de poche (valeur x taille x distance du depart). Je suppose qu'une poche est un groupe de cases de meme couleur, et que mure veut dire qu'elle est prete a etre recoltee. Je pose la carriere pour grossir la zone de pierre.
- t5 (3 poses): Je ne sais pas ce que fait toucher. Je suppose que toucher une tuile sert a la recolter ou a la regarder. Je le teste sur le MARCHE, qui vaut 3.
- t6 (3 poses): Le texte dit qu'une tuile mure quand ses six cotes sont couverts, et qu'elle gagne +1 par voisine d'une autre couleur. Je suppose que la carriere magique gagne aussi quand on pose a cote. Je pose la FERME sur 1,1 pour remplir un trou et viser une mutation.
- t7 (4 poses): Je ne sais pas ce que veut dire lueur au loin, un CACHE a 1,-6. Je suppose que c'est une zone a decouvrir plus tard. Je pose la FERME sur 2,0 qui vaut +2 pour gagner de la valeur.
- t8 (5 poses): Je remarque que les tuiles voisines prennent de la valeur quand je pose a cote d'elles, meme la FERME 1,1 est passee de 1 a 2. Je suppose que la valeur monte avec les voisines de couleur differente. Je pose le MARCHE sur 0,-1 qui vaut +3.
- t9 (6 poses): Je ne vois toujours aucune tuile mure et aucun point. Je suppose qu'il faut entourer une tuile de six voisines pour la murir, et que les poches de meme couleur se recoltent ensuite. Je pose le CHEMINS sur -1,0 pour entourer la carriere magique.
- t10 (7 poses): La carriere magique monte a chaque pose autour d'elle, elle est a 5. Je ne sais pas encore si c'est un compteur ou une vraie valeur. Je pose le CHEMINS sur -1,1 qui vaut +2.
- t11 (8 poses): La carriere magique 0,0 est maintenant mure avec un astérisque, l'ecran propose de la recolter pour +4 tuiles et +9 points. Je suppose que recolter une tuile mure lui donne ses gains puis la vide. Je fais la recolte.
- t12 (8 poses): La recolte a donne 9 points et 4 tuiles, plus une Chance +10 et un COUT 1. Je ne sais pas ce que veut dire COUT ni Chance, ni pourquoi la valeur 3.7 apparait. Je pose la FERME sur 2,1 qui vaut +3.7, la plus haute, pour voir.
- …
- t127 (74 poses): J'ai 2 tuiles. La CARRIERE -2,4 n'a plus qu'un cote libre, -3,5. Je pose la MARCHE sur -3,5 (+2) pour la murir.
- t128 (75 poses): La CARRIERE -2,4 est mure, +3 tuiles et +4 points. Je la recolte.
- t129 (75 poses): Je pose la CARRIERE sur 6,3 (+3), sur le bord droit du plateau.

seed 2:

- t1 (0 poses): Je suppose que je pose une tuile sur une arete lumineuse pour agrandir le plateau.
- t2 (1 poses): Je pense que la valeur entre parentheses compte, donc je vise les aretes qui affichent +1 avec la tuile choisie.
- t3 (2 poses): Je remarque que la tuile MARCHE en 1,0 est passee de 1 a 2 sans que je la touche : je suppose que les voisins la renforcent. Je ne comprends pas encore ce que rapportent les points.
- t4 (3 poses): Je suppose que la valeur d'une arete (+3) indique combien la pose rapporte ou renforce ; je choisis la plus forte. Je ne sais toujours pas ce que MUR veut dire.
- t5 (4 poses): Les points restent a 0 et je ne sais pas comment ils se gagnent. Je demande l'explication du mot points pour comprendre.
- t6 (4 poses): Merci : les points viennent de recoltes de poches (valeur x taille x distance). Je cherche donc a faire grandir une poche de MARCHE. Je pose sur 2,-1 qui a +3.
- t7 (5 poses): Je suppose que les valeurs MARCHE montent quand elles touchent d'autres MARCHE, donc je continue a grouper. Je ne sais pas encore quand une poche devient mure (*).
- t8 (6 poses): Je remarque que la valeur des tuiles MARCHE monte a chaque tour, meme sans que je les touche. Je suppose que c'est une maturation. Je teste ce que fait toucher sur 1,0, la plus haute.
- t9 (6 poses): D'apres la reponse, une tuile murit quand elle est entouree sur ses six cotes, et sa valeur compte les voisines semblables. Je suppose que je dois fermer les cases autour de MARCHE. Je pose la carriere sur -1,-1 (+1).
- t10 (7 poses): Je ne sais pas encore si le compteur TUILES est le stock qui se vide; je le surveille. Je pose la ferme sur 0,-2 qui vaut +2 pour fermer autour du MUR et de la marche.
- t11 (8 poses): Erreur de ma part au tour precedent : j'ai pose la carriere (la tuile choisie etait la carriere, pas la ferme). Je retiens que la main se reordonne. Je pose la marche sur 3,-1 (+2) pour agrandir la poche de marche.
- t12 (9 poses): Je suppose que la tuile choisie change a chaque geste, donc je relis [0] avant de poser. Je pose les CHEMINS sur 3,0 (+2) pour boucher le cote de la poche MARCHE.
- …
- t74 (47 poses): Je pose la carriere sur -4,-1 (+3).
- t75 (48 poses): La reserve est presque vide ; je recolte -3,-2 mure pour +2 tuiles.
- t76 (48 poses): Je pose la carriere sur -5,-1 (+3).

### What the stranger said afterwards — verbatim

seed 1:

> Partie terminée : 471 pts, 72 poses, 33 récoltes, 110 tours.
> 
> Ce que j'ai compris en jouant (rapport en cinq phrases) :
> 1. Chaque pose coûte des tuiles (COÛT, qui monte avec le temps) ; TUILES est la vie, la partie finit quand il n'y a plus de tuiles et rien de mûr à récolter.
> 2. Une tuile mûrit quand ses six côtés sont couverts (étoile *) ; récolter une poche mûre donne des points (valeur x taille x distance, plus un bonus de pose) ou des tuiles, et la case devient pierre.
> 3. La valeur des tuiles monte avec le nombre de voisines compatibles ; les carrières, marchés et fermes se renforcent en groupes, et la MAGIQUE ressemble à toutes les couleurs.
> 4. Le plateau s'agrandit ; des lueurs lointaines (CACHE, SITE, SANCTUAIRE) signalent des cibles, et atteindre une CACHE rapporte beaucoup de tuiles.
> 5. Je n'ai pas compris CHANCE (+10 à chaque récolte, 330 en fin de partie), RÉSERVE/bourse et CARAVANE ; je ne les ai jamais utilisées.
> 
> Trois moments où j'ai été le plus perdu :
> - Tour 3-4 : le PTS affiché (9) ne correspondait pas au +36 annoncé dans le reçu de la première récolte, et les tuiles remontaient après une récolte en points. [Harnais : corrigé avant la partie suivante.]
> - Tour 8 : le bouton "stat chance" a été refusé (pas à l'écran), et CHANCE est restée opaque jusqu'à la fin.
> - Tour 110-112 : à 5 tuiles puis 1, sans poche mûre, je ne savais pas quelle pose préserverait la partie ; la fin est arrivée en posant la dernière tuile, après avoir récolté la poche à zéro tuile.
> 
> Erreur de ma part : au tour du chemin en -2,-5, j'ai lu la main [0] comme CARRIÈRE alors qu'elle était CHEMINS.

seed 2:

> Partie terminée (silent-2, seed 2) : 76 tours, 218 pts, 49 poses, 22 récoltes. Fin par épuisement de la réserve de tuiles.
> 
> Ce que j'ai compris en jouant (à partir de l'écran seulement) :
> 1. Je pose des tuiles sur les arêtes lumineuses ; le chiffre entre parenthèses est le nombre de voisines semblables que la tuile aurait à cet endroit.
> 2. Une tuile mûrit quand elle est entourée sur ses six côtés (marquée *) ; POCHES MÛRES propose alors « recolter », qui donne des tuiles (réserve), des points et +10 de chance. La tuile récoltée devient PIERRE.
> 3. La chance est une bourse : repiocher une main coûte 12, une main entière d'une couleur 20 ; je n'ai utilisé que « repiocher ». Le geste « forger » (40) rend une tuile unique, non testé.
> 4. La réserve TUILES se vide à chaque pose et se remplit par les récoltes ; à 0 tuiles sans arête lumineuse, la partie s'arrête.
> 5. Points : la réponse de l'aide dit « valeur x taille x distance », mais le reçu affiche souvent un gain de points plus petit que la valeur totale ; je n'ai pas réussi à reconstituer la formule exacte.
> 
> Les trois moments où j'ai été le plus perdu :
> - Tour 1 à 5 : je ne savais pas ce que signifiaient les chiffres (+0 à +4) ni la différence entre MUR et PIERRE ; j'ai dû deviner que le chiffre était un score de voisinage.
> - Tour 13 à 16 : première récolte ; je ne savais pas que « recolter » était un geste à part entière ni que COÛT 1 à 3 augmentait avec les poses (le prix est monté à 3 en fin de partie).
> - Tour 70 à 74 : réserve à 0 avec peu d'arêtes ; je n'ai pas compris à temps que la fin dépendait de la réserve et j'ai dû récolter pour la remplir.
> 
> Erreur de ma part : au tour 9 j'ai posé la carrière en croyant jouer la ferme (je lisais mal l'ordre de la main, qui se réordonne après chaque geste).

## Cost

Stranger tokens: 0 in (0 read from cache), 0 out. Transcripts in `scripts/stranger/runs/` (not committed).
