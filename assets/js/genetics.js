// The genome behind the site. Pure functions only, so the same code runs in the
// browser (visitor breeding) and in GitHub Actions (daily evolution).

export const GENE_NAMES = ['hue', 'spread', 'lum', 'flow', 'speed', 'curl', 'grain', 'trail', 'width', 'weight'];

export const GENE_INFO = {
  hue: 'Accent hue',
  spread: 'Colour spread',
  lum: 'Luminance',
  flow: 'Flow scale',
  speed: 'Speed',
  curl: 'Turbulence',
  grain: 'Particle size',
  trail: 'Trail length',
  width: 'Type width',
  weight: 'Type weight',
};

export const GENESIS = {
  hue: 0.31, spread: 0.42, lum: 0.62, flow: 0.45, speed: 0.4,
  curl: 0.45, grain: 0.4, trail: 0.6, width: 0.5, weight: 0.7,
};

const BG = [10, 10, 9];

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Seeded PRNG (mulberry32): the same input always evolves to the same result. */
export function makeRng(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function gaussian(rng) {
  const u = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

// --- colour -----------------------------------------------------------------

export function oklchToRgb(l, c, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const L = l + 0.3963377774 * a + 0.2158037573 * b;
  const M = l - 0.1055613458 * a - 0.0638541728 * b;
  const S = l - 0.0894841775 * a - 1.291485548 * b;
  const lin = [
    4.0767416621 * L ** 3 - 3.3077115913 * M ** 3 + 0.2309699292 * S ** 3,
    -1.2684380046 * L ** 3 + 2.6097574011 * M ** 3 - 0.3413193965 * S ** 3,
    -0.0041960863 * L ** 3 - 0.7034186147 * M ** 3 + 1.707614701 * S ** 3,
  ];
  return lin.map((v) => {
    const x = clamp01(v);
    const s = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(s * 255);
  });
}

export function rgbToHex(rgb) {
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// --- genome -> what you see -------------------------------------------------

const secondaryHue = (g) => (g.hue * 360 + 30 + g.spread * 130) % 360;
const isViolet = (deg) => deg > 250 && deg < 325;
const isTiredAccent = (deg) => isViolet(deg) || (deg > 160 && deg < 225);

export function phenotype(g) {
  const hueDeg = g.hue * 360;
  const accentL = 0.72 + g.lum * 0.2;
  const accent = oklchToRgb(accentL, 0.165, hueDeg);
  const accent2 = oklchToRgb(accentL - 0.16, 0.15, secondaryHue(g));
  return {
    accent,
    accent2,
    accentHex: rgbToHex(accent),
    accent2Hex: rgbToHex(accent2),
    flowScale: 0.7 + g.flow * 2.4,
    speed: 0.25 + g.speed * 1.15,
    curl: 0.25 + g.curl * 1.5,
    size: 1.1 + g.grain * 1.5,
    trail: 0.86 + g.trail * 0.115,
    fontWeight: Math.round(620 + g.weight * 280),
    fontWidth: 0.92 + g.width * 0.16,
  };
}

/** Starting points a visitor can jump to. Every one obeys the same taste and contrast rules. */
export const PALETTES = [
  { name: 'Signal', hue: 0.273, spread: 0.82, lum: 0.42 },
  { name: 'Ember', hue: 0.09, spread: 0.62, lum: 0.5 },
  { name: 'Lime', hue: 0.37, spread: 0.5, lum: 0.6 },
  { name: 'Ice', hue: 0.655, spread: 0.62, lum: 0.62 },
  { name: 'Rose', hue: 0.945, spread: 0.42, lum: 0.55 },
];

const LIGHT_L = (g) => 0.74 + g.lum * 0.16;

/** Colours for coding: one per pipeline stage, stepping from the accent to the secondary. */
export function layerColors(g, count = 7) {
  const from = g.hue * 360;
  const to = secondaryHue(g);
  const span = ((to - from + 540) % 360) - 180;
  return Array.from({ length: count }, (_, i) => {
    let h = (from + (span * i) / (count - 1) + 360) % 360;
    // Stepping can pass through the violet band, so skip over it.
    if (isViolet(h)) h = h < 287 ? 245 : 330;
    return oklchToRgb(LIGHT_L(g), 0.15, h);
  });
}

function hueDistance(a, b) {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d) * 2;
}

export function geneDistance(a, b) {
  let sum = 0;
  for (const name of GENE_NAMES) {
    const d = name === 'hue' ? hueDistance(a[name], b[name]) : a[name] - b[name];
    sum += d * d;
  }
  return Math.sqrt(sum / GENE_NAMES.length);
}

// --- fitness ----------------------------------------------------------------

/**
 * Scores a candidate from 0 to 1 and says why.
 * env.activity:  how much Mohan shipped recently, 0..1. Drives energy.
 * env.diversity: entropy of his language mix, 0..1. Drives colour spread.
 * env.ancestors: recent genomes. The site is rewarded for not repeating itself.
 * env.parent:    previous genome. Change must read as evolution, not a redesign.
 */
export function fitness(g, env) {
  const p = phenotype(g);
  const ancestors = env.ancestors || [];

  const legibility = Math.min(
    1,
    Math.min(contrastRatio(p.accent, BG) / 9, contrastRatio(p.accent2, BG) / 4.5),
  );

  // Taste rule: stay clear of the two most overused looks on dark sites, the
  // violet gradient and the neon teal accent.
  const distinct = isTiredAccent(g.hue * 360) || isViolet(secondaryHue(g)) ? 0 : 1;

  const novelty = ancestors.length
    ? Math.min(1, Math.min(...ancestors.map((a) => geneDistance(g, a))) / 0.22)
    : 1;

  const drift = env.parent ? geneDistance(g, env.parent) : 0;
  const continuity = drift <= 0.3 ? 1 : clamp01(1 - (drift - 0.3) / 0.3);

  const energyTarget = 0.2 + (env.activity ?? 0.5) * 0.7;
  const energy = 1 - Math.abs((g.speed + g.curl) / 2 - energyTarget);

  const spreadTarget = 0.15 + (env.diversity ?? 0.5) * 0.75;
  const diversity = 1 - Math.abs(g.spread - spreadTarget);

  const parts = { legibility, distinct, novelty, continuity, energy, diversity };
  const total =
    legibility * 0.25 + distinct * 0.15 + novelty * 0.2 +
    continuity * 0.15 + energy * 0.15 + diversity * 0.1;

  return { total, parts };
}

// --- variation and selection ------------------------------------------------

export function mutate(g, rng, sigma = 0.07) {
  const out = {};
  for (const name of GENE_NAMES) {
    const jump = rng() < 0.12 ? 3.5 : 1;
    const v = g[name] + gaussian(rng) * sigma * jump;
    out[name] = name === 'hue' ? ((v % 1) + 1) % 1 : clamp01(v);
  }
  return out;
}

export function crossover(a, b, rng) {
  const out = {};
  for (const name of GENE_NAMES) out[name] = rng() < 0.5 ? a[name] : b[name];
  return out;
}

/** Runs a small tournament-selection GA and returns the fittest genome. */
export function evolve(parent, env, seed, { population = 48, rounds = 10 } = {}) {
  const rng = makeRng(seed);
  const ancestors = env.ancestors || [];
  const score = (genes) => ({ genes, fit: fitness(genes, { ...env, parent }) });

  let pool = Array.from({ length: population }, () => score(mutate(parent, rng, 0.12)));

  const pick = () => {
    const a = pool[Math.floor(rng() * pool.length)];
    const b = pool[Math.floor(rng() * pool.length)];
    return a.fit.total >= b.fit.total ? a : b;
  };

  for (let round = 0; round < rounds; round++) {
    const best = pool.reduce((x, y) => (y.fit.total > x.fit.total ? y : x));
    const next = [best];
    while (next.length < population) {
      const mate = ancestors.length && rng() < 0.15
        ? ancestors[Math.floor(rng() * ancestors.length)]
        : pick().genes;
      next.push(score(mutate(crossover(pick().genes, mate, rng), rng)));
    }
    pool = next;
  }

  const winner = pool.reduce((x, y) => (y.fit.total > x.fit.total ? y : x));
  return { genes: winner.genes, fitness: winner.fit };
}

// --- from public GitHub data to the next generation -------------------------

const DAY = 86400000;
const DRIFT_AFTER_DAYS = 7;
const round3 = (v) => Math.round(v * 1000) / 1000;

function roundGenes(g) {
  return Object.fromEntries(GENE_NAMES.map((n) => [n, round3(g[n])]));
}

/** repos: normalised list of public, non-fork repos, excluding the site itself. */
export function summarize(repos, now) {
  const counts = {};
  for (const r of repos) if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(counts)
    .map(([name, n]) => ({ name, share: round3(n / total) }))
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));

  const entries = languages.length;
  const entropy = languages.reduce((s, l) => s - l.share * Math.log(l.share), 0);
  const diversity = entries > 1 ? entropy / Math.log(entries) : 0;

  const age = (r) => (now - Date.parse(r.pushedAt)) / DAY;
  const active30 = repos.filter((r) => age(r) <= 30).length;
  const active90 = repos.filter((r) => age(r) <= 90).length;
  const activity = clamp01((active30 * 2 + active90) / 12);

  const latest = repos.reduce((a, b) => (!a || b.pushedAt > a.pushedAt ? b : a), null);

  return {
    repos: repos.length,
    languages,
    active30,
    active90,
    stars: repos.reduce((s, r) => s + (r.stars || 0), 0),
    lastPush: latest ? { repo: latest.name, at: latest.pushedAt } : null,
    activity: round3(activity),
    diversity: round3(diversity),
  };
}

