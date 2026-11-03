# Mohan Kancherla's portfolio

Live at <https://ganeshmohank.github.io/portifolio/>. Plain static files on GitHub Pages, with no build step, and no third-party requests unless a visitor opts in to the neural model.

## How it evolves

The look of the site comes from a genome in `data/genome.json`: accent colour, particle motion, type width and weight.

Once a day, `.github/workflows/static.yml` runs `scripts/evolve.mjs`, which:

1. Reads public repos from the GitHub API.
2. If something was pushed or starred, or the current generation is a week old, runs a small genetic algorithm (`assets/js/genetics.js`) to breed the next one. Otherwise it does nothing.
3. Commits the new genome and redeploys.

Candidates are scored on legibility (WCAG contrast), novelty against recent ancestors, continuity with their parent, avoiding overused violet and teal, and how well their energy and colour range match recent activity and language mix.


## The 3D model and "Ask my résumé"

`assets/js/stage.js` (Three.js) has two worlds. `assets/js/identity3d.js` is the Root CA crystal, and `assets/js/cyber.js` is the Cybersecurity scene it leads: one continuous world in DOM and SVG, on a scrubbed GSAP timeline, where the camera follows a request from the Root CA through a signed certificate, encrypted traffic and an access matrix into a converging audit log. The signature and ciphertext are real, generated with WebCrypto, and the machine, endpoint and environment names are illustrative.

`assets/js/rag.js` is a real retrieval pipeline over `assets/js/corpus.js`, running entirely in the browser: hashed TF-IDF vectors, cosine search, a rerank, and a guard that refuses unsupported questions. Answers are quoted word for word from the corpus, and there is no LLM. To teach it something, add to the corpus.

Visitors can opt in to a neural model (`all-MiniLM-L6-v2`, about 23 MB, via Transformers.js from jsDelivr and Hugging Face). It runs on their device, and nothing loads from those hosts unless they choose it.

## The particle field

`assets/js/field.js` is raw WebGL2. Particles live in transform-feedback buffers and are pulled towards formations based on real work: a bank vault door for NatWest, message queues, P2PFile's peers, Orbit's rings, an AR floor scan with a cursor-anchored object, and one cluster per public repo.

Without WebGL2 the page falls back to a flat ground, and `prefers-reduced-motion` gets a still frame and no scroll effects.

## Working on it

```sh
python -m http.server          # the page needs http://, not file://
node --test scripts/*.test.mjs
node scripts/evolve.mjs        # breeds locally, if there is a reason to
```

To change the content, edit `index.html`. To trigger a generation by hand, run the workflow from the Actions tab.

Vendored in `assets/vendor` and `assets/fonts`: Three.js, GSAP, Lenis, Anybody and Hanken Grotesk.
