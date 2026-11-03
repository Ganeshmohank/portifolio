// A real retrieval pipeline that runs in the visitor's browser, over this site's own
// content. Hashed TF-IDF vectors, cosine search, extractive answers with citations and
// a guard that refuses when the sources do not support an answer. There is no LLM,
// so it cannot make anything up. Pure functions, so it is tested in Node too.

const DIM = 4096;

const STOP = new Set(`a an and are as at be but by can did do does for from had has have he her his how i
if in into is it its me my of on or our she so than that the their them they this to was were what when
where which who whom why will with would you your about tell mohan kancherla please much many there any
some could should him us we not no`.split(/\s+/));

// Small domain thesaurus, so people can ask in their own words.
const ALIASES = {
  job: ['experience', 'worked', 'engineer'], jobs: ['experience', 'worked'], work: ['experience', 'worked'],
  company: ['palo', 'servicenow', 'natwest', 'vidrona'], companies: ['palo', 'servicenow', 'natwest', 'vidrona'],
  employer: ['palo', 'servicenow', 'natwest', 'vidrona'], employers: ['palo', 'servicenow', 'natwest', 'vidrona'],
  rag: ['retrieval', 'knowledge'], llm: ['llms', 'models', 'agent'], ai: ['llms', 'rag', 'agents', 'tutor'],
  sjsu: ['san', 'jose', 'university', 'spartan'], spartan: ['san', 'jose', 'university'], graduate: ['university', 'graduated'], graduated: ['university'],
  ar: ['augmented', 'reality'], vr: ['augmented', 'reality'], security: ['cybersecurity', 'identity', 'secscan', 'privilege'],
  cybersecurity: ['identity', 'certificate', 'secscan', 'privilege'], cyberark: ['identity', 'palo'], secure: ['cybersecurity', 'identity', 'certificate', 'privilege'],
  certificate: ['identity', 'mcp'], identity: ['machine', 'certificate'], panw: ['palo', 'alto'], mcp: ['tool', 'agent'], langgraph: ['agent', 'state'],
  hackathon: ['calhacks', 'orbit', 'educo', 'won'], hackathons: ['calhacks', 'orbit', 'educo', 'won'],
  won: ['winner', 'first', 'award'], win: ['won', 'winner', 'first'], wins: ['won', 'winner', 'first'], awards: ['award', 'won'],
  study: ['university', 'masters', 'education'], studied: ['university', 'masters', 'education'],
  degree: ['masters', 'bachelors', 'university'], school: ['university', 'education'], college: ['university', 'education'],
  latency: ['median', 'faster', 'response'], speed: ['latency', 'faster'], fast: ['latency', 'faster'],
  languages: ['typescript', 'python', 'java'], stack: ['skills', 'react', 'spring', 'aws'], skills: ['stack', 'react', 'python', 'aws'],
  cloud: ['aws', 'terraform', 'kubernetes'], devops: ['terraform', 'docker', 'kubernetes'],
  contact: ['email', 'hi'], email: ['contact'], reach: ['contact', 'email'], hire: ['contact', 'email'],
  location: ['jose'], live: ['jose'], based: ['jose'],
  project: ['built', 'github'], projects: ['built', 'github'], built: ['project'], build: ['built'],
  distributed: ['kafka', 'peer', 'concurrency'], kafka: ['consumer', 'franz'], p2p: ['peer', 'p2pfile'], storage: ['p2pfile', 's3'],
  design: ['figma', 'case', 'flit'], recommendation: ['manager', 'nitesh'], manager: ['nitesh', 'recommendation'],
  evolve: ['genome', 'genetic'], site: ['genome', 'genetic'], certification: ['aws', 'architect'], certified: ['aws', 'architect'],
};

function fnv(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Plurals only. "hallucinations" should find "hallucination", while "redis" and "aws" stay whole. */
function stem(t) {
  return t.length > 3 && t.endsWith('s') && !/(ss|us|is)$/.test(t) ? t.slice(0, -1) : t;
}

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ''))
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map(stem);
}

// Light stemming, so "retrieve" and "retrieval" can meet through their prefix grams.
function features(tokens) {
  const out = [];
  for (const t of tokens) {
    out.push({ key: `w:${t}`, weight: 1 });
    if (t.length > 4) {
      for (let i = 0; i <= t.length - 4; i++) out.push({ key: `g:${t.slice(i, i + 4)}`, weight: 0.18 });
    }
  }
  return out;
}

function expand(tokens) {
  const out = [...tokens];
  for (const t of tokens) {
    for (const alias of ALIASES[t] || ALIASES[`${t}s`] || []) out.push(stem(alias));
  }
  return out;
}

