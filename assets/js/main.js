import { GENESIS, layerColors, phenotype } from './genetics.js';
import { createField } from './field.js';
import { initAsk } from './ask-ui.js';
import { initCyber } from './cyber.js';
import { initVault } from './vault.js';
import { initVidrona } from './vidrona.js';
import { TOPICS } from './rag.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;

const DAY = 86400000;
const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
const small = () => window.innerWidth < 800;
const rgbCss = (c) => `rgb(${c[0]} ${c[1]} ${c[2]})`;
let lenisRef = null;

// Phone browsers change innerHeight as the address bar moves. Pinned scenes must not
// grow when that happens, or everything below them jumps, so they use this instead.
let stableHeight = window.innerHeight;
let stableWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth !== stableWidth) {
    stableWidth = window.innerWidth;
    stableHeight = window.innerHeight;
  }
});

async function loadGenome() {
  try {
    const res = await fetch('./data/genome.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch {
    return null;
  }
}

// --- graphics ---------------------------------------------------------------

function makeField() {
  const canvas = document.getElementById('field');
  const param = Number(new URLSearchParams(location.search).get('particles'));
  const lowEnd = small() || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const count = param > 0 ? param : lowEnd ? 26000 : 70000;
  try {
    return createField(canvas, { count, staticRender: reduced });
  } catch (error) {
    // Without WebGL2 the page is still complete, on a flat ground.
    console.warn(error);
    canvas.hidden = true;
    return null;
  }
}

async function makeStage() {
  if (reduced) return null;
  try {
    await Promise.all([
      document.fonts?.load('800 58px "Anybody"', 'Root CA'),
      document.fonts?.load('700 34px "Hanken Grotesk"'),
    ]).catch(() => {});
    const { createStage } = await import('./stage.js');
    return createStage(document.getElementById('stage'), { small: small() });
  } catch (error) {
    console.warn(error);
    return null;
  }
}

/** Lays repos out on a sunflower spiral. Recent pushes make bigger clusters. */
function repoClusters(repos) {
  const aspect = window.innerWidth / window.innerHeight;
  const now = Date.now();
  const shown = repos.slice(0, 32);
  return shown.map((repo, i) => {
    const angle = i * 2.399963;
    const radius = Math.sqrt((i + 0.6) / shown.length) * 0.9;
    const ageDays = (now - Date.parse(repo.pushedAt)) / DAY;
    const fresh = Math.max(0, 1 - ageDays / 900);
    return {
      name: repo.name,
      x: Math.cos(angle) * radius * Math.max(aspect * 0.95, 0.85),
      y: Math.sin(angle) * radius * 0.92,
      r: 0.022 + fresh * 0.075 + Math.min(repo.stars || 0, 5) * 0.006,
    };
  });
}

// --- typography -------------------------------------------------------------

/** Finds the point on the font's width axis where a line exactly fills its measure. */
function fittedStretch(line, width) {
  const probe = document.createElement('span');
  // No transition: even a 1ms one means the width read below is the old width.
  probe.style.cssText = 'display:inline-block;white-space:nowrap;visibility:hidden;position:absolute;transition:none';
  probe.textContent = line.textContent;
  line.append(probe);
  let lo = 50;
  let hi = 150;
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2;
    probe.style.fontStretch = `${mid}%`;
    if (probe.getBoundingClientRect().width > width) hi = mid;
    else lo = mid;
  }
  probe.remove();
  return lo;
}

/** Big display lines fill the page by changing width, not size. */
function heroSlot() {
  const name = document.querySelector('.name');
  return window.innerWidth >= 900 && window.innerHeight < window.innerWidth ? Math.min(name.clientWidth * 0.24, 400) : 0;
}

/**
 * Where the crystal sits on wide screens, in viewport pixels. It rides in the slot beside the
 * first name until the whole name has scrolled away, so it never crosses it, then glides down
 * into the open space beside the About copy.
 */
