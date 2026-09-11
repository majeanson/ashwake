# Performance

Written by `pnpm audit:perf`. 48 of 48 phases measured,
2 pixel ratios × 3 CPU throttles × 8 phases,
on one board (`?seed=7&place=12`) so every row is the same work.

**Relative, not absolute.** A desktop runner draws through a software path
that is not a phone’s, so the interesting number is always a RATIO between
two rows of this table — never the millisecond itself. `cpu` is main-thread
task time and `script` the part of it inside JavaScript.

**Read every row against the blank-page control on its own throttle.** That
row is `about:blank` doing nothing for five seconds, measured the same way,
and it is what this instrument charges for existing — the harness’s polling,
the browser’s housekeeping, the counters themselves. The first run of this
file had no control and reported that an idle board costs 3.5 s of CPU in 5,
which read like a battery emergency and was mostly the instrument.

**Ratio 3 is also MSAA off by default**, because `Board.tsx`’s `DENSE` reads
`devicePixelRatio > 2`: those rows draw 2.25× the fragments of the ratio-2
rows and draw them unantialiased. One constant decides both defaults, which
is why the walk is measured twice per cell — once as the build ships and
once with `?aa=` flipping the flag at context creation.

## The two readings

**motion** is the idle board divided by the same board with reduced
motion on — what the embers and the beacon breath cost while nobody is
touching anything. **rest** is that same idle board divided by one that
has gone to SLEEP: since 2026-09-11 the breath stops after fifteen
untouched seconds and wakes on the first touch (`board/resting.ts`), and
this row is measured with the `?rest=2` dial so a five-second phase can
contain it. **msaa** is antialiasing on divided by off at that
ratio, which needs the `?aa=` override because one constant decides both
defaults (`Board.tsx`).

| dpr | cpu | motion | rest    | msaa |
| --- | --- | ------ | ------- | ---- |
| 2   | 1×  | 146.3× | ∞       | 1.5× |
| 2   | 4×  | 63.5×  | 4130.0× | 1.7× |
| 2   | 6×  | 35.4×  | 3964.0× | 1.1× |
| 3   | 1×  | 100.1× | ∞       | 1.8× |
| 3   | 4×  | 39.7×  | 4288.0× | 1.2× |
| 3   | 6×  | 31.9×  | 1382.0× | 1.4× |

**MSAA here is drawn by a software rasterizer on the CPU**, so these
multiples are an upper bound on what a phone GPU pays and must not be
read as a device measurement. What they do say is which way each default
leans, and by how much, on the same board.

## Every phase

| dpr | cpu | phase                              | wall ms | cpu ms | script ms |
| --- | --- | ---------------------------------- | ------- | ------ | --------- |
| 2   | 1×  | boot to the door                   | 106     | 77     | 52        |
| 2   | 1×  | BEGIN to a drawn board             | 922     | 515    | 157       |
| 2   | 1×  | 5 placements                       | 2873    | 1843   | 333       |
| 2   | 1×  | five seconds idle                  | 5027    | 2633   | 128       |
| 2   | 1×  | 5 placements (MSAA off)            | 2307    | 1262   | 319       |
| 2   | 1×  | five seconds idle (resting)        | 5011    | 0      | 0         |
| 2   | 1×  | five seconds idle (reduced motion) | 5010    | 18     | 2         |
| 2   | 1×  | five seconds idle (blank page)     | 5016    | 13     | 0         |
| 2   | 4×  | boot to the door                   | 455     | 441    | 306       |
| 2   | 4×  | BEGIN to a drawn board             | 1578    | 1245   | 619       |
| 2   | 4×  | 5 placements                       | 12562   | 11980  | 3252      |
| 2   | 4×  | five seconds idle                  | 5004    | 4130   | 634       |
| 2   | 4×  | 5 placements (MSAA off)            | 7827    | 7012   | 2488      |
| 2   | 4×  | five seconds idle (resting)        | 5019    | 1      | 0         |
| 2   | 4×  | five seconds idle (reduced motion) | 5014    | 65     | 12        |
| 2   | 4×  | five seconds idle (blank page)     | 5004    | 2      | 0         |
| 2   | 6×  | boot to the door                   | 1011    | 990    | 754       |
| 2   | 6×  | BEGIN to a drawn board             | 2013    | 1829   | 916       |
| 2   | 6×  | 5 placements                       | 17601   | 16997  | 5562      |
| 2   | 6×  | five seconds idle                  | 5018    | 3964   | 823       |
| 2   | 6×  | 5 placements (MSAA off)            | 15802   | 15300  | 5484      |
| 2   | 6×  | five seconds idle (resting)        | 5011    | 1      | 0         |
| 2   | 6×  | five seconds idle (reduced motion) | 5004    | 112    | 20        |
| 2   | 6×  | five seconds idle (blank page)     | 5005    | 8      | 0         |
| 3   | 1×  | boot to the door                   | 97      | 72     | 49        |
| 3   | 1×  | BEGIN to a drawn board             | 1081    | 649    | 145       |
| 3   | 1×  | 5 placements                       | 4251    | 3148   | 383       |
| 3   | 1×  | five seconds idle                  | 5024    | 3605   | 135       |
| 3   | 1×  | 5 placements (MSAA on)             | 6769    | 5778   | 404       |
| 3   | 1×  | five seconds idle (resting)        | 5006    | 0      | 0         |
| 3   | 1×  | five seconds idle (reduced motion) | 5005    | 36     | 2         |
| 3   | 1×  | five seconds idle (blank page)     | 5006    | 1      | 0         |
| 3   | 4×  | boot to the door                   | 469     | 454    | 321       |
| 3   | 4×  | BEGIN to a drawn board             | 1745    | 1401   | 652       |
| 3   | 4×  | 5 placements                       | 15403   | 14664  | 3083      |
| 3   | 4×  | five seconds idle                  | 5012    | 4288   | 462       |
| 3   | 4×  | 5 placements (MSAA on)             | 18699   | 17902  | 2944      |
| 3   | 4×  | five seconds idle (resting)        | 5004    | 1      | 0         |
| 3   | 4×  | five seconds idle (reduced motion) | 5005    | 108    | 13        |
| 3   | 4×  | five seconds idle (blank page)     | 5006    | 6      | 0         |
| 3   | 6×  | boot to the door                   | 1045    | 1024   | 788       |
| 3   | 6×  | BEGIN to a drawn board             | 2367    | 2206   | 951       |
| 3   | 6×  | 5 placements                       | 23592   | 22942  | 5616      |
| 3   | 6×  | five seconds idle                  | 5006    | 4146   | 583       |
| 3   | 6×  | 5 placements (MSAA on)             | 31781   | 31007  | 6008      |
| 3   | 6×  | five seconds idle (resting)        | 5009    | 3      | 0         |
| 3   | 6×  | five seconds idle (reduced motion) | 5016    | 130    | 20        |
| 3   | 6×  | five seconds idle (blank page)     | 5016    | 37     | 0         |
