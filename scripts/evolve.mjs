// Runs in GitHub Actions. Reads public GitHub data, breeds the next generation of
// the site's genome and writes data/genome.json. Prints changed=true|false.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { step } from '../assets/js/genetics.js';

const USER = process.env.GENOME_USER || 'Ganeshmohank';
// The site's own repo changes every generation, and the profile README says
// nothing about the work, so neither one counts as a signal.
const IGNORED = new Set(['portifolio', USER, 'immersion2026', 'badgecollection', '220-A', 'security', 'TestAgent']);

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, '../data/genome.json');

async function fetchRepos() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'portfolio-evolve' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const all = [];
  for (let page = 1; page <= 5; page++) {
    const url = `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`GitHub API responded ${res.status} for ${url}`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 100) break;
  }

  return all
    .filter((r) => !r.fork && !r.private && !r.archived && !IGNORED.has(r.name))
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      description: r.description || '',
      language: r.language || '',
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
    }))
    .sort((a, b) => (a.pushedAt < b.pushedAt ? 1 : -1));
}

function report(changed) {
  console.log(`changed=${changed}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
}

const prev = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;

let repos;
try {
  repos = await fetchRepos();
} catch (error) {
  // A GitHub outage must not fail the run or disturb the lineage.
  console.error(`Skipping this run: ${error.message}`);
  report(false);
  process.exit(0);
}

if (!repos.length) {
  console.error('Skipping this run: GitHub returned no repositories.');
  report(false);
  process.exit(0);
}

const next = step(prev, repos, Date.now());

if (!next) {
  console.log(`Generation ${prev.generation} still stands: no public activity, under a week old.`);
  report(false);
} else {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Generation ${next.generation} (${next.trigger.type}), fitness ${next.fitness.total}`);
  report(true);
}
