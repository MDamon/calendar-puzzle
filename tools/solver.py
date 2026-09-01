import sys
from functools import lru_cache

R, C = 7, 7
def idx(r,c): return r*C+c

# valid board cells
valid = set()
labels = {}
months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
for i,m in enumerate(months):
    r,c = divmod(i,6)
    valid.add(idx(r,c)); labels[m]=idx(r,c)
for d in range(1,32):
    r,c = divmod(d-1,7)
    r += 2
    valid.add(idx(r,c)); labels[str(d)]=idx(r,c)
assert len(valid)==43

PIECES = {
 'rect': [(0,0),(0,1),(0,2),(1,0),(1,1),(1,2)],
 'L':    [(0,0),(1,0),(2,0),(3,0),(3,1)],
 'N':    [(0,1),(1,1),(2,0),(2,1),(3,0)],
 'P':    [(0,0),(0,1),(1,0),(1,1),(2,0)],
 'U':    [(0,0),(0,2),(1,0),(1,1),(1,2)],
 'V':    [(0,0),(1,0),(2,0),(2,1),(2,2)],
 'Y':    [(0,1),(1,0),(1,1),(2,1),(3,1)],
 'Z':    [(0,0),(0,1),(1,1),(2,1),(2,2)],
 'T':    [(0,0),(0,1),(0,2),(1,1),(2,1)],
 'S':    [(0,0),(1,0),(1,1),(2,1),(3,1)],
}

def norm(cells):
    mr=min(r for r,_ in cells); mc=min(c for _,c in cells)
    return tuple(sorted((r-mr,c-mc) for r,c in cells))
def orients(cells):
    out=set(); cur=cells
    for _ in range(4):
        cur=[(c,-r) for r,c in cur]
        out.add(norm(cur)); out.add(norm([(r,-c) for r,c in cur]))
    return sorted(out)

def placements(names):
    all_pl=[]
    for n in names:
        pl=[]
        for o in orients(PIECES[n]):
            h=max(r for r,_ in o)+1; w=max(c for _,c in o)+1
            for r0 in range(R-h+1):
                for c0 in range(C-w+1):
                    cells=[idx(r0+r,c0+c) for r,c in o]
                    if all(x in valid for x in cells):
                        m=0
                        for x in cells: m|=1<<x
                        pl.append(m)
        all_pl.append(sorted(set(pl)))
    return all_pl

FULL = 0
for x in valid: FULL |= 1<<x
NEIGH=[0]*(R*C)
for x in valid:
    r,c=divmod(x,C)
    m=0
    for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):
        nr,nc=r+dr,c+dc
        if 0<=nr<R and 0<=nc<C and idx(nr,nc) in valid: m|=1<<idx(nr,nc)
    NEIGH[x]=m

MINP=5
def has_small_region(empty):
    e=empty
    while e:
        low=e & -e
        region=low; frontier=low
        while frontier:
            nxt=0
            f=frontier
            while f:
                b=f & -f; f^=b
                nxt |= NEIGH[b.bit_length()-1]
            nxt &= e & ~region
            region |= nxt; frontier=nxt
        if bin(region).count('1') % MINP and bin(region).count('1') < MINP:
            return True
        if bin(region).count('1') < MINP: return True
        e &= ~region
    return False

def solve(pl, target_mask, count_only=True, cap=None):
    n=len(pl)
    # index placements by lowest cell
    by_low=[[[] for _ in range(R*C)] for _ in range(n)]
    for i,ps in enumerate(pl):
        for m in ps:
            by_low[i][(m & -m).bit_length()-1].append(m)
    occ = target_mask  # cells NOT to cover (the two date cells) marked as occupied
    total=0
    sols=[]
    def rec(occ, used, path):
        nonlocal total
        if used == (1<<n)-1:
            total+=1
            if cap and len(sols)<cap: sols.append(list(path))
            return
        empty = FULL & ~occ
        if has_small_region(empty): return
        low=(empty & -empty).bit_length()-1
        for i in range(n):
            if used>>i & 1: continue
            for m in by_low[i][low]:
                if m & occ: continue
                path.append((i,m))
                rec(occ|m, used|1<<i, path)
                path.pop()
    rec(occ,0,[])
    return total, sols

if __name__=="__main__":
    names=sys.argv[1].split(',')
    pl=placements(names)
    tot=0; bad=[]
    for m in months:
        for d in range(1,32):
            t=(1<<labels[m])|(1<<labels[str(d)])
            c,_=solve(pl,t)
            if c==0: bad.append((m,d))
            tot+=c
    print(names, "total", tot, "unsolvable", len(bad), bad[:5])
