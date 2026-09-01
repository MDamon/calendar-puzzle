/* A Puzzle A Day — solution browser.
   Reads data/index.json once, then data/MM-DD.json on demand. */

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_LONG = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];
const PIECES = ["R","L","N","P","U","V","Y","Z"];
// Named for the blocks on the physical puzzle, matched to shapes by reconstructing
// the one arrangement consistent with the photographed board.
const PIECE_NAME = {R:"2×3 yellow", L:"green", N:"navy", P:"sky", U:"orange", V:"black", Y:"lemon", Z:"red"};
const LIGHT_PIECES = {R:1, P:1, Y:1};     // pale blocks — letters go dark on them
const PAGE = 40;                          // solutions rendered per batch

const W = 7, H = 7;
const CELL_LABEL = {};                    // board index -> "Jan" | "17"
MONTHS.forEach((m, i) => { CELL_LABEL[((i / 6) | 0) * W + (i % 6)] = m; });
for (let d = 1; d <= 31; d++) CELL_LABEL[(((d - 1) / 7 | 0) + 2) * W + ((d - 1) % 7)] = String(d);

const $ = id => document.getElementById(id);
const key = (m, d) => String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
const daysInMonth = m => [31,29,31,30,31,30,31,31,30,31,30,31][m - 1];

let INDEX = null, CELLS = [], POS = {}, shown = 0, current = [], sel = { m: 1, d: 1 };

/* ---------- difficulty colour ---------- */

function tone(count, lo, hi) {
  // log scale: counts are heavily right-skewed, so linear would flatten the low end
  const t = Math.max(0, Math.min(1, (Math.log(count) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))));
  const hue = 6 + t * 128;                 // 6 = red, 134 = green
  return { t, css: `hsl(${hue} 52% 44%)` };
}

/* ---------- board rendering ---------- */

function boardEl(encoded) {
  const b = document.createElement("div");
  b.className = "board";
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = r * W + c;
      const d = document.createElement("div");
      const live = i in POS;
      if (!live) { d.className = "c dead"; b.appendChild(d); continue; }
      const p = encoded[POS[i]];
      if (p === ".") {
        d.className = "c date";
        d.textContent = CELL_LABEL[i];
      } else {
        d.className = "c" + (LIGHT_PIECES[p] ? " light" : "");
        d.style.background = "var(--p-" + p + ")";
        // seam only where a different piece abuts, so each piece reads as one block
        [[-1,0,"Top"],[0,1,"Right"],[1,0,"Bottom"],[0,-1,"Left"]].forEach(([dr, dc, side]) => {
          const rr = r + dr, cc = c + dc, j = rr * W + cc;
          const same = rr >= 0 && rr < H && cc >= 0 && cc < W && (j in POS) && encoded[POS[j]] === p;
          if (!same) d.style["border" + side + "Color"] = "var(--panel)";
        });
        const lab = document.createElement("span");
        lab.className = "lab";
        lab.textContent = p;
        d.appendChild(lab);
      }
      b.appendChild(d);
    }
  }
  return b;
}

function anchorOf(encoded) {              // where the 2x3 rectangle sits — a useful sort key
  for (let i = 0; i < CELLS.length; i++) if (encoded[i] === "R") return CELL_LABEL[CELLS[i]];
  return "";
}

function renderBatch() {
  const grid = $("grid");
  const end = Math.min(shown + PAGE, current.length);
  const frag = document.createDocumentFragment();
  for (let i = shown; i < end; i++) {
    const card = document.createElement("div");
    card.className = "card";
    const h = document.createElement("h3");
    h.innerHTML = String(i + 1).padStart(2, "0") + " <span>yellow 2×3 at " + anchorOf(current[i]) + "</span>";
    card.appendChild(h);
    card.appendChild(boardEl(current[i]));
    frag.appendChild(card);
  }
  grid.appendChild(frag);
  shown = end;
  $("moreWrap").hidden = shown >= current.length;
  $("more").textContent = "Show " + Math.min(PAGE, current.length - shown) + " more of " + current.length;
}

/* ---------- date selection ---------- */

async function select(m, d, scroll) {
  sel = { m, d };
  d = Math.min(d, daysInMonth(m));
  paintPickers();
  history.replaceState(null, "", "#" + key(m, d));

  const count = INDEX.counts[key(m, d)];
  const rank = INDEX.rank[key(m, d)];
  const { t, css } = tone(count, INDEX.min, INDEX.max);
  const label = MONTH_LONG[m - 1] + " " + d;

  $("vCount").textContent = count;
  $("vCount").style.color = css;
  const n4 = INDEX.dates;
  const band = rank <= 30 ? "Hard" : rank <= n4 / 3 ? "Tricky" : rank >= n4 - 24 ? "Very forgiving" : rank >= n4 * 0.68 ? "Forgiving" : "Middling";
  $("vPill").textContent = band;
  $("vPill").style.color = css;
  $("vText").innerHTML = "<b>" + label + "</b> has <b>" + count + "</b> solution" + (count === 1 ? "" : "s")
    + " — the " + ord(rank) + " fewest of " + INDEX.dates + " real dates. The median date has " + INDEX.median + ".";
  $("vMark").style.left = (t * 100) + "%";
  $("solHead").textContent = "All " + count + " solutions for " + label;

  const grid = $("grid");
  grid.innerHTML = "";
  shown = 0;
  current = [];
  $("moreWrap").hidden = true;

  const res = await fetch("data/" + key(m, d) + ".json");
  current = await res.json();
  renderBatch();
  if (scroll) $("solSec").scrollIntoView({ behavior: "smooth", block: "start" });
}