function normalise(v) {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const n = Math.sqrt(sum) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= n;
  return v;
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Principal components by power iteration with deflection. */
function principalAxes(vectors, mean, count = 3) {
  const seedA = 12345;
  const axes = [];
  const DIM = vectors[0].length;
  const centred = vectors.map((v) => v.map((x, i) => x - mean[i]));
  for (let c = 0; c < count; c++) {
    let axis = new Float64Array(DIM).map((_, i) => Math.sin(i * (c + 1) * 12.9898 + seedA));
    normalise(axis);
    for (let iter = 0; iter < 40; iter++) {
      const next = new Float64Array(DIM);
      for (const v of centred) {
        const d = dot(v, axis);
        for (let i = 0; i < DIM; i++) next[i] += v[i] * d;
      }
      for (const prev of axes) {
        const d = dot(next, prev);
        for (let i = 0; i < DIM; i++) next[i] -= prev[i] * d;
      }
      axis = normalise(next);
    }
    axes.push(axis);
  }
  return axes;
}

export function buildIndex(corpus) {
  const docTokens = corpus.map((c) => tokenize(`${c.title} ${c.title} ${c.text}`));
  const df = new Map();
  for (const tokens of docTokens) {
    for (const key of new Set(features(tokens).map((f) => f.key))) df.set(key, (df.get(key) || 0) + 1);
  }
  const N = corpus.length;
  const idf = (key) => Math.log(1 + N / (1 + (df.get(key) || 0)));

  const embed = (tokens) => {
    const v = new Float64Array(DIM);
    for (const { key, weight } of features(tokens)) {
      const h = fnv(key);
      const sign = h & 1 ? 1 : -1;
      v[(h >>> 1) % DIM] += sign * weight * idf(key);
    }
    return normalise(v);
  };

  const vectors = docTokens.map(embed);
  const mean = new Float64Array(DIM);
  for (const v of vectors) for (let i = 0; i < DIM; i++) mean[i] += v[i] / N;
  const axes = principalAxes(vectors, mean);

  const project = (v) => {
    const c = v.map((x, i) => x - mean[i]);
    return axes.map((a) => dot(c, a));
  };
  const projected = vectors.map(project);
  const scale = Math.max(...projected.flat().map(Math.abs)) || 1;
  const toSpace = (v) => project(v).map((x) => Math.max(-1.25, Math.min(1.25, x / scale)));

  const vocabulary = new Set(docTokens.flat());

  return { corpus, vectors, embed, toSpace, vocabulary, positions: vectors.map(toSpace) };
}

function splitSentences(text) {
  // Sentences end at punctuation followed by a space, so 9.3s and gmail.com stay whole.
  return text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map((s) => s.trim()).filter(Boolean);
}

const REFUSAL = "That isn't in my sources, so I won't guess. Try asking about my work, projects, hackathons, skills or education.";

/** Extractive answer: the best sentences from the sources, quoted word for word. */
function quoteParts(corpus, sources, terms, directCount, best) {
  const scoreSentence = (sentence) => {
    const low = sentence.toLowerCase();
    return terms.reduce((s, t, i) => s + (low.includes(t) ? (i < directCount ? 2 : 1) : 0), 0);
  };
  const parts = [];
  for (const source of sources.filter((s) => s.score >= best * 0.85).slice(0, 2)) {
    const chosen = splitSentences(corpus[source.i].text)
      .map((text, order) => ({ text, order, score: scoreSentence(text) }))
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, source.n === 1 ? 2 : 1)
      .sort((a, b) => a.order - b.order)
      .map((s) => s.text);
    parts.push({ text: chosen.join(' '), n: source.n });
  }
  return parts;
}

/**
 * Runs the pipeline and reports each stage, so the page can show its working.
 * Guard: at least one real query term must exist in the sources, and similarity
 * must clear a threshold. Otherwise it refuses rather than guess.
 */
