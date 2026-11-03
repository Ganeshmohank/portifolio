import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  GENESIS, GENE_NAMES, PALETTES, contrastRatio, evolve, fitness, layerColors, phenotype, step, summarize,
} from '../assets/js/genetics.js';

const DAY = 86400000;
const NOW = Date.parse('2026-11-02T12:00:00Z');
const repo = (name, ageDays, language = 'Go', stars = 0) => ({
  name,
  url: `https://github.com/x/${name}`,
  description: '',
  language,
  stars,
  pushedAt: new Date(NOW - ageDays * DAY).toISOString(),
});
const REPOS = [repo('a', 2), repo('b', 40, 'Python'), repo('c', 400, 'Java', 2)];

test('the first run creates generation 1 from genesis', () => {
  const doc = step(null, REPOS, NOW);
  assert.equal(doc.generation, 1);
  assert.equal(doc.trigger.type, 'genesis');
  assert.equal(doc.lineage.length, 1);
});

test('nothing changes when there is no activity and the genome is under a week old', () => {
  const doc = step(null, REPOS, NOW);
  assert.equal(step(doc, REPOS, NOW + 3 * DAY), null);
});

test('a new push creates a generation and names the repo responsible', () => {
  const doc = step(null, REPOS, NOW);
  const pushed = [{ ...REPOS[0], pushedAt: new Date(NOW + DAY).toISOString() }, REPOS[1], REPOS[2]];
  const next = step(doc, pushed, NOW + DAY);
  assert.equal(next.generation, 2);
  assert.deepEqual(next.trigger, { type: 'activity', repos: ['a'] });
  assert.equal(next.lineage.length, 2);
});

test('a quiet week triggers scheduled drift, which keeps the repo active', () => {
  const doc = step(null, REPOS, NOW);
  const next = step(doc, REPOS, NOW + 8 * DAY);
  assert.equal(next.trigger.type, 'drift');
});

test('evolution is deterministic for the same input', () => {
  assert.deepEqual(step(null, REPOS, NOW).genes, step(null, REPOS, NOW).genes);
});

test('all genes stay in range across a long lineage', () => {
  let doc = step(null, REPOS, NOW);
  for (let i = 1; i <= 40; i++) {
    doc = step(doc, REPOS, NOW + i * 8 * DAY);
    for (const name of GENE_NAMES) {
      assert.ok(doc.genes[name] >= 0 && doc.genes[name] <= 1, `${name}=${doc.genes[name]}`);
    }
  }
  assert.equal(doc.generation, 41);
});

test('every evolved generation stays readable and off the overused violet and teal bands', () => {
  let doc = step(null, REPOS, NOW);
  for (let i = 1; i <= 40; i++) {
    doc = step(doc, REPOS, NOW + i * 8 * DAY);
    const p = phenotype(doc.genes);
    assert.ok(contrastRatio(p.accent, [10, 10, 9]) >= 7, `accent contrast, generation ${i}`);
    assert.ok(contrastRatio(p.accent2, [10, 10, 9]) >= 4.5, `accent2 contrast, generation ${i}`);
    const hue = doc.genes.hue * 360;
    assert.ok(hue <= 160 || (hue >= 225 && hue <= 250) || hue >= 325, `accent hue ${hue}, generation ${i}`);
    const second = (hue + 30 + doc.genes.spread * 130) % 360;
    assert.ok(second <= 250 || second >= 325, `secondary hue ${second}, generation ${i}`);
  }
});

test('selection improves on the parent', () => {
  const env = { activity: 0.9, diversity: 0.8, ancestors: [GENESIS] };
  const before = fitness(GENESIS, { ...env, parent: GENESIS }).total;
  const after = evolve(GENESIS, env, 'seed').fitness.total;
  assert.ok(after > before, `${after} should beat ${before}`);
});

test('more shipping produces a more energetic field', () => {
  const quiet = evolve(GENESIS, { activity: 0, diversity: 0.5 }, 'seed').genes;
  const busy = evolve(GENESIS, { activity: 1, diversity: 0.5 }, 'seed').genes;
  assert.ok((busy.speed + busy.curl) / 2 > (quiet.speed + quiet.curl) / 2);
});

test('every palette and its colour coding stays readable and off the violet band', () => {
  for (const palette of PALETTES) {
    const genes = { ...GENESIS, ...palette };
    const p = phenotype(genes);
    assert.ok(contrastRatio(p.accent, [10, 10, 9]) >= 7, `${palette.name} accent`);
    assert.ok(contrastRatio(p.accent2, [10, 10, 9]) >= 4.5, `${palette.name} secondary`);
    const f = fitness(genes, { activity: 0.5, diversity: 0.5, parent: genes, ancestors: [] });
    assert.equal(f.parts.distinct, 1, `${palette.name} is on a banned hue`);
    for (const c of layerColors(genes, 7)) {
      assert.ok(contrastRatio(c, [10, 10, 9]) >= 4.5, `${palette.name} stage colour`);
    }
  }
});

test('summarize reports real counts', () => {
  const s = summarize(REPOS, NOW);
  assert.equal(s.repos, 3);
  assert.equal(s.active30, 1);
  assert.equal(s.active90, 2);
  assert.equal(s.stars, 2);
  assert.equal(s.lastPush.repo, 'a');
});
