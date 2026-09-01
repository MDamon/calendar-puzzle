# A Puzzle A Day

Every solution to the wooden calendar puzzle — the one with eight blocks you rearrange each
morning so that only today's month and day show through.

**Live: https://mdamon.github.io/calendar-puzzle**

Pick any date and see all of its solutions, or look at which dates are genuinely hard.
Short answer: they are not equal. The median date has 59 solutions, the hardest (Oct 6) has 7,
and the easiest (Jan 25) has 216.

## The board

Twelve months in two rows of six, then days 1–31 in rows of seven — 43 cells on a 7×7 grid.
Eight pieces cover 41 of them: one 2×3 rectangle plus the seven pentominoes `L N P U V Y Z`.
The two cells left showing are the date.

```
Jan Feb Mar Apr May Jun  ·
Jul Aug Sep Oct Nov Dec  ·
  1   2   3   4   5   6   7
  8   9  10  11  12  13  14
 15  16  17  18  19  20  21
 22  23  24  25  26  27  28
 29  30  31   ·   ·   ·   ·
```

## What the numbers say

| | |
|---|---|
| Real dates | 366 (Feb 29 included) |
| Solutions in total | 24,405 |
| Median per date | 59 |
| Hardest | Oct 6 — 7 solutions |
| Easiest | Jan 25 — 216 solutions |

Difficulty tracks the **day** far more than the month. Days in the right-hand column
(7, 14, 21, 28) and the bottom stub (29–31) average well over 100 solutions, because a hole
there sits against an edge the board already has and barely changes the region you must tile.
The 6th averages 26 — it is interior, directly beneath the month block, and it strands the
cells around it.

The board carries 31 days under every month, so it can also express Feb 30, Apr 31 and four
other non-dates. Those are excluded from all counts and rankings here.

## Repo layout

```
index.html          the site
assets/             styles and browser code, no build step
data/index.json     counts, rankings, aggregates
data/MM-DD.json     every solution for that date, fetched on demand
tools/solver.py     exact-cover search over the board
tools/generate.py   regenerates everything in data/
```

Each solution is stored as a 43-character string: one letter per piece over the board's cells
in row-major order, `.` for the two cells left showing.

## Running it

```sh
python3 tools/generate.py     # ~1 min, rewrites data/
python3 -m http.server 8000   # then open http://localhost:8000
```

The solver is a bitmask depth-first search that always fills the lowest empty cell first and
prunes any branch that strands a region smaller than a piece. Every list is exhaustive, not
sampled.

## Notes

Piece colours on the site are labels for the eight shapes; they are not the colours on any
particular physical puzzle. Several manufacturers sell this board (DragonFruit, KUTA and
others) with the same layout and piece set.