function heroAnchor() {
  const reserve = heroSlot();
  if (!reserve) return null;
  const nameEl = document.querySelector('.name');
  const name = nameEl.getBoundingClientRect();
  const first = nameEl.querySelector('[data-line]').getBoundingClientRect();
  // Small enough that its rings stay inside the first line and clear of the second.
  const r = Math.min(reserve * 0.22, first.height * 0.3);
  const start = { x: name.right - reserve / 2, y: first.top + first.height / 2, r };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const end = { x: vw * 0.7, y: vh * 0.42, r: Math.min(vh * 0.2, r * 1.25) };
  // 0 while any of the name is on screen, 1 once the visitor has scrolled most of a screen past it.
  const gone = Math.max(0, -name.bottom);
  const t0 = Math.min(1, gone / (vh * 0.7));
  const t = t0 * t0 * (3 - 2 * t0);
  // Kept just above the top edge while it waits, so it enters from there.
  const startY = Math.max(start.y, -r * 2.2);
  return { x: start.x + (end.x - start.x) * t, y: startY + (end.y - startY) * t, r: start.r + (end.r - start.r) * t };
}

function fitDisplayType() {
  const name = document.querySelector('.name');
  // On wide screens the first name leaves a slot on its right for the Root CA crystal.
  const reserve = heroSlot();
  name.querySelectorAll('[data-line]').forEach((line, i) => {
    line.style.fontStretch = `${fittedStretch(line, name.clientWidth - (i === 0 ? reserve : 0)).toFixed(1)}%`;
  });
  const title = document.querySelector('.contact-title');
  title.style.fontStretch = `${fittedStretch(title, title.clientWidth).toFixed(1)}%`;
}

// --- page data --------------------------------------------------------------

function fillRepoData(doc) {
  const byName = new Map(doc.repos.map((r) => [r.name, r]));
  const featured = new Set();
  document.querySelectorAll('[data-repo]').forEach((row) => {
    featured.add(row.dataset.repo);
    const repo = byName.get(row.dataset.repo);
    const meta = row.querySelector('[data-meta]');
    if (repo && meta) meta.textContent = [repo.language, formatDate(repo.pushedAt)].filter(Boolean).join(', ');
  });

}

// --- motion -----------------------------------------------------------------

/** ServiceNow: the stack comes apart, one panel per layer, tied to scroll. */
function serviceScene(section, stage) {
  section.classList.add('is-scene');
  const head = section.querySelector('.pipeline-head');
  const panels = [...section.querySelectorAll('.panel')];
  const line = section.querySelector('.leader line');
  const introUntil = 0.08;
  const scene = { panels, line, active: -2, pin: null };
  panels.forEach((panel, i) => panel.style.setProperty('--c', `var(--layer-${i})`));

  const indexAt = (p) => (p < introUntil ? -1 : Math.min(panels.length - 1, Math.floor(((p - introUntil) / (1 - introUntil)) * panels.length)));
  const show = (i) => {
    if (i === scene.active) return;
    scene.active = i;
    head.classList.toggle('is-off', i >= 0);
    panels.forEach((p, n) => p.classList.toggle('is-on', n === i));
    stage.setPose({ active: i });
    line.style.opacity = i >= 0 ? 1 : 0;
    if (i >= 0) line.style.stroke = `var(--layer-${i})`;
  };
  show(-1);

  scene.pin = ScrollTrigger.create({
    trigger: section,
    pin: true,
    start: 'top top',
    end: () => `+=${stableHeight * 4.2}`,
    invalidateOnRefresh: true,
    onUpdate(self) {
      stage.setPose({ explode: self.progress });
      show(indexAt(self.progress));
    },
    onToggle(self) {
      if (self.isActive) show(indexAt(self.progress));
      else {
        // Leaving the scene: the stack folds back up, so the line has nothing to point at.
        stage.setPose({ active: -1 });
        line.style.opacity = 0;
        scene.active = -2;
      }
    },
  });
  return scene;
}

