// The "Ask my résumé" interface. It shows each stage of the pipeline as it runs.
import { CORPUS } from './corpus.js';
import { ask, askWithVector, buildVectorIndex, buildIndex, topicOf, TOPICS } from './rag.js';

const NEURAL_LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2/dist/transformers.min.js';
const NEURAL_MODEL = 'Xenova/all-MiniLM-L6-v2';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function initAsk({ getStage, scrollTo }) {
  const form = document.getElementById('ask-form');
  const input = document.getElementById('ask-input');
  const result = document.getElementById('ask-result');
  const engineBtn = document.getElementById('ask-engine');
  const engineNote = document.getElementById('ask-engine-note');
  const labels = document.getElementById('space-labels');
  const topics = TOPICS.map((t) => t.id);
  const groups = CORPUS.map((c) => topics.indexOf(topicOf(c)));

  let keywordIndex = null;
  let neural = null;
  let run = 0;
  let refreshTimer = 0;
  let hits = [];

  const ensureIndex = () => {
    if (!keywordIndex) {
      keywordIndex = buildIndex(CORPUS);
      getStage()?.setChunks(keywordIndex.positions, groups);
    }
    return keywordIndex;
  };

  // Source titles float beside their points in the 3D space.
  const placeLabels = () => {
    const stage = getStage();
    if (!stage || !hits.length) return;
    hits.forEach((hit) => {
      const p = stage.chunkScreen(hit.i);
      hit.node.hidden = !p;
      if (p) hit.node.style.transform = `translate(${p.x + 14}px, ${p.y - 12}px)`;
    });
  };
  window.gsap?.ticker.add(placeLabels);

  const setHits = (sources) => {
    labels.replaceChildren();
    hits = (window.innerWidth < 800 ? [] : sources).map((s) => {
      const node = el('span', 'space-label', s.title);
      labels.append(node);
      return { i: s.i, node };
    });
  };

  const stepRow = (name, body) => {
    const row = el('li', 'step');
    row.append(el('b', '', name));
    if (typeof body === 'string') row.append(el('span', '', body));
    else row.append(body);
    return row;
  };

  const scoreBars = (sources) => {
    const wrap = el('span', 'bars');
    const top = Math.max(sources[0]?.score ?? 1, 0.01);
    for (const s of sources) {
      const row = el('a', 'bar-row');
      row.href = s.href;
      const fill = el('i');
      fill.style.setProperty('--w', Math.max(0.04, s.score / top).toFixed(3));
      fill.style.setProperty('--c', `var(--topic-${topics.indexOf(topicOf(CORPUS[s.i]))})`);
      row.append(el('span', '', s.title), fill, el('em', '', s.score.toFixed(2)));
      wrap.append(row);
    }
    return wrap;
  };

  const render = async (question) => {
    const id = ++run;
    const isNeural = Boolean(neural);
    let r;
    if (isNeural) {
      const t0 = performance.now();
      const vector = await neural.embed(question);
      r = askWithVector(neural.index, vector, question);
      r.stages.embedMs = performance.now() - t0;
    } else {
      r = ask(ensureIndex(), question);
    }
    if (id !== run) return;

    getStage()?.showQuery(r.queryPosition, r.sources.map((s) => s.i));
    setHits(r.sources);

    const steps = el('ol', 'steps');
    const answer = el('p', 'answer');
    const trace = el('p', 'trace');
    result.replaceChildren(steps, answer, trace);

    const termsText = isNeural
      ? `384-dimension vector from the on-device model, ${r.stages.embedMs.toFixed(0)} ms`
      : (r.stages.terms.length ? r.stages.terms.join(', ') : 'nothing to search for')
        + (r.stages.expanded.length ? `, plus ${r.stages.expanded.slice(0, 4).join(', ')}` : '');
    steps.append(stepRow('Embed', termsText));
    await wait(170);
    if (id !== run) return;

    steps.append(stepRow('Retrieve', r.ranked?.length ? scoreBars(r.ranked) : 'no candidates'));
    await wait(190);
    if (id !== run) return;

    const verdict = stepRow('Guard', r.refused
      ? `refused at ${r.confidence.toFixed(2)}, the sources don't support an answer`
      : `passed at ${r.confidence.toFixed(2)}, quoting sources only`);
    verdict.classList.add(r.refused ? 'is-refused' : 'is-passed');
    steps.append(verdict);
    await wait(150);
    if (id !== run) return;

    // Quoted answers arrive word by word, fast enough to read as they land.
    if (r.refused) {
      answer.classList.add('is-refused');
      answer.textContent = r.answer;
    } else {
      for (const [i, part] of r.parts.entries()) {
        if (i) answer.append(' ');
        const words = part.text.split(' ');
        const span = el('span');
        answer.append(span);
        for (let w = 0; w < words.length; w += 2) {
          span.append(`${w ? ' ' : ''}${words.slice(w, w + 2).join(' ')}`);
          await wait(14);
          if (id !== run) return;
        }
        answer.append(el('sup', '', String(part.n)));
      }
    }
    const engine = isNeural ? 'a neural model' : 'keyword vectors';
    trace.textContent = `Searched ${CORPUS.length} chunks with ${engine}, entirely on your device.`;

    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => window.ScrollTrigger?.refresh(), 200);
    if (window.innerWidth < 800) scrollTo?.(answer);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    render(input.value);
  });
  document.getElementById('ask-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    input.value = chip.textContent;
    render(chip.textContent);
  });

  // Optional: a real embedding model, downloaded only if the visitor asks for it.
  engineBtn.hidden = false;
  engineNote.hidden = false;
  engineBtn.addEventListener('click', async () => {
    if (neural) return;
    engineBtn.disabled = true;
    engineBtn.textContent = 'Loading the model…';
    try {
      const { pipeline, env } = await import(/* webpackIgnore: true */ NEURAL_LIB);
      env.allowLocalModels = false;
      let lastPct = -1;
      const extractor = await pipeline('feature-extraction', NEURAL_MODEL, {
        dtype: 'q8',
        progress_callback: (p) => {
          if (p.status !== 'progress' || !p.file?.includes('onnx')) return;
          const pct = Math.round(p.progress);
          if (pct !== lastPct) {
            lastPct = pct;
            engineBtn.textContent = `Downloading the model, ${pct}%`;
          }
        },
      });
      engineBtn.textContent = 'Embedding my résumé…';
      const embed = async (text) => {
        const out = await extractor(text, { pooling: 'mean', normalize: true });
        return Float64Array.from(out.data);
      };
      const vectors = [];
      for (const c of CORPUS) vectors.push(await embed(`${c.title}. ${c.text}`));
      const index = buildVectorIndex(CORPUS, vectors);
      neural = { embed, index };
      getStage()?.setChunks(index.positions, groups);
      engineBtn.textContent = 'Neural search is on';
      engineBtn.classList.add('is-on');
      engineNote.textContent = 'all-MiniLM-L6-v2 now runs on your device. It matches meaning, not just words, and the map has rearranged itself by meaning too.';
      if (input.value.trim()) render(input.value);
    } catch (error) {
      console.warn(error);
      engineBtn.disabled = false;
      engineBtn.textContent = 'Try the neural model again';
      engineNote.textContent = "The model couldn't load, so search is still using keyword vectors.";
    }
  });

  return { ensureIndex, askNeuralForTest: (q) => (neural ? neural.embed(q).then((v) => askWithVector(neural.index, v, q)) : null) };
}