function ord(n) {
  const s = ["th","st","nd","rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function paintPickers() {
  const monthAvgs = Object.values(INDEX.byMonth);
  const mLo = Math.min(...monthAvgs), mHi = Math.max(...monthAvgs);
  [...$("months").children].forEach((b, i) => {
    const avg = INDEX.byMonth[String(i + 1).padStart(2, "0")];
    b.setAttribute("aria-pressed", String(i + 1 === sel.m));
    b.querySelector(".n").textContent = avg + " avg";
    b.querySelector(".fill").style.background = tone(avg, mLo, mHi).css;
    b.querySelector(".fill").style.width = (12 + tone(avg, mLo, mHi).t * 88) + "%";
  });

  const counts = [];
  for (let d = 1; d <= daysInMonth(sel.m); d++) counts.push(INDEX.counts[key(sel.m, d)]);
  const dLo = Math.min(...counts), dHi = Math.max(...counts);
  [...$("days").children].forEach((b, i) => {
    const d = i + 1;
    const ok = d <= daysInMonth(sel.m);
    b.hidden = !ok;
    if (!ok) return;
    const n = INDEX.counts[key(sel.m, d)];
    const { t, css } = tone(n, dLo, dHi);
    b.setAttribute("aria-pressed", String(d === sel.d));
    b.querySelector(".n").textContent = n;
    b.querySelector(".fill").style.background = css;
    b.querySelector(".fill").style.width = (12 + t * 88) + "%";
  });
}

/* ---------- static sections ---------- */

function buildPickers() {
  MONTHS.forEach((m, i) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.type = "button";
    b.innerHTML = m + '<span class="n"></span><span class="fill"></span>';
    b.addEventListener("click", () => select(i + 1, sel.d, true));
    $("months").appendChild(b);
  });
  for (let d = 1; d <= 31; d++) {
    const b = document.createElement("button");
    b.className = "opt";
    b.type = "button";
    b.innerHTML = d + '<span class="n"></span><span class="fill"></span>';
    b.addEventListener("click", () => select(sel.m, d, true));
    $("days").appendChild(b);
  }
}

function buildLegend() {
  PIECES.forEach(p => {
    const s = document.createElement("span");
    s.className = "chip";
    s.innerHTML = '<i class="sw" style="background:var(--p-' + p + ')"></i>' + PIECE_NAME[p];
    $("legend").appendChild(s);
  });
}

function buildTables() {
  const rows = INDEX.real.map(k => [k, INDEX.counts[k]]).sort((a, b) => a[1] - b[1]);
  const fill = (tbody, list) => {
    list.forEach(([k, n]) => {
      const [m, d] = k.split("-").map(Number);
      const tr = document.createElement("tr");
      tr.innerHTML = '<td><a tabindex="0" role="button">' + MONTHS[m - 1] + " " + d + "</a></td>"
                   + '<td class="num">' + n + "</td>";
      const go = () => select(m, d, true);
      tr.querySelector("a").addEventListener("click", go);
      tr.querySelector("a").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      $(tbody).appendChild(tr);
    });
  };
  fill("hardest", rows.slice(0, 12));
  fill("easiest", rows.slice(-12).reverse());
}

function buildBars() {
  const mk = (host, entries, fmt) => {
    const vals = entries.map(e => e[1]);
    const hi = Math.max(...vals), lo = Math.min(...vals);
    entries.forEach(([k, v]) => {
      const row = document.createElement("div");
      row.className = "bar" + (v === hi ? " hi" : v === lo ? " lo" : "");
      row.innerHTML = '<span>' + fmt(k) + '</span>'
        + '<span class="track"><span class="fill" style="width:' + (v / hi * 100).toFixed(1) + '%"></span></span>'
        + '<span class="v">' + v + '</span>';
      host.appendChild(row);
    });
  };
  mk($("byDay"), Object.entries(INDEX.byDay), k => Number(k));
  mk($("byMonth"), Object.entries(INDEX.byMonth), k => MONTHS[Number(k) - 1]);
}

/* ---------- boot ---------- */

(async function () {
  INDEX = await (await fetch("data/index.json")).json();
  CELLS = INDEX.cells;
  CELLS.forEach((cell, i) => { POS[cell] = i; });

  buildPickers();
  buildLegend();
  buildTables();
  buildBars();

  const now = new Date();
  let m = now.getMonth() + 1, d = now.getDate(), fromHash = false;
  const h = location.hash.match(/^#(\d{2})-(\d{2})$/);
  if (h && +h[1] >= 1 && +h[1] <= 12 && +h[2] >= 1 && +h[2] <= 31) {
    m = +h[1]; d = +h[2]; fromHash = true;
  }

  const todayKey = key(now.getMonth() + 1, now.getDate());
  $("statCount").textContent = INDEX.counts[todayKey];
  $("statRank").textContent = INDEX.rank[todayKey] + " / " + INDEX.dates;
  $("eyebrow").textContent = "Today — " + MONTH_LONG[now.getMonth()] + " " + now.getDate();
  if (fromHash) $("headline").innerHTML = "A puzzle <em>a day</em>";

  $("toggleLabels").addEventListener("click", e => {
    const on = document.body.classList.toggle("labels");
    e.currentTarget.setAttribute("aria-pressed", String(on));
    e.currentTarget.textContent = on ? "Hide piece letters" : "Show piece letters";
  });
  $("more").addEventListener("click", renderBatch);

  await select(m, d, false);
})();