function initScenes(stage, field) {
  const stageCanvas = document.getElementById('stage');
  const fieldCanvas = document.getElementById('field');

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    endTrigger: '.about',
    end: 'bottom 70%',
    onUpdate(self) { stage.setPose({ hero: self.progress }); },
  });

  // The crystal rides beside the first name, so it scrolls with it rather than over it.
  gsap.ticker.add(() => stage.setHeroAnchor?.(heroAnchor()));

  const cyberPin = initCyber({ stage, viewHeight: () => stableHeight });
  const service = serviceScene(document.getElementById('servicenow'), stage);

  // Keeps the leader line tied to the moving layer.
  gsap.ticker.add(() => {
    const i = service.active;
    if (i < 0) return;
    if (stageCanvas.style.visibility !== 'visible') { service.line.style.opacity = 0; return; }
    const anchor = stage.layerAnchor(i);
    const copy = service.panels[i]?.querySelector('p');
    if (!anchor || !copy) return;
    const r = copy.getBoundingClientRect();
    service.line.setAttribute('x1', r.right + 16);
    service.line.setAttribute('y1', r.top + 14);
    service.line.setAttribute('x2', anchor.x);
    service.line.setAttribute('y2', anchor.y);
  });

  // Every handoff between the two canvases is a crossfade tied to scroll, never a timed cut,
  // so it moves exactly as fast as the visitor does, in either direction.
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const between = (y, from, to) => clamp((y - from) / (to - from));
  const ask = document.querySelector('[data-ask]');
  const fieldOn = { value: false };
  let ranges = null;

  const measure = () => {
    const h = stableHeight;
    const askTop = ask.getBoundingClientRect().top + window.scrollY;
    const wins = document.querySelector('.wins');
    const winsTop = wins.getBoundingClientRect().top + window.scrollY;
    const sjsuTop = document.querySelector('.sjsu').getBoundingClientRect().top + window.scrollY;
    const svcPin = service.pin;
    ranges = {
      ticketsFrom: sjsuTop,
      ticketsTo: winsTop + wins.offsetHeight - h * 1.02,
      rootPinFrom: cyberPin.start - h * 0.5,
      rootPinTo: cyberPin.start - h * 0.02,
      worldOutFrom: cyberPin.end - h * 0.1,
      worldOutTo: cyberPin.end + h * 0.02,
      stackInFrom: svcPin.start - h * 0.55,
      stackInTo: svcPin.start - h * 0.02,
      modelOutFrom: svcPin.end,
      modelOutTo: svcPin.end + h * 0.7,
      spaceInFrom: askTop - h * 0.8,
      spaceInTo: askTop - h * 0.25,
      spaceOutFrom: askTop + ask.offsetHeight - h * 0.85,
      spaceOutTo: askTop + ask.offsetHeight - h * 0.2,
    };
  };

  const updateLayers = () => {
    if (!ranges) measure();
    const y = window.scrollY;
    const r = ranges;
    const inSpace = y > (r.modelOutTo + r.spaceInFrom) / 2;
    stage.setMode(inSpace ? 'space' : 'model');
    stage.setPose({
      // 1 is the crystal, 0 is the stack, and in between neither shows.
      blend: y < r.worldOutTo ? 1 - between(y, r.worldOutFrom, r.worldOutTo) : 0,
      stackIn: between(y, r.stackInFrom, r.stackInTo),
      rootPin: between(y, r.rootPinFrom, r.rootPinTo),
    });

    const stageOpacity = inSpace
      ? between(y, r.spaceInFrom, r.spaceInTo) * (1 - between(y, r.spaceOutFrom, r.spaceOutTo))
      : 1 - between(y, r.modelOutFrom, r.modelOutTo);
    stageCanvas.style.opacity = String(stageOpacity);
    const stageVisible = stageOpacity > 0.002;
    stageCanvas.style.visibility = stageVisible ? 'visible' : 'hidden';
    if (stageVisible && !document.hidden) stage.start();
    else stage.stop();

    // Only one heavy layer at a time: the particles run solely where the 3D stage isn't.
    const behindTickets = y > r.ticketsFrom && y < r.ticketsTo;
    const fieldOpacity = (inSpace || y > r.modelOutFrom) && !behindTickets ? 1 - stageOpacity : 0;
    fieldCanvas.style.opacity = String(fieldOpacity);
    const shouldRun = fieldOpacity > 0.002;
    if (field && shouldRun !== fieldOn.value && !document.hidden) {
      fieldOn.value = shouldRun;
      if (shouldRun) field.start();
      else field.stop();
    }
  };

  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: updateLayers });
  ScrollTrigger.addEventListener('refresh', () => { measure(); updateLayers(); });
  gsap.ticker.add(() => { if (!ranges) updateLayers(); });

  window.addEventListener('pointermove', (e) => {
    stage.pointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    stage.pointer(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 40) / 30)));
  }, { passive: true });

  stage.setPose({ side: 1 });
  window.addEventListener('resize', () => stage.resize());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stage.stop();
    else if (stageCanvas.style.visibility === 'visible') stage.start();
  });
}