export function fingerprint(repos) {
  return repos
    .map((r) => `${r.name}:${r.pushedAt}:${r.stars || 0}`)
    .sort()
    .join('|');
}

function changedRepos(prevRepos, repos) {
  const seen = new Map(prevRepos.map((r) => [r.name, r]));
  return repos
    .filter((r) => {
      const before = seen.get(r.name);
      return !before || before.pushedAt !== r.pushedAt || before.stars !== r.stars;
    })
    .map((r) => r.name);
}

/**
 * Produces the next genome document, or null when nothing should change.
 * A new generation is born when public work changed or a week has gone by,
 * so the history of the site reflects something real rather than a daily tick.
 */
export function step(prev, repos, nowMs) {
  const now = new Date(nowMs).toISOString();
  const stats = summarize(repos, nowMs);
  const print = fingerprint(repos);

  if (prev) {
    const unchanged = prev.fingerprint === print;
    const ageDays = (nowMs - Date.parse(prev.born)) / DAY;
    if (unchanged && ageDays < DRIFT_AFTER_DAYS) return null;
  }

  const generation = (prev?.generation ?? 0) + 1;
  const parent = prev?.genes ?? GENESIS;
  const lineage = prev?.lineage ?? [];
  const changed = prev ? changedRepos(prev.repos, repos) : [];

  let trigger;
  if (!prev) trigger = { type: 'genesis', repos: [] };
  else if (changed.length) trigger = { type: 'activity', repos: changed.slice(0, 5) };
  else trigger = { type: 'drift', repos: [] };

  const { genes, fitness: fit } = evolve(
    parent,
    {
      activity: stats.activity,
      diversity: stats.diversity,
      ancestors: lineage.slice(-12).map((l) => l.genes),
    },
    `${print}#${generation}`,
  );

  const clean = roundGenes(genes);
  const fitnessOut = {
    total: round3(fit.total),
    parts: Object.fromEntries(Object.entries(fit.parts).map(([k, v]) => [k, round3(v)])),
  };

  return {
    generation,
    born: now,
    trigger,
    genes: clean,
    fitness: fitnessOut,
    stats,
    repos,
    fingerprint: print,
    lineage: [
      ...lineage,
      { generation, born: now, genes: clean, trigger: trigger.type, fitness: fitnessOut.total },
    ].slice(-180),
  };
}
