# Screen audit

116 findings across 14 screens × 3 directions,
at 390×844. Bars: 4.5:1 for text, 3:1 for marks, 44px for a tap target,
no horizontal page scroll, no clipped text.

This is a report, not a gate. A number here is a thing to look at in the
shot beside it — `audit-shots/<direction>/<screen>.png`.

- **tap-target-allowed** — 39
- **contrast-haloed** — 2
- **contrast-disabled** — 75

| screen      | direction       | kind               | where                    | text                   | measured | bar | detail                                             |
| ----------- | --------------- | ------------------ | ------------------------ | ---------------------- | -------- | --- | -------------------------------------------------- |
| board       | torchlit        | tap-target-allowed | `button.stat`            | TILES 10               | 28       | 44  | 77×28px, pseudo-target included                    |
| board       | torchlit        | tap-target-allowed | `button.stat`            | PTS 0                  | 28       | 44  | 54×28px, pseudo-target included                    |
| board       | torchlit        | tap-target-allowed | `button.stat`            | ↗ 5                    | 28       | 44  | 36×28px, pseudo-target included                    |
| board       | torchlit        | tap-target-allowed | `button.stat`            | $ 1                    | 28       | 44  | 33×28px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | TILES 8                | 28       | 44  | 69×28px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | PTS 60                 | 28       | 44  | 63×28px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | ♦ 31                   | 28       | 44  | 41×28px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | ↗ 7                    | 28       | 44  | 35×28px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | $ 2                    | 28       | 44  | 35×28px, pseudo-target included                    |
| purse       | torchlit        | tap-target-allowed | `button.stat`            | TILES 10               | 28       | 44  | 77×28px, pseudo-target included                    |
| purse       | torchlit        | tap-target-allowed | `button.stat`            | PTS 0                  | 28       | 44  | 54×28px, pseudo-target included                    |
| purse       | torchlit        | tap-target-allowed | `button.stat`            | ↗ 5                    | 28       | 44  | 36×28px, pseudo-target included                    |
| purse       | torchlit        | tap-target-allowed | `button.stat`            | $ 1                    | 28       | 44  | 33×28px, pseudo-target included                    |
| board       | daylight        | tap-target-allowed | `button.stat`            | TILES 10               | 28       | 44  | 77×28px, pseudo-target included                    |
| board       | daylight        | tap-target-allowed | `button.stat`            | PTS 0                  | 28       | 44  | 54×28px, pseudo-target included                    |
| board       | daylight        | tap-target-allowed | `button.stat`            | ↗ 5                    | 28       | 44  | 36×28px, pseudo-target included                    |
| board       | daylight        | tap-target-allowed | `button.stat`            | $ 1                    | 28       | 44  | 33×28px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | TILES 8                | 28       | 44  | 69×28px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | PTS 60                 | 28       | 44  | 63×28px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | ♦ 31                   | 28       | 44  | 41×28px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | ↗ 7                    | 28       | 44  | 35×28px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | $ 2                    | 28       | 44  | 35×28px, pseudo-target included                    |
| purse       | daylight        | tap-target-allowed | `button.stat`            | TILES 10               | 28       | 44  | 77×28px, pseudo-target included                    |
| purse       | daylight        | tap-target-allowed | `button.stat`            | PTS 0                  | 28       | 44  | 54×28px, pseudo-target included                    |
| purse       | daylight        | tap-target-allowed | `button.stat`            | ↗ 5                    | 28       | 44  | 36×28px, pseudo-target included                    |
| purse       | daylight        | tap-target-allowed | `button.stat`            | $ 1                    | 28       | 44  | 33×28px, pseudo-target included                    |
| board       | torchlit-bright | tap-target-allowed | `button.stat`            | TILES 10               | 28       | 44  | 77×28px, pseudo-target included                    |
| board       | torchlit-bright | tap-target-allowed | `button.stat`            | PTS 0                  | 28       | 44  | 54×28px, pseudo-target included                    |
| board       | torchlit-bright | tap-target-allowed | `button.stat`            | ↗ 5                    | 28       | 44  | 36×28px, pseudo-target included                    |
| board       | torchlit-bright | tap-target-allowed | `button.stat`            | $ 1                    | 28       | 44  | 33×28px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | TILES 8                | 28       | 44  | 69×28px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | PTS 60                 | 28       | 44  | 63×28px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | ♦ 31                   | 28       | 44  | 41×28px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | ↗ 7                    | 28       | 44  | 35×28px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | $ 2                    | 28       | 44  | 35×28px, pseudo-target included                    |
| purse       | torchlit-bright | tap-target-allowed | `button.stat`            | TILES 10               | 28       | 44  | 77×28px, pseudo-target included                    |
| purse       | torchlit-bright | tap-target-allowed | `button.stat`            | PTS 0                  | 28       | 44  | 54×28px, pseudo-target included                    |
| purse       | torchlit-bright | tap-target-allowed | `button.stat`            | ↗ 5                    | 28       | 44  | 36×28px, pseudo-target included                    |
| purse       | torchlit-bright | tap-target-allowed | `button.stat`            | $ 1                    | 28       | 44  | 33×28px, pseudo-target included                    |
| board-grown | torchlit-bright | contrast-haloed    | `span`                   | EMBER                  | 1.37     | 4.5 | rgb(255, 246, 230) on rgb(232, 211, 164) at 12.8px |
| board-grown | torchlit        | contrast-haloed    | `span`                   | EMBER                  | 1.66     | 4.5 | rgb(242, 228, 196) on rgb(198, 177, 135) at 12.8px |
| purse       | torchlit        | contrast-disabled  | `#spends > button.armed` | SACRIFICE LUCK → 0 · 0 | 1.87     | 4.5 | rgb(224, 82, 68) on rgb(10, 8, 6) at 12.8px        |
| board       | daylight        | contrast-disabled  | `button.tile.hold`       | HOLD                   | 1.87     | 4.5 | rgb(92, 83, 66) on rgb(220, 207, 178) at 11.2px    |
| board-grown | daylight        | contrast-disabled  | `button.tile.hold`       | HOLD                   | 1.87     | 4.5 | rgb(92, 83, 66) on rgb(220, 207, 178) at 11.2px    |
| purse       | daylight        | contrast-disabled  | `button.tile.hold`       | HOLD                   | 1.87     | 4.5 | rgb(92, 83, 66) on rgb(220, 207, 178) at 11.2px    |
| board       | torchlit        | contrast-disabled  | `button.tile.hold`       | HOLD                   | 2.1      | 4.5 | rgb(162, 139, 94) on rgb(26, 20, 14) at 11.2px     |
| board-grown | torchlit        | contrast-disabled  | `button.tile.hold`       | HOLD                   | 2.1      | 4.5 | rgb(162, 139, 94) on rgb(26, 20, 14) at 11.2px     |
| purse       | torchlit        | contrast-disabled  | `button.tile.hold`       | HOLD                   | 2.1      | 4.5 | rgb(162, 139, 94) on rgb(26, 20, 14) at 11.2px     |
| purse       | daylight        | contrast-disabled  | `#spends > button.armed` | SACRIFICE LUCK → 0 · 0 | 2.17     | 4.5 | rgb(156, 31, 22) on rgb(232, 220, 196) at 12.8px   |
| purse       | torchlit-bright | contrast-disabled  | `#spends > button.armed` | SACRIFICE LUCK → 0 · 0 | 2.17     | 4.5 | rgb(255, 106, 88) on rgb(0, 0, 0) at 12.8px        |
| board       | torchlit-bright | contrast-disabled  | `button.tile.hold`       | HOLD                   | 2.78     | 4.5 | rgb(201, 180, 139) on rgb(16, 12, 8) at 11.2px     |
| board-grown | torchlit-bright | contrast-disabled  | `button.tile.hold`       | HOLD                   | 2.78     | 4.5 | rgb(201, 180, 139) on rgb(16, 12, 8) at 11.2px     |
| purse       | torchlit-bright | contrast-disabled  | `button.tile.hold`       | HOLD                   | 2.78     | 4.5 | rgb(201, 180, 139) on rgb(16, 12, 8) at 11.2px     |
| purse       | daylight        | contrast-disabled  | `#spends > button`       | REDRAW · 12            | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 12.8px     |
| purse       | daylight        | contrast-disabled  | `#spends > button`       | MOSS · 30              | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 12.8px     |
| purse       | daylight        | contrast-disabled  | `#spends > button`       | EMBER · 30             | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 12.8px     |
| purse       | daylight        | contrast-disabled  | `#spends > button`       | ASH · 30               | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 12.8px     |
| purse       | daylight        | contrast-disabled  | `#spends > button`       | TIDE · 30              | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 12.8px     |
| purse       | daylight        | contrast-disabled  | `#spends > button`       | FORGE · 75             | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 12.8px     |
| more-played | daylight        | contrast-disabled  | `button`                 | 20                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| more-played | daylight        | contrast-disabled  | `button`                 | 35                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| more-played | daylight        | contrast-disabled  | `button`                 | 50                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| more-played | daylight        | contrast-disabled  | `button`                 | 30                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| more-played | daylight        | contrast-disabled  | `button`                 | 40                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| shop        | daylight        | contrast-disabled  | `button`                 | 20                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| shop        | daylight        | contrast-disabled  | `button`                 | 35                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| shop        | daylight        | contrast-disabled  | `button`                 | 50                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| shop        | daylight        | contrast-disabled  | `button`                 | 30                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| shop        | daylight        | contrast-disabled  | `button`                 | 40                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| end         | daylight        | contrast-disabled  | `button`                 | 20                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| end         | daylight        | contrast-disabled  | `button`                 | 35                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| end         | daylight        | contrast-disabled  | `button`                 | 50                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| end         | daylight        | contrast-disabled  | `button`                 | 30                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| end         | daylight        | contrast-disabled  | `button`                 | 40                     | 2.96     | 4.5 | rgb(14, 11, 7) on rgb(232, 220, 196) at 16px       |
| purse       | torchlit        | contrast-disabled  | `#spends > button`       | REDRAW · 12            | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 12.8px      |
| purse       | torchlit        | contrast-disabled  | `#spends > button`       | MOSS · 30              | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 12.8px      |
| purse       | torchlit        | contrast-disabled  | `#spends > button`       | EMBER · 30             | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 12.8px      |
| purse       | torchlit        | contrast-disabled  | `#spends > button`       | ASH · 30               | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 12.8px      |
| purse       | torchlit        | contrast-disabled  | `#spends > button`       | TIDE · 30              | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 12.8px      |
| purse       | torchlit        | contrast-disabled  | `#spends > button`       | FORGE · 75             | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 12.8px      |
| more-played | torchlit        | contrast-disabled  | `button`                 | 20                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| more-played | torchlit        | contrast-disabled  | `button`                 | 35                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| more-played | torchlit        | contrast-disabled  | `button`                 | 50                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| more-played | torchlit        | contrast-disabled  | `button`                 | 30                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| more-played | torchlit        | contrast-disabled  | `button`                 | 40                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| shop        | torchlit        | contrast-disabled  | `button`                 | 20                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| shop        | torchlit        | contrast-disabled  | `button`                 | 35                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| shop        | torchlit        | contrast-disabled  | `button`                 | 50                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| shop        | torchlit        | contrast-disabled  | `button`                 | 30                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| shop        | torchlit        | contrast-disabled  | `button`                 | 40                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| end         | torchlit        | contrast-disabled  | `button`                 | 20                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| end         | torchlit        | contrast-disabled  | `button`                 | 35                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| end         | torchlit        | contrast-disabled  | `button`                 | 50                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| end         | torchlit        | contrast-disabled  | `button`                 | 30                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| end         | torchlit        | contrast-disabled  | `button`                 | 40                     | 3.79     | 4.5 | rgb(242, 228, 196) on rgb(10, 8, 6) at 16px        |
| purse       | torchlit-bright | contrast-disabled  | `#spends > button`       | REDRAW · 12            | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 12.8px       |
| purse       | torchlit-bright | contrast-disabled  | `#spends > button`       | MOSS · 30              | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 12.8px       |
| purse       | torchlit-bright | contrast-disabled  | `#spends > button`       | EMBER · 30             | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 12.8px       |
| purse       | torchlit-bright | contrast-disabled  | `#spends > button`       | ASH · 30               | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 12.8px       |
| purse       | torchlit-bright | contrast-disabled  | `#spends > button`       | TIDE · 30              | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 12.8px       |
| purse       | torchlit-bright | contrast-disabled  | `#spends > button`       | FORGE · 75             | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 12.8px       |
| more-played | torchlit-bright | contrast-disabled  | `button`                 | 20                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| more-played | torchlit-bright | contrast-disabled  | `button`                 | 35                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| more-played | torchlit-bright | contrast-disabled  | `button`                 | 50                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| more-played | torchlit-bright | contrast-disabled  | `button`                 | 30                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| more-played | torchlit-bright | contrast-disabled  | `button`                 | 40                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| shop        | torchlit-bright | contrast-disabled  | `button`                 | 20                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| shop        | torchlit-bright | contrast-disabled  | `button`                 | 35                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| shop        | torchlit-bright | contrast-disabled  | `button`                 | 50                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| shop        | torchlit-bright | contrast-disabled  | `button`                 | 30                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| shop        | torchlit-bright | contrast-disabled  | `button`                 | 40                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| end         | torchlit-bright | contrast-disabled  | `button`                 | 20                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| end         | torchlit-bright | contrast-disabled  | `button`                 | 35                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| end         | torchlit-bright | contrast-disabled  | `button`                 | 50                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| end         | torchlit-bright | contrast-disabled  | `button`                 | 30                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
| end         | torchlit-bright | contrast-disabled  | `button`                 | 40                     | 4.18     | 4.5 | rgb(255, 246, 230) on rgb(0, 0, 0) at 16px         |
