import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CORPUS } from '../assets/js/corpus.js';
import { ask, buildIndex } from '../assets/js/rag.js';

const index = buildIndex(CORPUS);
const titles = (r) => r.sources.map((s) => s.title);
const text = (r) => r.parts.map((p) => p.text).join(' ');

const answerable = [
  ['What did he do at ServiceNow?', /ServiceNow/],
  ['What does he do at Palo Alto Networks?', /Machine Identity/],
  ['Tell me about his cybersecurity work', /identity|cybersecurity|least-privilege/i],
  ['Does he have AR experience?', /augmented reality/i],
  ['How did he improve retrieval relevance?', /41%/],
  ['Did he graduate from SJSU?', /San Jose State/],
  ['What is Meeting Intelligence?', /meeting ingestion/],
  ['What is the deflection rate?', /31%/],
  ['Did he win any hackathons?', /CalHacks|Self-Evolving/],
  ['Tell me about the Kafka project', /Kafka/],
  ['What is P2PFile?', /peer-to-peer/],
  ['Where did he study?', /University|Institute/],
  ['What AWS certification does he have?', /AWS/],
  ['How can I contact him?', /mohankancherla2023@gmail\.com/],
  ['Where is he based?', /San Jose/],
  ['What did he do at NatWest?', /NatWest/],
  ['What is the AI stack?', /LangChain|LLMs|RAG/],
  // The exact questions offered on the page.
  ['How does he secure machines?', /identity|certificate|least-privilege/i],
  ['Did he win any hackathons?', /CalHacks|Self-Evolving/],
  ['What is P2PFile?', /peer-to-peer/],
];

for (const [question, expected] of answerable) {
  test(`answers: ${question}`, () => {
    const r = ask(index, question);
    assert.equal(r.refused, false, `refused with confidence ${r.confidence}`);
    assert.match(text(r), expected, `got: ${text(r)}; from ${titles(r)}`);
  });
}

const unanswerable = [
  "What is his favorite color?",
  "What's his favorite color?",
  'Who won the world cup?',
  'What is the capital of France?',
  'How much salary does he earn?',
  'Does he like pineapple pizza?',
  'asdf qwer zxcv',
  'the and of',
  '',
];

for (const question of unanswerable) {
  test(`refuses instead of guessing: "${question}"`, () => {
    const r = ask(index, question);
    assert.equal(r.refused, true, `answered with ${r.confidence}: ${r.refused ? '' : text(r)}`);
    assert.deepEqual(r.sources, []);
  });
}

test('every answer is quoted from its sources, word for word', () => {
  for (const [question] of answerable) {
    const r = ask(index, question);
    for (const part of r.parts) {
      const source = r.sources.find((s) => s.n === part.n);
      const original = CORPUS[source.i].text;
      for (const sentence of part.text.split(/(?<=[.!?])\s+(?=[A-Z0-9])/)) {
        assert.ok(original.includes(sentence), `"${sentence}" is not in "${source.title}"`);
      }
    }
  }
});

test('positions in the vector space are finite and bounded', () => {
  for (const p of index.positions) {
    assert.equal(p.length, 3);
    for (const x of p) assert.ok(Number.isFinite(x) && Math.abs(x) <= 1.25);
  }
});