export function ask(index, question, { k = 3, threshold = 0.14 } = {}) {
  const t0 = performance.now();
  const queryTokens = tokenize(question);
  const expanded = expand(queryTokens);
  const queryVector = index.embed(expanded);
  const t1 = performance.now();

  const ranked = index.vectors
    .map((v, i) => ({ i, score: dot(v, queryVector) }))
    .sort((a, b) => b.score - a.score);

  // Rerank: direct mentions of what was typed count for more than loose similarity.
  const reranked = ranked.slice(0, 8).map((r) => {
    const body = new Set(tokenize(`${index.corpus[r.i].title} ${index.corpus[r.i].text}`));
    const hits = queryTokens.filter((t) => body.has(t)).length;
    const related = expanded.slice(queryTokens.length).filter((t) => body.has(t)).length;
    const bonus = queryTokens.length ? 0.3 * (hits + related * 0.5) / queryTokens.length : 0;
    return { ...r, hits, score: r.score + bonus };
  }).sort((a, b) => b.score - a.score);

  const top = reranked.slice(0, k);
  const t2 = performance.now();

  // Guard: at least half of what was asked must exist somewhere in the sources.
  const known = queryTokens.filter((t) => index.vocabulary.has(t) || ALIASES[t] || ALIASES[`${t}s`]);
  const coverage = queryTokens.length ? known.length / queryTokens.length : 0;
  const best = top[0]?.score ?? 0;
  const supported = coverage >= 0.5 && best >= threshold;

  const stages = {
    embedMs: t1 - t0,
    searchMs: t2 - t1,
    terms: queryTokens,
    expanded: expanded.filter((t) => !queryTokens.includes(t)).slice(0, 8),
  };
  const sources = top.map((r, n) => ({
    n: n + 1,
    i: r.i,
    score: r.score,
    title: index.corpus[r.i].title,
    href: index.corpus[r.i].href,
    position: index.positions[r.i],
  }));
  const queryPosition = index.toSpace(queryVector);

  if (!supported) {
    return {
      refused: true,
      answer: REFUSAL,
      ranked: sources,
      sources: [],
      queryPosition,
      stages,
      confidence: best,
    };
  }

  const parts = quoteParts(index.corpus, sources, expanded, queryTokens.length, best);

  return { refused: false, parts, sources, ranked: sources, queryPosition, stages, confidence: best };
}

export const TOPICS = [
  { id: 'security', name: 'Security' },
  { id: 'work', name: 'Work' },
  { id: 'wins', name: 'Wins' },
  { id: 'projects', name: 'Projects' },
  { id: 'skills', name: 'Skills' },
  { id: 'about', name: 'About' },
];

export function topicOf(chunk) {
  const h = chunk.href;
  if (h === '#work') return 'security';
  if (h === '#servicenow' || h === '#natwest' || h === '#vidrona') return 'work';
  if (h === '#achievements' || h === '#educo' || h === '#honors') return 'wins';
  if (h === '#projects' || h === '#case') return 'projects';
  if (h === '#resume') return 'skills';
  return 'about';
}

/** Search index over vectors that came from somewhere else, such as a neural model. */
export function buildVectorIndex(corpus, vectors) {
  const dim = vectors[0].length;
  const mean = new Float64Array(dim);
  for (const v of vectors) for (let i = 0; i < dim; i++) mean[i] += v[i] / vectors.length;
  const axes = principalAxes(vectors, mean);
  const project = (v) => {
    const c = v.map((x, i) => x - mean[i]);
    return axes.map((a) => dot(c, a));
  };
  const scale = Math.max(...vectors.map(project).flat().map(Math.abs)) || 1;
  const toSpace = (v) => project(v).map((x) => Math.max(-1.25, Math.min(1.25, x / scale)));
  const vocabulary = new Set(corpus.flatMap((c) => tokenize(`${c.title} ${c.text}`)));
  return { corpus, vectors, toSpace, vocabulary, positions: vectors.map(toSpace) };
}

/**
 * The same pipeline for a query vector. Neural scores alone can't separate "salary" (0.41)
 * from "cut hallucinations" (0.35), so the guard also asks whether the words exist in the
 * sources: a strong match stands alone, and a moderate one needs that support.
 */
export function askWithVector(index, queryVector, question, { k = 3 } = {}) {
  const ranked = index.vectors
    .map((v, i) => ({ i, score: dot(v, queryVector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  const best = ranked[0]?.score ?? 0;
  const sources = ranked.map((r, n) => ({
    n: n + 1, i: r.i, score: r.score, title: index.corpus[r.i].title, href: index.corpus[r.i].href, position: index.positions[r.i],
  }));
  const terms = tokenize(question);
  const stages = { embedMs: 0, searchMs: 0, terms, expanded: [] };
  const queryPosition = index.toSpace(queryVector);
  const known = terms.filter((t) => index.vocabulary.has(t) || ALIASES[t] || ALIASES[`${t}s`]);
  const coverage = terms.length ? known.length / terms.length : 0;
  const supported = best >= NEURAL_STRONG || (best >= NEURAL_MODERATE && coverage >= 0.5);
  if (!supported) {
    return { refused: true, answer: REFUSAL, ranked: sources, sources: [], queryPosition, stages, confidence: best };
  }
  const parts = quoteParts(index.corpus, sources, terms, terms.length, best);
  return { refused: false, parts, sources, ranked: sources, queryPosition, stages, confidence: best };
}
const NEURAL_STRONG = 0.47;
const NEURAL_MODERATE = 0.33;
