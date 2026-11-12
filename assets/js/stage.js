// The 3D stage: a machined model of the ServiceNow RAG agent, and the vector space
// behind the "Ask" section. Every layer of the model is a real stage of that system.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './../vendor/three/RoundedBoxGeometry.js';
import { RoomEnvironment } from './../vendor/three/RoomEnvironment.js';
import { createIdentity } from './identity3d.js';

const LAYERS = 7;
const LAYER_NAMES = ['TICKETS IN', 'RETRIEVAL', 'MEMORY', 'ROUTING', 'MODEL', 'GUARDS', 'DEFLECTED'];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws the glowing circuitry for each layer. White is lit, and tinted by the genome later. */
const PATTERNS = [
  // Intake: rows of incoming tickets.
  (g, s, r) => {
    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 22; x++) {
        if (r() < 0.62) {
          g.globalAlpha = r() < 0.3 ? 1 : 0.5;
          g.fillRect(46 + x * 43, 46 + y * 31.5, 31, 9);
        }
      }
    }
    g.globalAlpha = 1;
    g.lineWidth = 5;
    g.strokeRect(22, 22, s - 44, s - 44);
  },
  // Retrieval: a page-like grid of documents with lines of text.
  (g, s, r) => {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const px = 70 + x * 180;
        const py = 70 + y * 180;
        g.strokeRect(px, py, 138, 138);
        const lines = 2 + Math.floor(r() * 5);
        for (let i = 0; i < lines; i++) g.fillRect(px + 14, py + 16 + i * 18, 40 + r() * 70, 5);
      }
    }
  },
  // Memory: dense cell banks.
  (g, s, r) => {
    for (let b = 0; b < 4; b++) {
      const bx = 70 + (b % 2) * 450;
      const by = 70 + Math.floor(b / 2) * 450;
      g.strokeRect(bx, by, 420, 420);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          g.globalAlpha = r() < 0.4 ? 1 : 0.22;
          g.fillRect(bx + 14 + x * 25, by + 14 + y * 25, 17, 17);
        }
      }
      g.globalAlpha = 1;
    }
  },
  // Router: one trunk splitting into fast and slow lanes.
  (g, s, r) => {
    g.lineWidth = 7;
    for (let i = 0; i < 9; i++) {
      const y = 112 + i * 100;
      g.beginPath();
      g.moveTo(50, s / 2);
      g.bezierCurveTo(300, s / 2, 300, y, 520, y);
      g.lineTo(s - 50, y);
      g.stroke();
      g.fillRect(620 + r() * 260, y - 13, 40, 26);
    }
  },
  // Model: a large central die.
  (g, s, r) => {
    g.lineWidth = 3;
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      g.beginPath();
      g.moveTo(s / 2 + Math.cos(a) * 265, s / 2 + Math.sin(a) * 265);
      const k = 340 + r() * 90;
      g.lineTo(s / 2 + Math.cos(a) * k, s / 2 + Math.sin(a) * k);
      g.lineTo(s / 2 + Math.cos(a + 0.05) * (k + 40), s / 2 + Math.sin(a + 0.05) * (k + 40));
      g.stroke();
    }
    g.strokeRect(s / 2 - 255, s / 2 - 255, 510, 510);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        g.globalAlpha = 0.25 + r() * 0.75;
        g.fillRect(s / 2 - 235 + x * 24, s / 2 - 235 + y * 24, 16, 16);
      }
    }
    g.globalAlpha = 1;
  },
  // Guards: concentric checkpoints around the answer.
  (g, s) => {
    g.lineWidth = 8;
    for (let i = 0; i < 6; i++) {
      const m = 70 + i * 62;
      g.setLineDash([64, 26 + i * 6]);
      g.strokeRect(m, m, s - m * 2, s - m * 2);
    }
    g.setLineDash([]);
    g.fillRect(s / 2 - 40, s / 2 - 40, 80, 80);
  },
  // Output: resolved tickets leaving through an aperture.
  (g, s, r) => {
    g.lineWidth = 6;
    for (let i = 0; i < 7; i++) {
      g.beginPath();
      g.arc(s / 2, s / 2, 90 + i * 58, 0.2 + i * 0.5, 0.2 + i * 0.5 + 4.6);
      g.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2;
      const k = 100 + r() * 340;
      g.fillRect(s / 2 + Math.cos(a) * k, s / 2 + Math.sin(a) * k, 12, 12);
    }
  },
];

