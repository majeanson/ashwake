# Screen audit

160 findings across 14 screens × 4 directions,
at 390×844. Bars: 4.5:1 for text, 3:1 for marks, 44px for a tap target,
no horizontal page scroll, no clipped text.

This is a report, not a gate. A number here is a thing to look at in the
shot beside it — `audit-shots/<direction>/<screen>.png`.

- **tap-target-allowed** — 52
- **contrast-haloed** — 24
- **contrast-disabled** — 84

| screen      | direction       | kind               | where                    | text                   | measured | bar | detail                                             |
| ----------- | --------------- | ------------------ | ------------------------ | ---------------------- | -------- | --- | -------------------------------------------------- |
| board       | settlement      | tap-target-allowed | `button.stat`            | $ 1                    | 30       | 44  | 30×32px, pseudo-target included                    |
| purse       | settlement      | tap-target-allowed | `button.stat`            | $ 1                    | 30       | 44  | 30×32px, pseudo-target included                    |
| board       | torchlit        | tap-target-allowed | `button.stat`            | $ 1                    | 31       | 44  | 31×32px, pseudo-target included                    |
| purse       | torchlit        | tap-target-allowed | `button.stat`            | $ 1                    | 31       | 44  | 31×32px, pseudo-target included                    |
| board       | daylight        | tap-target-allowed | `button.stat`            | $ 1                    | 31       | 44  | 31×32px, pseudo-target included                    |
| purse       | daylight        | tap-target-allowed | `button.stat`            | $ 1                    | 31       | 44  | 31×32px, pseudo-target included                    |
| board       | torchlit-bright | tap-target-allowed | `button.stat`            | $ 1                    | 31       | 44  | 31×32px, pseudo-target included                    |
| purse       | torchlit-bright | tap-target-allowed | `button.stat`            | $ 1                    | 31       | 44  | 31×32px, pseudo-target included                    |
| board       | torchlit        | tap-target-allowed | `button.stat`            | TILES 10               | 32       | 44  | 74×32px, pseudo-target included                    |
| board       | torchlit        | tap-target-allowed | `button.stat`            | PTS 0                  | 32       | 44  | 53×32px, pseudo-target included                    |
| board       | torchlit        | tap-target-allowed | `button.stat`            | ↗ 5                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | TILES 8                | 32       | 44  | 67×32px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | PTS 60                 | 32       | 44  | 63×32px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | ♦ 31                   | 32       | 44  | 39×32px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | ↗ 7                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board-grown | torchlit        | tap-target-allowed | `button.stat`            | $ 2                    | 32       | 44  | 34×32px, pseudo-target included                    |
| purse       | torchlit        | tap-target-allowed | `button.stat`            | TILES 10               | 32       | 44  | 74×32px, pseudo-target included                    |
| purse       | torchlit        | tap-target-allowed | `button.stat`            | PTS 0                  | 32       | 44  | 53×32px, pseudo-target included                    |
| purse       | torchlit        | tap-target-allowed | `button.stat`            | ↗ 5                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board       | daylight        | tap-target-allowed | `button.stat`            | TILES 10               | 32       | 44  | 74×32px, pseudo-target included                    |
| board       | daylight        | tap-target-allowed | `button.stat`            | PTS 0                  | 32       | 44  | 53×32px, pseudo-target included                    |
| board       | daylight        | tap-target-allowed | `button.stat`            | ↗ 5                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | TILES 8                | 32       | 44  | 67×32px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | PTS 60                 | 32       | 44  | 63×32px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | ♦ 31                   | 32       | 44  | 39×32px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | ↗ 7                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board-grown | daylight        | tap-target-allowed | `button.stat`            | $ 2                    | 32       | 44  | 34×32px, pseudo-target included                    |
| purse       | daylight        | tap-target-allowed | `button.stat`            | TILES 10               | 32       | 44  | 74×32px, pseudo-target included                    |
| purse       | daylight        | tap-target-allowed | `button.stat`            | PTS 0                  | 32       | 44  | 53×32px, pseudo-target included                    |
| purse       | daylight        | tap-target-allowed | `button.stat`            | ↗ 5                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board       | torchlit-bright | tap-target-allowed | `button.stat`            | TILES 10               | 32       | 44  | 74×32px, pseudo-target included                    |
| board       | torchlit-bright | tap-target-allowed | `button.stat`            | PTS 0                  | 32       | 44  | 53×32px, pseudo-target included                    |
| board       | torchlit-bright | tap-target-allowed | `button.stat`            | ↗ 5                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | TILES 8                | 32       | 44  | 67×32px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | PTS 60                 | 32       | 44  | 63×32px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | ♦ 31                   | 32       | 44  | 39×32px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | ↗ 7                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board-grown | torchlit-bright | tap-target-allowed | `button.stat`            | $ 2                    | 32       | 44  | 34×32px, pseudo-target included                    |
| purse       | torchlit-bright | tap-target-allowed | `button.stat`            | TILES 10               | 32       | 44  | 74×32px, pseudo-target included                    |
| purse       | torchlit-bright | tap-target-allowed | `button.stat`            | PTS 0                  | 32       | 44  | 53×32px, pseudo-target included                    |
| purse       | torchlit-bright | tap-target-allowed | `button.stat`            | ↗ 5                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board       | settlement      | tap-target-allowed | `button.stat`            | TILES 10               | 32       | 44  | 73×32px, pseudo-target included                    |
| board       | settlement      | tap-target-allowed | `button.stat`            | PTS 0                  | 32       | 44  | 53×32px, pseudo-target included                    |
| board       | settlement      | tap-target-allowed | `button.stat`            | ↗ 5                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board-grown | settlement      | tap-target-allowed | `button.stat`            | TILES 8                | 32       | 44  | 66×32px, pseudo-target included                    |
| board-grown | settlement      | tap-target-allowed | `button.stat`            | PTS 60                 | 32       | 44  | 62×32px, pseudo-target included                    |
| board-grown | settlement      | tap-target-allowed | `button.stat`            | ♦ 31                   | 32       | 44  | 39×32px, pseudo-target included                    |
| board-grown | settlement      | tap-target-allowed | `button.stat`            | ↗ 7                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board-grown | settlement      | tap-target-allowed | `button.stat`            | $ 2                    | 32       | 44  | 34×32px, pseudo-target included                    |
| purse       | settlement      | tap-target-allowed | `button.stat`            | TILES 10               | 32       | 44  | 73×32px, pseudo-target included                    |
| purse       | settlement      | tap-target-allowed | `button.stat`            | PTS 0                  | 32       | 44  | 53×32px, pseudo-target included                    |
| purse       | settlement      | tap-target-allowed | `button.stat`            | ↗ 5                    | 32       | 44  | 35×32px, pseudo-target included                    |
| board-grown | torchlit-bright | contrast-haloed    | `span.tile-mark`         | ◆                      | 1.37     | 4.5 | rgb(255, 246, 230) on rgb(232, 211, 164) at 18.4px |
| board-grown | torchlit-bright | contrast-haloed    | `span`                   | EMBER                  | 1.37     | 4.5 | rgb(255, 246, 230) on rgb(232, 211, 164) at 12.8px |
| board-grown | torchlit        | contrast-haloed    | `span.tile-mark`         | ◆                      | 1.66     | 4.5 | rgb(242, 228, 196) on rgb(198, 177, 135) at 18.4px |
| board-grown | torchlit        | contrast-haloed    | `span`                   | EMBER                  | 1.66     | 4.5 | rgb(242, 228, 196) on rgb(198, 177, 135) at 12.8px |
| purse       | torchlit        | contrast-disabled  | `#spends > button.armed` | SACRIFICE LUCK → 0 · 0 | 1.87     | 4.5 | rgb(224, 82, 68) on rgb(10, 8, 6) at 12.8px        |
| board-grown | settlement      | contrast-haloed    | `span.tile-mark`         | ◆                      | 1.87     | 4.5 | rgb(242, 230, 207) on rgb(205, 165, 76) at 18.4px  |
| board-grown | settlement      | contrast-haloed    | `span`                   | MARKET                 | 1.87     | 4.5 | rgb(242, 230, 207) on rgb(205, 165, 76) at 12.8px  |
| purse       | settlement      | contrast-disabled  | `#spends > button.armed` | SACRIFICE LUCK → 0 · 0 | 1.98     | 4.5 | rgb(235, 86, 66) on rgb(20, 16, 12) at 12.8px      |
| purse       | daylight        | contrast-disabled  | `#spends > button.armed` | SACRIFICE LUCK → 0 · 0 | 2.17     | 4.5 | rgb(156, 31, 22) on rgb(232, 220, 196) at 12.8px   |
| purse       | torchlit-bright | contrast-disabled  | `#spends > button.armed` | SACRIFICE LUCK → 0 · 0 | 2.17     | 4.5 | rgb(255, 106, 88) on rgb(0, 0, 0) at 12.8px        |
| board       | torchlit-bright | contrast-haloed    | `span.tile-mark`         | ●                      | 2.44     | 4.5 | rgb(255, 246, 230) on rgb(111, 168, 191) at 18.4px |
| board       | torchlit-bright | contrast-haloed    | `span`                   | TIDE                   | 2.44     | 4.5 | rgb(255, 246, 230) on rgb(111, 168, 191) at 12.8px |
| board-grown | torchlit-bright | contrast-haloed    | `span.tile-mark`         | ●                      | 2.44     | 4.5 | rgb(255, 246, 230) on rgb(111, 168, 191) at 18.4px |
| board-grown | torchlit-bright | contrast-haloed    | `span`                   | TIDE                   | 2.44     | 4.5 | rgb(255, 246, 230) on rgb(111, 168, 191) at 12.8px |
| purse       | torchlit-bright | contrast-haloed    | `span.tile-mark`         | ●                      | 2.44     | 4.5 | rgb(255, 246, 230) on rgb(111, 168, 191) at 18.4px |
| purse       | torchlit-bright | contrast-haloed    | `span`                   | TIDE                   | 2.44     | 4.5 | rgb(255, 246, 230) on rgb(111, 168, 191) at 12.8px |
| board       | torchlit        | contrast-haloed    | `span.tile-mark`         | ●                      | 2.87     | 4.5 | rgb(242, 228, 196) on rgb(87, 142, 163) at 18.4px  |
| board       | torchlit        | contrast-haloed    | `span`                   | TIDE                   | 2.87     | 4.5 | rgb(242, 228, 196) on rgb(87, 142, 163) at 12.8px  |
| board-grown | torchlit        | contrast-haloed    | `span.tile-mark`         | ●                      | 2.87     | 4.5 | rgb(242, 228, 196) on rgb(87, 142, 163) at 18.4px  |
| board-grown | torchlit        | contrast-haloed    | `span`                   | TIDE                   | 2.87     | 4.5 | rgb(242, 228, 196) on rgb(87, 142, 163) at 12.8px  |
| purse       | torchlit        | contrast-haloed    | `span.tile-mark`         | ●                      | 2.87     | 4.5 | rgb(242, 228, 196) on rgb(87, 142, 163) at 18.4px  |
| purse       | torchlit        | contrast-haloed    | `span`                   | TIDE                   | 2.87     | 4.5 | rgb(242, 228, 196) on rgb(87, 142, 163) at 12.8px  |
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
| board       | settlement      | contrast-haloed    | `span.tile-mark`         | ●                      | 3.26     | 4.5 | rgb(242, 230, 207) on rgb(95, 131, 155) at 18.4px  |
| board       | settlement      | contrast-haloed    | `span`                   | ROADS                  | 3.26     | 4.5 | rgb(242, 230, 207) on rgb(95, 131, 155) at 12.8px  |
| board-grown | settlement      | contrast-haloed    | `span.tile-mark`         | ●                      | 3.26     | 4.5 | rgb(242, 230, 207) on rgb(95, 131, 155) at 18.4px  |
| board-grown | settlement      | contrast-haloed    | `span`                   | ROADS                  | 3.26     | 4.5 | rgb(242, 230, 207) on rgb(95, 131, 155) at 12.8px  |
| purse       | settlement      | contrast-haloed    | `span.tile-mark`         | ●                      | 3.26     | 4.5 | rgb(242, 230, 207) on rgb(95, 131, 155) at 18.4px  |
| purse       | settlement      | contrast-haloed    | `span`                   | ROADS                  | 3.26     | 4.5 | rgb(242, 230, 207) on rgb(95, 131, 155) at 12.8px  |
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
| purse       | settlement      | contrast-disabled  | `#spends > button`       | REDRAW · 12            | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 12.8px    |
| purse       | settlement      | contrast-disabled  | `#spends > button`       | FARM · 30              | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 12.8px    |
| purse       | settlement      | contrast-disabled  | `#spends > button`       | MARKET · 30            | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 12.8px    |
| purse       | settlement      | contrast-disabled  | `#spends > button`       | QUARRY · 30            | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 12.8px    |
| purse       | settlement      | contrast-disabled  | `#spends > button`       | ROADS · 30             | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 12.8px    |
| purse       | settlement      | contrast-disabled  | `#spends > button`       | FORGE · 75             | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 12.8px    |
| more-played | settlement      | contrast-disabled  | `button`                 | 20                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| more-played | settlement      | contrast-disabled  | `button`                 | 35                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| more-played | settlement      | contrast-disabled  | `button`                 | 50                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| more-played | settlement      | contrast-disabled  | `button`                 | 30                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| more-played | settlement      | contrast-disabled  | `button`                 | 40                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| shop        | settlement      | contrast-disabled  | `button`                 | 20                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| shop        | settlement      | contrast-disabled  | `button`                 | 35                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| shop        | settlement      | contrast-disabled  | `button`                 | 50                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| shop        | settlement      | contrast-disabled  | `button`                 | 30                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| shop        | settlement      | contrast-disabled  | `button`                 | 40                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| end         | settlement      | contrast-disabled  | `button`                 | 20                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| end         | settlement      | contrast-disabled  | `button`                 | 35                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| end         | settlement      | contrast-disabled  | `button`                 | 50                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
| end         | settlement      | contrast-disabled  | `button`                 | 30                     | 3.89     | 4.5 | rgb(242, 230, 207) on rgb(20, 16, 12) at 16px      |
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