function initMotion(field, stage, onSectionChange) {
  gsap.registerPlugin(ScrollTrigger, SplitText);

  let lenis = null;
  if (!reduced) {
    lenis = new Lenis({ lerp: 0.17, wheelMultiplier: 1.15 });
    lenisRef = lenis;
    lenis.on('scroll', (e) => {
      ScrollTrigger.update();
      if (field) field.kick(Math.min(0.9, Math.abs(e.velocity) * 0.025));
    });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const href = link.getAttribute('href');
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    history.pushState(null, '', href);
    // Land on the heading rather than on the empty space above it.
    const scene = target.matches('main, .is-scene, .zoom');
    const heading = scene ? target : (target.querySelector('h2, h3') || target);
    const offset = scene ? 0 : -96;
    // A pinned scene's own position moves while it's pinned, so measuring it can land at the
    // scene's end. Go to where its pin starts instead, which is the start of the scene.
    const pin = ScrollTrigger.getAll().find((t) => t.pin === target);
    const dest = pin ? pin.start : heading;
    if (lenis) lenis.scrollTo(dest, { offset: pin ? 0 : offset, duration: 0.85, easing: (t) => 1 - (1 - t) ** 4 });
    else if (pin) window.scrollTo(0, pin.start);
    else heading.scrollIntoView();
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // The bar steps aside on the way down, comes back on the way up.
  const bar = document.querySelector('.bar');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      bar.classList.toggle('is-solid', y > 40);
      if (!reduced) bar.classList.toggle('is-hidden', y > lastY && y > 300);
      lastY = y;
      if (field) field.setScroll(self.progress * 6);
    },
  });

  // Which system the field is becoming.
  document.querySelectorAll('[data-form]').forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 58%',
      end: 'bottom 42%',
      onToggle: (self) => { if (self.isActive) onSectionChange(el); },
    });
  });

  // Pinned scenes are created first and in page order, because each one's
  // scroll length moves everything below it.
  if (stage) initScenes(stage, field);
  initVault({ reduced });
  initVidrona({ reduced });
  if (!reduced) {
    // Tickets are native sticky, so the browser's compositor moves them, in both directions.
    // Script only eases the covered one back a touch, which is a transform and stays cheap.
    const tickets = gsap.utils.toArray('.ticket');
    if (window.innerWidth >= 900) {
      tickets.slice(0, -1).forEach((ticket, i) => {
        gsap.fromTo(ticket, { scale: 1 }, {
          scale: 0.95,
          ease: 'none',
          transformOrigin: '50% 0%',
          scrollTrigger: { trigger: tickets[i + 1], start: 'top bottom', end: 'top top', scrub: true },
        });
      });
    }

    // Graduation: the Spartan comes in fast from up close, then settles.
    const sjsu = document.querySelector('.sjsu');
    if (sjsu) {
      gsap.fromTo('.sjsu-helmet', { scale: 3.4, yPercent: 16, rotate: -8 }, {
        scale: 1, yPercent: 0, rotate: 0, ease: 'power2.out',
        scrollTrigger: { trigger: sjsu, start: 'top bottom', end: 'top top', scrub: true },
      });
      gsap.fromTo('.sjsu-copy > *', { opacity: 0, y: 26 }, {
        opacity: 1, y: 0, stagger: 0.12, ease: 'power2.out',
        scrollTrigger: { trigger: sjsu, start: 'top 30%', end: 'top top', scrub: true },
      });
    }

    // The statement prints row by row.
    gsap.from('.ledger tbody tr', {
      opacity: 0,
      y: 10,
      duration: 0.4,
      stagger: 0.07,
      ease: 'power2.out',
      scrollTrigger: { trigger: '.ledger', start: 'top 82%', once: true },
    });
  }

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to('.curtain', {
      yPercent: -100,
      duration: 0.6,
      ease: 'expo.inOut',
      onComplete: () => document.querySelector('.curtain')?.remove(),
    });

    // Name: letters rise out of their lines once, on arrival.
    const lines = [...document.querySelectorAll('[data-line]')];
    const splits = lines.map((line) => SplitText.create(line, { type: 'chars', charsClass: 'char', aria: 'none' }));
    const chars = splits.flatMap((s) => s.chars);
    gsap.from(chars, { yPercent: 108, duration: 0.85, ease: 'expo.out', stagger: 0.016, delay: 0.25 });
    gsap.from('.hero-foot > *', { y: 18, opacity: 0, duration: 0.6, ease: 'expo.out', stagger: 0.06, delay: 0.55 });

    // Apple's exit: the name parts around the object as you leave the first screen.
    const heroExit = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to(lines[0], { xPercent: -14, yPercent: -22, ease: 'none', scrollTrigger: heroExit });
    gsap.to(lines[1], { xPercent: 14, yPercent: 22, ease: 'none', scrollTrigger: heroExit });
    gsap.to('.hero-foot', { yPercent: 60, opacity: 0, ease: 'none', scrollTrigger: { ...heroExit, end: '60% top' } });

    // Statement: words light up as they are read.
    const statement = SplitText.create('[data-statement]', { type: 'words', aria: 'auto' });
    gsap.fromTo(statement.words, { opacity: 0.16 }, {
      opacity: 1,
      ease: 'none',
      stagger: 0.1,
      scrollTrigger: { trigger: '[data-statement]', start: 'top 82%', end: 'bottom 48%', scrub: true },
    });

    // Parts of each section arrive in sequence.
    gsap.set('[data-rise]', { y: 18, opacity: 0 });
    ScrollTrigger.batch('[data-rise]', {
      start: 'top 94%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 0.55, ease: 'expo.out', stagger: 0.045, overwrite: true }),
    });

    // Figures count up to their real values, and always end on the exact text.
    document.querySelectorAll('[data-count]').forEach((el) => {
      const original = el.textContent;
      const match = original.match(/^(\d+)(.*)$/);
      if (!match) return;
      const value = { n: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => gsap.to(value, {
          n: Number(match[1]),
          duration: 0.9,
          ease: 'expo.out',
          onUpdate: () => { el.textContent = `${Math.round(value.n)}${match[2]}`; },
          onComplete: () => { el.textContent = original; },
        }),
      });
    });

    // Frames open up as they enter, while their pictures drift at a different speed.
    document.querySelectorAll('[data-reveal]').forEach((frame) => {
      gsap.fromTo(frame, { clipPath: 'inset(14% 10% 14% 10%)' }, {
        clipPath: 'inset(0% 0% 0% 0%)',
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top 95%', end: 'top 45%', scrub: true },
      });
    });
    document.querySelectorAll('[data-parallax]').forEach((img) => {
      gsap.fromTo(img, { yPercent: -7, scale: 1.16 }, {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // The last screen opens as a circle of pure accent colour, stretching its words to fit.
    gsap.fromTo('.contact', { clipPath: 'circle(8% at 50% 100%)' }, {
      clipPath: 'circle(150% at 50% 100%)',
      ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom bottom', scrub: true },
    });
    gsap.from('.contact-title', {
      fontStretch: '60%',
      ease: 'none',
      scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom bottom', scrub: true },
    });

    return () => splits.forEach((s) => s.revert());
  });

  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  if (finePointer && !reduced) {
    // Controls lean towards the cursor.
    document.querySelectorAll('.button, .bar-cta').forEach((el) => {
      const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'expo.out' });
      const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'expo.out' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.28);
        y((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('pointerleave', () => { x(0); y(0); });
    });
    // Pictures tilt under it, as if on a table.
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'expo.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'expo.out' });
      gsap.set(el, { transformPerspective: 1100 });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        rx(((e.clientY - r.top) / r.height - 0.5) * -6);
        ry(((e.clientX - r.left) / r.width - 0.5) * 7);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
}

// --- design: sketch to screen ------------------------------------------------

function initSketch() {
  const phone = document.getElementById('sketch-phone');
  if (!phone) return;
  const wire = phone.querySelector('[data-wire]');
  const final = phone.querySelector('[data-final]');
  const range = document.getElementById('sketch-range');
  const set = (v) => phone.style.setProperty('--split', `${v}%`);
  range.addEventListener('input', () => set(range.value));
  set(range.value);

  const chips = [...document.querySelectorAll('#sketch-screens button')];
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      wire.src = chip.dataset.wire;
      final.src = chip.dataset.final;
      final.alt = `Final Flit Taxi screen: ${chip.textContent}`;
      wire.alt = `Wireframe of the Flit Taxi screen: ${chip.textContent}`;
    });
  });
  // Pull in the neighbours, so swapping screens never waits on the network.
  chips.forEach((chip) => {
    new Image().src = chip.dataset.wire;
    new Image().src = chip.dataset.final;
  });

  // Once, on arrival, the divider shows it can move.
  if (!reduced && window.gsap && window.ScrollTrigger) {
    const demo = { v: 82 };
    window.ScrollTrigger.create({
      trigger: phone,
      start: 'top 70%',
      once: true,
      onEnter: () => gsap.to(demo, {
        v: 50,
        duration: 0.9,
        ease: 'expo.out',
        onUpdate: () => { range.value = demo.v; set(demo.v); },
      }),
    });
  }
}

