# Performance

Written by `pnpm audit:perf`. 42 of 42 phases measured,
2 pixel ratios × 3 CPU throttles × 7 phases,
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
touching anything. **msaa** is antialiasing on divided by off at that
ratio, which needs the `?aa=` override because one constant decides both
defaults (`Board.tsx`).

| dpr | cpu | motion | msaa |
| --- | --- | ------ | ---- |
| 2   | 1×  | 129.6× | 1.6× |
| 2   | 4×  | 60.0×  | 1.4× |
| 2   | 6×  | 102.1× | 1.1× |
| 3   | 1×  | 72.0×  | 1.6× |
| 3   | 4×  | 29.5×  | 1.2× |
| 3   | 6×  | 48.9×  | 1.3× |

**MSAA here is drawn by a software rasterizer on the CPU**, so these
multiples are an upper bound on what a phone GPU pays and must not be
read as a device measurement. What they do say is which way each default
leans, and by how much, on the same board.

## Every phase

| dpr | cpu | phase                              | wall ms | cpu ms | script ms |
| --- | --- | ---------------------------------- | ------- | ------ | --------- |
| 2   | 1×  | boot to the door                   | 115     | 85     | 57        |
| 2   | 1×  | BEGIN to a drawn board             | 923     | 546    | 171       |
| 2   | 1×  | 5 placements                       | 5654    | 3689   | 491       |
| 2   | 1×  | five seconds idle                  | 5012    | 2981   | 150       |
| 2   | 1×  | 5 placements (MSAA off)            | 4876    | 2290   | 434       |
| 2   | 1×  | five seconds idle (reduced motion) | 5010    | 23     | 2         |
| 2   | 1×  | five seconds idle (blank page)     | 5010    | 1      | 0         |
| 2   | 4×  | boot to the door                   | 421     | 407    | 269       |
| 2   | 4×  | BEGIN to a drawn board             | 1678    | 1306   | 617       |
| 2   | 4×  | 5 placements                       | 13818   | 12785  | 3244      |
| 2   | 4×  | five seconds idle                  | 5042    | 4077   | 629       |
| 2   | 4×  | 5 placements (MSAA off)            | 10448   | 8885   | 2873      |
| 2   | 4×  | five seconds idle (reduced motion) | 5013    | 68     | 19        |
| 2   | 4×  | five seconds idle (blank page)     | 5004    | 52     | 0         |
| 2   | 6×  | boot to the door                   | 819     | 797    | 600       |
| 2   | 6×  | BEGIN to a drawn board             | 1744    | 1625   | 754       |
| 2   | 6×  | 5 placements                       | 18971   | 18123  | 5363      |
| 2   | 6×  | five seconds idle                  | 5022    | 4391   | 818       |
| 2   | 6×  | 5 placements (MSAA off)            | 17344   | 16343  | 5542      |
| 2   | 6×  | five seconds idle (reduced motion) | 5011    | 43     | 17        |
| 2   | 6×  | five seconds idle (blank page)     | 5007    | 54     | 0         |
| 3   | 1×  | boot to the door                   | 112     | 85     | 52        |
| 3   | 1×  | BEGIN to a drawn board             | 1156    | 764    | 173       |
| 3   | 1×  | 5 placements                       | 7332    | 5915   | 551       |
| 3   | 1×  | five seconds idle                  | 5026    | 3959   | 161       |
| 3   | 1×  | 5 placements (MSAA on)             | 10425   | 9226   | 525       |
| 3   | 1×  | five seconds idle (reduced motion) | 5014    | 55     | 2         |
| 3   | 1×  | five seconds idle (blank page)     | 5012    | 7      | 0         |
| 3   | 4×  | boot to the door                   | 409     | 395    | 277       |
| 3   | 4×  | BEGIN to a drawn board             | 1664    | 1345   | 583       |
| 3   | 4×  | 5 placements                       | 16883   | 16009  | 3125      |
| 3   | 4×  | five seconds idle                  | 5033    | 4364   | 438       |
| 3   | 4×  | 5 placements (MSAA on)             | 19612   | 18802  | 2746      |
| 3   | 4×  | five seconds idle (reduced motion) | 5012    | 148    | 15        |
| 3   | 4×  | five seconds idle (blank page)     | 5011    | 42     | 0         |
| 3   | 6×  | boot to the door                   | 909     | 892    | 685       |
| 3   | 6×  | BEGIN to a drawn board             | 1976    | 1836   | 763       |
| 3   | 6×  | 5 placements                       | 23152   | 22436  | 4991      |
| 3   | 6×  | five seconds idle                  | 5018    | 4495   | 593       |
| 3   | 6×  | 5 placements (MSAA on)             | 29019   | 28349  | 4768      |
| 3   | 6×  | five seconds idle (reduced motion) | 5006    | 92     | 23        |
| 3   | 6×  | five seconds idle (blank page)     | 5006    | 77     | 0         |