function layerTexture(index, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  g.save();
  g.scale(size / 1024, size / 1024);
  g.fillStyle = g.strokeStyle = '#fff';
  g.lineWidth = 3;
  PATTERNS[index](g, 1024, rngFrom(index * 97 + 5));
  g.globalAlpha = 1;
  g.setLineDash([]);
  const label = LAYER_NAMES[index];
  g.font = '700 40px "Hanken Grotesk", Arial, sans-serif';
  const w = g.measureText(label).width;
  g.fillStyle = '#000';
  g.fillRect(1024 - w - 66, 1024 - 90, w + 44, 62);
  g.fillStyle = '#fff';
  g.fillText(label, 1024 - w - 44, 1024 - 44);
  g.restore();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export function createStage(canvas, { small = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.08).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 8, 6);
  scene.add(key);

  const accent = new THREE.Color('#dbbf09');
  const accent2 = new THREE.Color('#0099db');
  const glow = glowTexture();

  // --- the model ------------------------------------------------------------
  const model = new THREE.Group();
  scene.add(model);
  const stack = new THREE.Group();
  model.add(stack);

  const texSize = small ? 512 : 768;
  const bodyGeo = new RoundedBoxGeometry(4.4, 0.24, 4.4, 4, 0.05);
  const faceGeo = new THREE.PlaneGeometry(4.16, 4.16);
  const seamGeo = new THREE.BoxGeometry(4.46, 0.03, 4.46);

  const layers = [];
  for (let i = 0; i < LAYERS; i++) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
      color: i === 4 ? 0x24252a : 0x15161a,
      metalness: 1,
      roughness: i === 4 ? 0.42 : 0.58,
    }));
    const map = layerTexture(i, texSize);
    const faceMat = new THREE.MeshBasicMaterial({
      map, color: accent.clone(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4,
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.125;
    const seamMat = new THREE.MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    group.add(body, face, seam);
    stack.add(group);
    layers.push({ group, face, faceMat, seamMat, glow: 0 });
  }

  // The data path: a beam through the centre of the stack.
  const beamMat = new THREE.MeshBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 12), beamMat);
  stack.add(beam);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x3a3c44, metalness: 1, roughness: 0.3, transparent: true, opacity: 0 });
  const rails = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 10), railMat);
    rail.position.set(x * 2.02, 0, z * 2.02);
    stack.add(rail);
    return rail;
  });

  // Tickets travelling through it. Exactly 31% leave at the output, as deflected.
  const TICKETS = small ? 170 : 320;
  const ticketPos = new Float32Array(TICKETS * 3);
  const tickets = Array.from({ length: TICKETS }, (_, i) => ({
    t: i / TICKETS,
    a: (i * 2.399963) % (Math.PI * 2),
    r: 0.12 + ((i * 7) % 11) / 11 * 0.5,
    deflected: (i * 0.31) % 1 < 0.31,
  }));
  const ticketGeo = new THREE.BufferGeometry();
  ticketGeo.setAttribute('position', new THREE.BufferAttribute(ticketPos, 3));
  ticketGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TICKETS * 3), 3));
  const ticketMat = new THREE.PointsMaterial({
    map: glow, vertexColors: true, size: 0.16, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  stack.add(new THREE.Points(ticketGeo, ticketMat));

  // Soft light under the stack, so it sits in the space rather than on a sticker.
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: accent.clone(), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(7, 7, 1);
  halo.position.y = -0.1;
  model.add(halo);

  // --- the Root CA world ----------------------------------------------------
  const identity = createIdentity({ glow, small });
  scene.add(identity.group);

  // --- the vector space -----------------------------------------------------
  const space = new THREE.Group();
  space.visible = false;
  scene.add(space);
  let cloud = null;
  let chunkPositions = [];
  let chunkGroups = [];
  let topicColors = [];
  let cloudBright = null;
  const PER_CHUNK = small ? 14 : 34;
  const paintCloud = () => {
    if (!cloud || !cloudBright || !topicColors.length) return;
    const attr = cloud.geometry.attributes.color;
    for (let i = 0; i < attr.count; i++) {
      const c = topicColors[chunkGroups[Math.floor(i / PER_CHUNK)] ?? 0] || accent;
      attr.setXYZ(i, c.r * cloudBright[i], c.g * cloudBright[i], c.b * cloudBright[i]);
    }
    attr.needsUpdate = true;
  };
  const query = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: accent2.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  query.scale.set(0.5, 0.5, 1);
  space.add(query);
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * 3 * 3), 3));
  const beams = new THREE.LineSegments(beamGeo, new THREE.LineBasicMaterial({ color: accent.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  space.add(beams);
  const hits = Array.from({ length: 3 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: accent.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(0.5, 0.5, 1);
    space.add(s);
    return s;
  });

  // --- state ----------------------------------------------------------------
  const state = {
    quality: 1, slowFrames: 0, sampled: 0, hero: 0, heroT: 0, explode: 0, explodeT: 0, blend: 1, blendT: 1, stackIn: 0, stackInT: 0, rootPin: 0, rootPinT: 0, rootX: 0, rootY: 0, rootR: 1, rootO: 1, rootLabel: 0, rootXT: 0, rootYT: 0, rootRT: 1, rootOT: 1, rootLabelT: 0, active: -1, mode: 'model', running: false, raf: 0, last: 0, time: 0,
    px: 0, py: 0, tx: 0, ty: 0, side: 1,
    queryFrom: new THREE.Vector3(), queryTo: new THREE.Vector3(), queryT: 1, targets: [], spin: 0, hitsOn: 0,
  };
  const SPACE_SCALE = small ? 2.9 : 3.9;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5) * state.quality;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const worldPos = new THREE.Vector3();

  function update(dt) {
    state.time += dt;
    const ease = 1 - Math.exp(-dt * 8);
    const glide = 1 - Math.exp(-dt * 11);
    state.hero += (state.heroT - state.hero) * glide;
    state.explode += (state.explodeT - state.explode) * glide;
    state.blend += (state.blendT - state.blend) * glide;
    state.stackIn += (state.stackInT - state.stackIn) * glide;
    state.rootPin += (state.rootPinT - state.rootPin) * glide;
    state.rootX += (state.rootXT - state.rootX) * glide;
    state.rootY += (state.rootYT - state.rootY) * glide;
    state.rootR += (state.rootRT - state.rootR) * glide;
    state.rootO += (state.rootOT - state.rootO) * glide;
    state.rootLabel += (state.rootLabelT - state.rootLabel) * glide;
    state.px += (state.tx - state.px) * ease;
    state.py += (state.ty - state.py) * ease;

    const portrait = camera.aspect < 0.9;

    if (state.mode === 'model') {
      model.visible = true;
      space.visible = false;
      const e = smooth(state.explode * 1.25);
      const gap = lerp(0.27, portrait ? 0.7 : 0.82, e);
      const total = gap * (LAYERS - 1);
      layers.forEach((layer, i) => {
        layer.group.position.y = total / 2 - i * gap;
        const lit = state.active === i ? 1 : 0;
        layer.glow += (lit - layer.glow) * ease;
        // Slide towards the camera and the copy, whatever way the model is currently turned.
        const slide = layer.glow * (portrait ? 0.7 : 1.5);
        const angle = model.rotation.y;
        const wx = portrait ? 0 : -0.75;
        const wz = portrait ? 1 : 0.66;
        layer.group.position.x = (Math.cos(angle) * wx - Math.sin(angle) * wz) * slide;
        layer.group.position.z = (Math.sin(angle) * wx + Math.cos(angle) * wz) * slide;
        const base = lerp(0.95, 0.3, e);
        layer.faceMat.opacity = base + layer.glow * 0.9;
        layer.seamMat.opacity = 0.14 + e * 0.1 + layer.glow * 0.6;
        layer.group.rotation.y = e * (i - 3) * 0.035;
      });

      beam.scale.y = total + 0.4;
      beamMat.opacity = e * 0.7;
      rails.forEach((rail) => { rail.scale.y = total; });
      railMat.opacity = e;

      ticketMat.opacity = smooth((state.explode - 0.08) * 6) * 0.95;
      const pos = ticketGeo.attributes.position;
      const ticketColors = ticketGeo.attributes.color;
      const flow = state.time * 0.07;
      tickets.forEach((tk, i) => {
        const t = (tk.t + flow) % 1;
        const y = total / 2 + 0.7 - t * (total + 1.4);
        let x = Math.cos(tk.a + t * 7) * tk.r * 0.55;
        let z = Math.sin(tk.a + t * 7) * tk.r * 0.55;
        const exit = (t - 0.84) / 0.16;
        if (tk.deflected && exit > 0) {
          x += exit * exit * 3.4;
          z += exit * 0.6;
        }
        pos.setXYZ(i, x, y, z);
        const c = layers[Math.min(LAYERS - 1, Math.floor(t * LAYERS))].faceMat.color;
        ticketColors.setXYZ(i, c.r, c.g, c.b);
      });
      pos.needsUpdate = true;
      ticketColors.needsUpdate = true;

      // Where the object sits: heart of the hero, then beside the copy, or above it on phones.
      const toSide = smooth(state.hero);
      const offX = portrait ? 0 : lerp(0, state.side * 2.15, toSide);
      const offY = portrait ? lerp(1.15, 1.45, toSide) : lerp(-0.62, 0, toSide);
      const base = portrait ? lerp(0.4, 0.46, toSide) : lerp(0.56, 0.72, toSide);
      // The Root CA world and the stack hand over by scaling through each other.
      const blend = smooth(state.blend);
      const stackIn = smooth(state.stackIn);
      const scale = base * lerp(1, portrait ? 0.92 : 0.86, e) * Math.max(0.001, stackIn);
      model.visible = stackIn > 0.004;
      // The crystal sits in the hero, then a scene can take over and steer it in screen pixels.
      const pin = smooth(state.rootPin);
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      const halfW = halfH * camera.aspect;
      const screen = canvas.getBoundingClientRect();
      // On wide screens main.js steers it: beside the first name, then down beside the About copy.
      const a = state.heroAnchor;
      const startX = a ? (a.x / (screen.width || 1)) * 2 * halfW - halfW : 0;
      const startY = a ? halfH - (a.y / (screen.height || 1)) * 2 * halfH : 0.22;
      const startS = a ? (a.r / (screen.height || 1)) * 2 * halfH : 1.02;
      // With an anchor the whole path is already worked out in pixels, so it's used as given.
      const heroX = portrait ? 0 : a ? startX : lerp(0, state.side * 2.75, toSide);
      const heroY = portrait ? lerp(1.5, 1.45, toSide) : a ? startY : lerp(0.22, 0.28, toSide);
      const heroS = portrait ? lerp(0.62, 0.56, toSide) : a ? startS : lerp(1.02, 0.9, toSide);
      const pinX = (state.rootX / (screen.width || 1)) * 2 * halfW - halfW;
      const pinY = halfH - (state.rootY / (screen.height || 1)) * 2 * halfH;
      const pinS = (state.rootR / (screen.height || 1)) * 2 * halfH;
      identity.group.position.set(lerp(heroX, pinX, pin), lerp(heroY, pinY, pin), 0);
      identity.group.scale.setScalar(lerp(heroS, pinS, pin));
      identity.group.rotation.set(state.py * 0.1, state.px * 0.22, 0);
      identity.update({ time: state.time, visibility: blend * lerp(1, state.rootO, pin), labelOpacity: pin * state.rootLabel });
      model.position.set(offX, offY, 0);
      model.scale.setScalar(scale);

      model.rotation.x = lerp(0.62, 0.44, e) + state.py * 0.14;
      model.rotation.y = -0.72 + state.hero * 0.5 + state.explode * 1.5 + state.px * 0.3 + Math.sin(state.time * 0.3) * 0.05;
      model.rotation.z = lerp(0, -0.05, e);
      halo.material.opacity = lerp(0.1, 0.05, e);
    } else {
      model.visible = false;
      identity.group.visible = false;
      space.visible = true;
      space.position.set(camera.aspect < 0.9 ? 0 : 3.05, camera.aspect < 0.9 ? 1.9 : 0, 0);
      state.spin += dt * 0.09;
      space.rotation.y = state.spin + state.px * 0.5;
      space.rotation.x = 0.2 + state.py * 0.25;

      if (state.queryT < 1) {
        state.queryT = Math.min(1, state.queryT + dt * 1.5);
        const t = smooth(state.queryT);
        query.position.lerpVectors(state.queryFrom, state.queryTo, t);
        const arrived = smooth((state.queryT - 0.7) / 0.3);
        beams.material.opacity = arrived * 0.8;
        hits.forEach((h, i) => { h.material.opacity = state.targets[i] ? arrived : 0; });
        const attr = beamGeo.attributes.position;
        state.targets.forEach((target, i) => {
          attr.setXYZ(i * 2, query.position.x, query.position.y, query.position.z);
          attr.setXYZ(i * 2 + 1, target.x, target.y, target.z);
        });
        attr.needsUpdate = true;
        beamGeo.setDrawRange(0, state.targets.length * 2);
      }
      hits.forEach((h, i) => {
        h.scale.setScalar(0.55 + Math.sin(state.time * 4 + i) * 0.08);
      });
    }
  }

  function loop(now) {
    if (!state.running) return;
    state.raf = requestAnimationFrame(loop);
    // The first rAF timestamp can be earlier than performance.now(), so never run time backwards.
    const dt = Math.max(0, Math.min((now - state.last) / 1000, 0.1));
    state.last = now;
    if (dt > 0 && dt < 0.25) {
      state.sampled += 1;
      if (dt > 0.03) state.slowFrames += 1;
      if (state.sampled >= 40) {
        if (state.slowFrames > 24 && state.quality > 0.6) {
          state.quality = Math.max(0.6, state.quality - 0.2);
          resize();
        }
        state.sampled = 0;
        state.slowFrames = 0;
      }
    }
    update(dt);
    renderer.render(scene, camera);
  }

  const v = new THREE.Vector3();

  const api = {
    setGenes(p) {
      accent.setRGB(p.accent[0] / 255, p.accent[1] / 255, p.accent[2] / 255, THREE.SRGBColorSpace);
      accent2.setRGB(p.accent2[0] / 255, p.accent2[1] / 255, p.accent2[2] / 255, THREE.SRGBColorSpace);
      layers.forEach((l, i) => {
        const c = p.layers[i];
        l.faceMat.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace);
        l.seamMat.color.copy(l.faceMat.color);
      });
      identity.setColors(p.layers);
      topicColors = p.topics.map((c) => new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace));
      paintCloud();
      beamMat.color.copy(accent);
      halo.material.color.copy(accent);
      beams.material.color.copy(accent);
      hits.forEach((h) => h.material.color.copy(accent));
      query.material.color.copy(accent2);
    },
    setRootPose({ x, y, r, o, label }) {
      // Position and size follow the scene exactly. Easing them made the crystal trail the
      // scrolling world, so it sat below the route it was meant to start.
      state.rootX = x; state.rootY = y; state.rootR = r;
      state.rootXT = x; state.rootYT = y; state.rootRT = r; state.rootOT = o; state.rootLabelT = label;
    },
    setPose({ hero, explode, blend, stackIn, rootPin, active, side }) {
      if (stackIn !== undefined) state.stackInT = stackIn;
      if (rootPin !== undefined) state.rootPinT = rootPin;
      if (blend !== undefined) state.blendT = blend;
      if (hero !== undefined) state.heroT = hero;
      if (explode !== undefined) state.explodeT = explode;
      if (identity !== undefined) state.identityT = identity;
      if (active !== undefined) state.active = active;
      if (side !== undefined) state.side = side;
    },
    /** Where the crystal sits in the hero, in viewport pixels. Null centres it. */
    setHeroAnchor(anchor) { state.heroAnchor = anchor; },
    setMode(mode) { state.mode = mode; },
    pointer(x, y) { state.tx = x; state.ty = y; },
    /** Screen position of a layer's right edge, for the leader line. */
    layerAnchor(i) {
      const layer = layers[i];
      if (!layer) return null;
      v.set(-2.2, 0.12, 0);
      layer.group.localToWorld(v);
      v.project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height };
    },
    /** Where a chunk is on screen, for its floating label. Null when the space is not showing. */
    chunkScreen(i) {
      if (state.mode !== 'space' || !state.running || !chunkPositions[i]) return null;
      v.copy(chunkPositions[i]);
      space.localToWorld(v);
      v.project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height };
    },
    setChunks(positions, groups = []) {
      chunkGroups = groups;
      chunkPositions = positions.map((p) => new THREE.Vector3(p[0], p[1], p[2]).multiplyScalar(SPACE_SCALE * 0.62));
      const PER = PER_CHUNK;
      cloudBright = new Float32Array(chunkPositions.length * PER);
      const pts = new Float32Array(chunkPositions.length * PER * 3);
      const colors = new Float32Array(chunkPositions.length * PER * 3);
      const r = rngFrom(4242);
      chunkPositions.forEach((c, i) => {
        for (let k = 0; k < PER; k++) {
          const spread = k === 0 ? 0 : 0.2 * r() * r();
          const a = r() * Math.PI * 2;
          const z = r() * 2 - 1;
          const s = Math.sqrt(1 - z * z);
          const off = (i * PER + k) * 3;
          pts[off] = c.x + Math.cos(a) * s * spread;
          pts[off + 1] = c.y + Math.sin(a) * s * spread;
          pts[off + 2] = c.z + z * spread;
          cloudBright[i * PER + k] = k === 0 ? 1.6 : 0.4 + r() * 0.4;
        }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      if (cloud) space.remove(cloud);
      cloud = new THREE.Points(geo, new THREE.PointsMaterial({
        map: glow, size: small ? 0.12 : 0.1, vertexColors: true, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      space.add(cloud);
      paintCloud();
    },
    /** Fires the query into the space and connects it to what it retrieved. */
    showQuery(position, sourceIndexes) {
      const to = new THREE.Vector3(position[0], position[1], position[2]).multiplyScalar(SPACE_SCALE * 0.62);
      state.queryFrom.set(-SPACE_SCALE * 1.4, 0, SPACE_SCALE * 0.6);
      state.queryTo.copy(to);
      state.queryT = 0;
      query.material.opacity = 1;
      state.targets = sourceIndexes.map((i) => chunkPositions[i]).filter(Boolean);
      hits.forEach((h, i) => {
        h.material.opacity = 0;
        if (state.targets[i]) h.position.copy(state.targets[i]);
      });
      beams.material.opacity = 0;
    },
    resize,
    start() {
      if (state.running) return;
      state.running = true;
      state.last = performance.now();
      state.raf = requestAnimationFrame(loop);
    },
    stop() {
      state.running = false;
      cancelAnimationFrame(state.raf);
    },
  };

  resize();
  return api;
}
