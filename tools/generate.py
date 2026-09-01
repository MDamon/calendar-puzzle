"""Enumerate every solution of the A-Puzzle-A-Day calendar board for all 372 dates.

Writes data/index.json (counts + aggregates) and data/<MM>-<DD>.json (solutions).
Each solution is a 43-character string over the board's valid cells in row-major
order: one letter per piece, '.' for the two cells left showing (month + day).
"""
import json, os, sys, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from solver import PIECES, placements, solve, labels, months, valid, idx, R, C

NAMES = ['rect', 'L', 'N', 'P', 'U', 'V', 'Y', 'Z']
SYM   = {'rect': 'R', 'L': 'L', 'N': 'N', 'P': 'P', 'U': 'U', 'V': 'V', 'Y': 'Y', 'Z': 'Z'}
CELLS = sorted(valid)                      # canonical row-major order of the 43 cells
POS   = {cell: i for i, cell in enumerate(CELLS)}
DAYS  = list(range(1, 32))

def mean(xs):
    xs = list(xs)
    return sum(xs) / len(xs)


HERE = os.path.dirname(os.path.abspath(__file__))
OUT  = os.path.join(HERE, '..', 'data')


def encode(placement):
    """(piece_index, bitmask) pairs -> 43-char string."""
    buf = ['.'] * len(CELLS)
    for i, mask in placement:
        m = mask
        while m:
            b = m & -m
            m ^= b
            buf[POS[b.bit_length() - 1]] = SYM[NAMES[i]]
    return ''.join(buf)


def main():
    os.makedirs(OUT, exist_ok=True)
    pl = placements(NAMES)
    counts = {}

    for mi, mon in enumerate(months):
        for day in DAYS:
            target = (1 << labels[mon]) | (1 << labels[str(day)])
            n, sols = solve(pl, target, cap=10 ** 7)
            assert n == len(sols)
            key = f"{mi+1:02d}-{day:02d}"
            counts[key] = n
            encoded = sorted(encode(s) for s in sols)
            with open(os.path.join(OUT, key + '.json'), 'w') as f:
                json.dump(encoded, f, separators=(',', ':'))
            print(key, n, flush=True)

    # The board carries 31 days for every month, so it can express Feb 30, Apr 31 and
    # friends. Those are enumerable but not dates; stats and rankings use real ones only
    # (Feb 29 counts — leap years happen). The impossible six stay in `counts` so the
    # site can still render them if asked.
    LENGTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    real = [f"{m+1:02d}-{d:02d}" for m in range(12) for d in DAYS if d <= LENGTH[m]]
    realset = set(real)

    ordered = sorted(real, key=lambda k: counts[k])
    rank = {k: i + 1 for i, k in enumerate(ordered)}        # 1 = fewest solutions
    vals = sorted(counts[k] for k in real)

    index = {
        'cells': CELLS,
        'width': C,
        'height': R,
        'pieces': [SYM[n] for n in NAMES],
        'counts': counts,
        'rank': rank,
        'real': real,
        'total': sum(vals),
        'dates': len(real),
        'min': vals[0],
        'max': vals[-1],
        'mean': round(sum(vals) / len(vals), 1),
        'median': statistics.median(vals),
        'quartiles': [vals[len(vals)//4], vals[len(vals)//2], vals[3*len(vals)//4]],
        'byMonth': {f"{i+1:02d}": round(mean(counts[k] for k in real if k.startswith(f"{i+1:02d}-")), 1)
                    for i in range(12)},
        'byDay': {f"{d:02d}": round(mean(counts[k] for k in real if k.endswith(f"-{d:02d}")), 1)
                  for d in DAYS},
    }
    with open(os.path.join(OUT, 'index.json'), 'w') as f:
        json.dump(index, f, separators=(',', ':'))
    print('total', index['total'], 'min', index['min'], 'max', index['max'])


if __name__ == '__main__':
    main()