// --- colour -----------------------------------------------------------------

function renderLegend() {
  const legend = document.getElementById('ask-legend');
  legend.replaceChildren(...TOPICS.map((topic, i) => {
    const li = document.createElement('li');
    li.style.setProperty('--c', `var(--topic-${i})`);
    li.textContent = topic.name;
    return li;
  }));
}

// --- wiring -----------------------------------------------------------------

async function main() {
  const doc = await loadGenome();
  const field = makeField();
  const stage = await makeStage();
  const wide = () => window.innerWidth >= 900;

  const apply = (genes) => {
    const p = phenotype(genes);
    root.style.setProperty('--accent', p.accentHex);
    root.style.setProperty('--accent-2', p.accent2Hex);
    root.style.setProperty('--display-weight', String(p.fontWeight));
    const layers = layerColors(genes, 7);
    layers.forEach((c, i) => root.style.setProperty(`--layer-${i}`, rgbCss(c)));
    const topics = layerColors(genes, TOPICS.length);
    topics.forEach((c, i) => root.style.setProperty(`--topic-${i}`, rgbCss(c)));
    if (field) field.setGenes(p);
    if (stage) stage.setGenes({ ...p, layers, topics });
  };

  apply(doc?.genes ?? GENESIS);

  let clusters = [];
  if (doc) {
    fillRepoData(doc);
    clusters = repoClusters(doc.repos);
    if (field) field.setClusters(clusters);
  }
  renderLegend();

  const askUi = initAsk({
    getStage: () => stage,
    scrollTo: (el) => {
      if (lenisRef) lenisRef.scrollTo(el, { offset: -120, duration: 0.6 });
      else el.scrollIntoView({ block: 'center' });
    },
  });
  if (new URLSearchParams(location.search).has('debug')) window.__ask = askUi;
  // Build the index when the browser is idle, so the space exists before anyone asks.
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 800)))(() => askUi.ensureIndex());

  let sectionEl = null;
  const useSection = (el) => {
    sectionEl = el;
    if (!field) return;
    field.setForm(el.dataset.form);
    // Formations sit opposite the text on wide screens, centred behind it on phones.
    field.setOffset(wide() ? Number(el.dataset.side || 0) * 0.9 : 0, 0);
    field.setDim(wide() ? Number(el.dataset.dim ?? 1) : Math.min(Number(el.dataset.dim ?? 1), 0.42));
  };

  initSketch();

  useSection(document.querySelector('.hero'));
  if (field) field.setDim(stage ? 0.55 : 1);

  // fonts.ready can resolve before a font has even begun loading, so ask for it by name.
  // Measuring the fallback font instead would stretch the name to the wrong width.
  await Promise.all([
    document.fonts?.load('800 100px "Anybody"', 'MOHAN'),
    document.fonts?.load('400 16px "Hanken Grotesk"'),
  ]).catch(() => {});
  fitDisplayType();

  // A loaded font may not reach layout until a frame later, so measure again when it has.
  const refit = () => requestAnimationFrame(() => requestAnimationFrame(fitDisplayType));
  refit();
  document.fonts?.addEventListener('loadingdone', refit);
  window.addEventListener('load', refit);

  if (window.gsap && window.ScrollTrigger && window.SplitText) {
    initMotion(field, stage, useSection);
  } else {
    document.querySelector('.curtain')?.remove();
  }

  // Hovering a project shows it: its own formation, or its cluster among the repos.
  if (field) {
    document.getElementById('projects').addEventListener('pointerover', (e) => {
      const row = e.target.closest('[data-repo]');
      if (!row) return;
      if (row.dataset.hoverForm) {
        field.setForm(row.dataset.hoverForm);
        field.setDim(0.7);
        field.setHot(-1);
      } else {
        field.setForm('constellation');
        field.setDim(0.75);
        field.setHot(clusters.findIndex((c) => c.name === row.dataset.repo));
      }
    });
    document.getElementById('projects').addEventListener('pointerout', (e) => {
      const row = e.target.closest('[data-repo]');
      if (!row || row.contains(e.relatedTarget)) return;
      field.setHot(-1);
      if (sectionEl) useSection(sectionEl);
    });

    // Only used by the AR scene, to anchor its object.
    window.addEventListener('pointermove', (e) => field.pointer(e.clientX, e.clientY), { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) field.stop();
      else if (!stage || parseFloat(document.getElementById('field').style.opacity || '1') > 0.002) field.start();
    });
    if (!stage || parseFloat(document.getElementById('field').style.opacity || '1') > 0.002) field.start();
  }

  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (field) {
      field.resize();
      if (window.innerWidth !== lastWidth && doc) field.setClusters(repoClusters(doc.repos));
    }
    if (window.innerWidth !== lastWidth) {
      lastWidth = window.innerWidth;
      fitDisplayType();
      window.ScrollTrigger?.refresh();
      if (sectionEl) useSection(sectionEl);
    }
  });
}

main();
