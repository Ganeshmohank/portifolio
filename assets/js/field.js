// A GPU particle field. Particles live in transform-feedback buffers and are pulled
// towards procedural formations, each one drawn from a system Mohan actually built.

export const FORMS = {
  organism: 0, orbit: 1, lanes: 2, mesh: 3, funnel: 4, constellation: 5, helix: 6, dust: 7, ar: 9, vault: 10,
};

const MAX_CLUSTERS = 32;

const FORMATIONS = /* glsl */ `
const float TAU = 6.2831853;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float hash1(float n) { return fract(sin(n * 91.345) * 47453.5453); }

vec3 sphere(vec2 s) {
  float z = s.x * 2.0 - 1.0;
  float r = sqrt(max(0.0, 1.0 - z * z));
  float a = s.y * TAU;
  return vec3(r * cos(a), r * sin(a), z);
}

// The body at rest: a breathing torus.
vec3 fOrganism(vec4 s, float t) {
  float a = s.x * TAU;
  float b = s.y * TAU;
  float R = 0.62 + 0.09 * sin(3.0 * a + t * 0.35);
  float r = 0.2 * (0.45 + s.z) * (1.0 + 0.45 * sin(2.0 * a - t * 0.5));
  vec3 p = vec3((R + r * cos(b)) * cos(a), (R + r * cos(b)) * sin(a), r * sin(b));
  p.yz = rot(1.05) * p.yz;
  p.xz = rot(t * 0.07) * p.xz;
  return p;
}

// Orbit, the CalHacks project: rings around a nucleus, with moons.
vec3 fOrbit(vec4 s, float t) {
  if (s.w < 0.08) return sphere(s.xy) * 0.09 * pow(s.z, 0.5);
  float ring = floor(s.x * 5.0);
  float radius = 0.26 + ring * 0.17;
  float speed = 0.55 / (ring + 1.0);
  float a = s.y * TAU + t * speed;
  if (s.w < 0.2) {
    // A moon: a small body that rides each ring.
    a = hash1(ring) * TAU + t * speed;
    vec3 moon = vec3(cos(a) * radius, sin(a) * radius, 0.0) + sphere(s.yz) * 0.028;
    moon.yz = rot(1.15 + ring * 0.13) * moon.yz;
    moon.xy = rot(ring * 0.5) * moon.xy;
    return moon;
  }
  vec3 p = vec3(cos(a) * radius, sin(a) * radius, (s.z - 0.5) * 0.012);
  p.yz = rot(1.15 + ring * 0.13) * p.yz;
  p.xy = rot(ring * 0.5) * p.xy;
  return p;
}

// Parallel Kafka consumer, NatWest queues: partitions moving batches of messages.
vec3 fLanes(vec4 s, float t, float wide) {
  float lane = floor(s.x * 7.0);
  float y = mix(-0.72, 0.72, (lane + 0.5) / 7.0);
  float speed = 0.05 + 0.1 * hash1(lane + 3.0);
  float f = fract(s.y + t * speed);
  float packets = 9.0 + floor(hash1(lane) * 7.0);
  float cell = floor(f * packets);
  float x = (cell + s.z * 0.55) / packets;
  return vec3((x * 2.0 - 1.0) * wide, y + (s.w - 0.5) * 0.045, (s.w - 0.5) * 0.08);
}

vec3 meshNode(float i, float t) {
  float a = i * 2.399963;
  float r = 0.28 + 0.62 * sqrt((i + 0.5) / 9.0);
  vec3 p = vec3(cos(a) * r, sin(a) * r * 0.86, (hash1(i) - 0.5) * 0.5);
  p.xy += 0.025 * vec2(sin(t * 0.3 + i), cos(t * 0.27 + i * 2.0));
  return p;
}

// P2PFile: peers holding data, with pieces moving along the links between them.
vec3 fMesh(vec4 s, float t) {
  float i = floor(s.x * 9.0);
  vec3 a = meshNode(i, t);
  if (s.w < 0.42) return a + sphere(s.yz) * 0.075 * pow(s.w / 0.42, 0.4);
  float j = mod(i + 1.0 + floor(s.y * 3.0), 9.0);
  vec3 b = meshNode(j, t);
  float f = fract(s.z + t * (0.04 + 0.08 * hash1(i * 13.0 + j)));
  return mix(a, b, f);
}

// ServiceNow: tickets fall towards support, and exactly 31% peel off on the way,
// which is the deflection rate the RAG agent reached.
vec3 fFunnel(vec4 s, float t) {
  float f = fract(s.x + t * 0.055);
  float a = s.y * TAU + t * 0.5;
  float w = mix(0.82, 0.075, smoothstep(0.0, 0.62, f));
  vec3 p = vec3(cos(a) * w, 0.9 - f * 1.8, sin(a) * w * 0.45);
  if (s.z < 0.31 && f > 0.42) {
    float g = (f - 0.42) / 0.58;
    p.x += g * g * 1.25 + g * 0.1;
    p.y += g * 0.55;
    p.z *= 1.0 - g;
  }
  return p;
}

// One cluster for each public repo. Size comes from real push recency.
vec3 fConstellation(vec4 s, vec4 c) {
  return vec3(c.xy, 0.0) + sphere(s.yz) * c.z * pow(s.w, 0.55);
}

// Augmented reality: the floor found by plane detection, a marker on it,
// and a virtual object anchored there. The object follows the cursor.
vec3 fAr(vec4 s, float t, float wide, vec3 mouse) {
  vec2 anchor = vec2(wide * 0.42 + sin(t * 0.2) * 0.1, -0.28);
  if (mouse.x < 5.0) anchor = vec2(clamp(mouse.x, -wide * 0.95, wide * 0.95), clamp(mouse.y, -0.55, 0.05));

  if (s.w < 0.56) {
    // Perspective grid of tracked floor points, with a scan line sweeping away from the viewer.
    float depth = pow(s.y, 1.3);
    float y = mix(-1.0, 0.02, 1.0 - pow(1.0 - depth, 1.8));
    float spread = mix(1.25, 0.32, depth) * wide;
    float x = s.x * 2.0 - 1.0;
    if (s.z < 0.5) x = (floor(x * 8.0) + 0.5) / 8.0;
    else y = mix(-1.0, 0.02, 1.0 - pow(1.0 - (floor(depth * 9.0) + 0.5) / 9.0, 1.8));
    float scan = fract(t * 0.16);
    float lift = exp(-pow((depth - scan) * 11.0, 2.0)) * 0.035;
    return vec3(x * spread, y + lift, 0.0);
  }

  float size = 0.17;
  if (s.w < 0.68) {
    // The marker: a square lying flat under the object.
    float side = floor(s.x * 4.0);
    float e = s.y * 2.0 - 1.0;
    vec2 q = side < 1.0 ? vec2(e, -1.0) : side < 2.0 ? vec2(e, 1.0) : side < 3.0 ? vec2(-1.0, e) : vec2(1.0, e);
    float pulse = 1.28 + 0.1 * sin(t * 2.0);
    return vec3(anchor.x + q.x * size * pulse, anchor.y - 0.2 + q.y * size * pulse * 0.34, 0.0);
  }

  // The anchored object: a slowly turning wireframe cube.
  float edge = floor(s.x * 12.0);
  float turn = t * 0.55;
  float n = mod(edge, 4.0);
  float a0 = n * 1.5708 + 0.7854 + turn;
  float a1 = (n + 1.0) * 1.5708 + 0.7854 + turn;
  float r = size * 1.414;
  vec3 p;
  if (edge < 4.0) p = mix(vec3(cos(a0), -0.7, sin(a0)), vec3(cos(a1), -0.7, sin(a1)), s.y);
  else if (edge < 8.0) p = mix(vec3(cos(a0), 0.7, sin(a0)), vec3(cos(a1), 0.7, sin(a1)), s.y);
  else p = vec3(cos(a0), mix(-0.7, 0.7, s.y), sin(a0));
  p.xz *= r;
  p.y = p.y * size * 1.414 + p.z * 0.34;
  return vec3(anchor.x + p.x, anchor.y + 0.02 + p.y, 0.0);
}

// A bank vault door: heavy rim, locking bolts, a dial and a turning wheel.
vec3 fVault(vec4 s, float t) {
  float z = (s.z - 0.5) * 0.03;
  if (s.w < 0.26) {
    // The rim, thick and solid.
    float r = mix(0.78, 0.92, s.y);
    float a = s.x * TAU;
    return vec3(cos(a) * r, sin(a) * r, z);
  }
  if (s.w < 0.46) {
    // Twelve locking bolts, sliding in and out together.
    float n = floor(s.x * 12.0);
    float a = (n + 0.5) / 12.0 * TAU;
    float throwOut = 0.03 + 0.05 * (0.5 + 0.5 * sin(t * 0.8));
    float along = 0.92 + throwOut + s.y * 0.12;
    float across = (s.z - 0.5) * 0.075;
    return vec3(cos(a) * along - sin(a) * across, sin(a) * along + cos(a) * across, z);
  }
  if (s.w < 0.62) {
    // The dial: tick marks turning one way.
    float n = floor(s.x * 40.0);
    float a = n / 40.0 * TAU + t * 0.14;
    float r = mix(0.58, 0.68, s.y);
    return vec3(cos(a) * r, sin(a) * r, z);
  }
  // The handwheel: five spokes turning the other way, with a hub and grip.
  float turn = -t * 0.3;
  if (s.w < 0.8) {
    float n = floor(s.x * 5.0);
    float a = n / 5.0 * TAU + turn;
    float along = mix(0.08, 0.42, s.y);
    float across = (s.z - 0.5) * 0.045;
    return vec3(cos(a) * along - sin(a) * across, sin(a) * along + cos(a) * across, z);
  }
  if (s.w < 0.92) {
    float a = s.x * TAU + turn;
    float r = mix(0.4, 0.46, s.y);
    return vec3(cos(a) * r, sin(a) * r, z);
  }
  return sphere(s.xy) * vec3(0.1, 0.1, 0.03) * pow(s.z, 0.4);
}

vec3 fDust(vec4 s, float wide) {
  return vec3((s.x * 2.0 - 1.0) * wide * 1.1, (s.y * 2.0 - 1.0) * 1.1, s.z - 0.5);
}
`;

const UPDATE_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aVel;
layout(location = 2) in vec4 aSeed;

uniform float uT, uDt, uChange, uFlowScale, uSpeed, uCurl, uKick, uAspect, uFit, uScroll;
uniform int uForm, uPrev, uCount;
uniform vec2 uOffset;
uniform vec4 uMouse;
uniform vec4 uClusters[${MAX_CLUSTERS}];

out vec3 vPos;
out vec3 vVel;
${FORMATIONS}

vec3 flow(vec3 p, float t) {
  vec3 q = p * uFlowScale;
  vec3 f = vec3(
    sin(q.y * 1.3 + t * 0.31 + sin(q.z * 1.7 - t * 0.2)),
    sin(q.z * 1.1 - t * 0.27 + sin(q.x * 1.9 + t * 0.17)),
    sin(q.x * 1.5 + t * 0.23 + sin(q.y * 1.3 + t * 0.29))
  );
  q *= 2.3;
  f += 0.5 * vec3(
    sin(q.y + t * 0.5 + 1.7),
    sin(q.z - t * 0.43 + 4.1),
    sin(q.x + t * 0.37 + 2.3)
  );
  return f;
}

void main() {
  float t = uT;
  float wide = max(uAspect * 0.92, 0.9);
  bool switched = (uT - uChange) > aSeed.w * 0.16;
  int form = switched ? uForm : uPrev;

  vec3 tgt;
  float stiff = 5.0;
  float loose = 0.35;
  if (form == 0)      { tgt = fOrganism(aSeed, t); stiff = 2.6; loose = 0.95; }
  else if (form == 1) { tgt = fOrbit(aSeed, t); stiff = 8.0; loose = 0.18; }
  else if (form == 2) { tgt = fLanes(aSeed, t, wide); stiff = 11.0; loose = 0.1; }
  else if (form == 3) { tgt = fMesh(aSeed, t); stiff = 8.0; loose = 0.15; }
  else if (form == 4) { tgt = fFunnel(aSeed, t); stiff = 8.0; loose = 0.16; }
  else if (form == 5) {
    int i = int(floor(aSeed.x * float(uCount)));
    tgt = fConstellation(aSeed, uClusters[i]);
    stiff = 7.0; loose = 0.14;
  }
  else if (form == 9) { tgt = fAr(aSeed, t, wide, uMouse.xyz); stiff = 12.0; loose = 0.05; }
  else if (form == 10) { tgt = fVault(aSeed, t) * vec3(0.8, 0.8, 1.0); stiff = 12.0; loose = 0.05; }
  else                { tgt = fDust(aSeed, wide); stiff = 0.9; loose = 0.8; }

  if (form != 2 && form != 7 && form != 6 && form != 5 && form != 9) {
    if (form != 10) tgt.xz = rot(uScroll * 1.6) * tgt.xz;
    tgt.xy *= uFit;
  }
  if (form != 2 && form != 6 && form != 7 && form != 5 && form != 9) tgt.xy += uOffset;

  vec3 acc = (tgt - aPos) * stiff;
  acc += flow(aPos, t * uSpeed) * uCurl * (loose + uKick);

  // For the first moment after a change, particles are pulled straight to their new home
  // rather than drifting there on spring forces alone.
  float snap = 1.0 - smoothstep(0.3, 0.95, uT - uChange);
  vec3 v = aVel + acc * uDt;
  v *= exp(-(3.4 + 9.0 * snap) * uDt);
  vPos = mix(aPos + v * uDt, tgt, 1.0 - exp(-uDt * (0.5 + 13.0 * snap)));
  vVel = v;
}`;

const UPDATE_FS = /* glsl */ `#version 300 es
precision lowp float;
out vec4 o;
void main() { o = vec4(0.0); }`;

const DRAW_VS = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aVel;
layout(location = 2) in vec4 aSeed;

uniform float uAspect, uSize, uDpr, uIntensity;
uniform vec3 uColA, uColB;
uniform int uForm, uHot, uCount;
out vec3 vColor;

void main() {
  float persp = 1.0 / (1.0 + aPos.z * 0.42);
  gl_Position = vec4(aPos.x / uAspect * persp, aPos.y * persp, 0.0, 1.0);
  gl_PointSize = uSize * uDpr * persp * (0.55 + aSeed.z * 0.9);
  float speed = length(aVel);
  vec3 c = mix(uColA, uColB, smoothstep(0.42, 0.86, aSeed.y));
  float glow = (0.34 + speed * 1.15) * uIntensity;
  if (uForm == 5 && uHot >= 0 && int(floor(aSeed.x * float(uCount))) == uHot) {
    c = uColA;
    glow *= 5.0;
  }
  vColor = c * glow;
}`;

const DRAW_FS = /* glsl */ `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 o;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  o = vec4(vColor * a, 1.0);
}`;

const QUAD_VS = /* glsl */ `#version 300 es
const vec2 P[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
out vec2 vUv;
void main() {
  vUv = P[gl_VertexID] * 0.5 + 0.5;
  gl_Position = vec4(P[gl_VertexID], 0.0, 1.0);
}`;

const FADE_FS = /* glsl */ `#version 300 es
precision mediump float;
uniform float uTrail;
out vec4 o;
void main() { o = vec4(vec3(uTrail), 1.0); }`;

const SHOW_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform float uDim;
in vec2 vUv;
out vec4 o;
float noise(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  vec3 c = texture(uTex, vUv).rgb;
  c = 1.0 - exp(-c * 1.5);
  vec3 bg = vec3(0.0392, 0.0392, 0.0353);
  vec3 col = bg + c * uDim;
  col += (noise(gl_FragCoord.xy) - 0.5) / 255.0;
  o = vec4(col, 1.0);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function program(gl, vs, fs, varyings) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  if (varyings) gl.transformFeedbackVaryings(p, varyings, gl.SEPARATE_ATTRIBS);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`Program failed to link: ${gl.getProgramInfoLog(p)}`);
  }
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(p, i).name.replace('[0]', '');
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

export function createField(canvas, { count, staticRender = false } = {}) {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const floatTarget = gl.getExtension('EXT_color_buffer_float')
    || gl.getExtension('EXT_color_buffer_half_float');

  const update = program(gl, UPDATE_VS, UPDATE_FS, ['vPos', 'vVel']);
  const draw = program(gl, DRAW_VS, DRAW_FS);
  const fade = program(gl, QUAD_VS, FADE_FS);
  const show = program(gl, QUAD_VS, SHOW_FS);

  // --- particles ------------------------------------------------------------
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() ** 2 * 0.05;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.sin(a) * r;
    pos[i * 3 + 2] = 0;
    for (let k = 0; k < 4; k++) seed[i * 4 + k] = Math.random();
  }

  const seedBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, seed, gl.STATIC_DRAW);

  const states = [0, 1].map(() => {
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.DYNAMIC_COPY);
    const velBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, velBuf);
    gl.bufferData(gl.ARRAY_BUFFER, count * 12, gl.DYNAMIC_COPY);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, velBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return { posBuf, velBuf, vao };
  });

  const emptyVao = gl.createVertexArray();

  // --- trail buffer ---------------------------------------------------------
  const tex = gl.createTexture();
  const fbo = gl.createFramebuffer();

  const state = {
    current: 0,
    active: count,
    dpr: 1,
    width: 1,
    height: 1,
    form: FORMS.organism,
    prev: FORMS.organism,
    change: 0,
    time: 0,
    offset: [0, 0],
    offsetTarget: [0, 0],
    dim: 1,
    dimTarget: 1,
    kick: 0,
    scroll: 0,
    hot: -1,
    clusterCount: 1,
    clusters: new Float32Array(MAX_CLUSTERS * 4),
    mouse: [10, 10, 0],
    mouseTarget: [10, 10],
    genes: null,
    goal: null,
    running: false,
    raf: 0,
    last: 0,
    slow: 0,
    frames: 0,
  };

  function resize() {
    const cap = window.innerWidth < 800 ? 1.25 : 1.5;
    state.dpr = Math.min(window.devicePixelRatio || 1, state.dprCap ?? cap);
    const w = Math.round(canvas.clientWidth * state.dpr);
    const h = Math.round(canvas.clientHeight * state.dpr);
    if (w === state.width && h === state.height) return;
    state.width = canvas.width = w;
    state.height = canvas.height = h;

    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (floatTarget) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  function frame(dtRaw) {
    // A generous cap, so the motion keeps real time even when frames take longer.
    const dt = Math.min(dtRaw, 1 / 15);
    // Trails and brightness are normalised to 60fps, so the look does not depend on the display.
    const frameScale = Math.min(dtRaw, 0.1) * 60;
    state.time += dt;

    const ease = (rate) => 1 - Math.exp(-dt * rate);
    const g = state.genes;
    const goal = state.goal;
    for (const key of ['flowScale', 'speed', 'curl', 'size', 'trail']) g[key] += (goal[key] - g[key]) * ease(1.6);
    for (let i = 0; i < 3; i++) {
      g.a[i] += (goal.a[i] - g.a[i]) * ease(2);
      g.b[i] += (goal.b[i] - g.b[i]) * ease(2);
    }
    state.offset[0] += (state.offsetTarget[0] - state.offset[0]) * ease(1.5);
    state.offset[1] += (state.offsetTarget[1] - state.offset[1]) * ease(1.5);
    state.dim += (state.dimTarget - state.dim) * ease(2.2);
    state.kick *= Math.exp(-dt * 2.5);
    state.mouse[0] += (state.mouseTarget[0] - state.mouse[0]) * ease(9);
    state.mouse[1] += (state.mouseTarget[1] - state.mouse[1]) * ease(9);

    const aspect = state.width / state.height;
    const fit = Math.min(1, Math.max(0.5, aspect / 1.05));

    // simulate
    const src = states[state.current];
    const dst = states[1 - state.current];
    gl.useProgram(update.p);
    const u = update.u;
    gl.uniform1f(u.uT, state.time);
    gl.uniform1f(u.uDt, dt);
    gl.uniform1f(u.uChange, state.change);
    gl.uniform1f(u.uFlowScale, g.flowScale);
    gl.uniform1f(u.uSpeed, g.speed);
    gl.uniform1f(u.uCurl, g.curl);
    gl.uniform1f(u.uKick, state.kick);
    gl.uniform1f(u.uAspect, aspect);
    gl.uniform1f(u.uFit, fit);
    gl.uniform1f(u.uScroll, state.scroll);
    gl.uniform1i(u.uForm, state.form);
    gl.uniform1i(u.uPrev, state.prev);
    gl.uniform1i(u.uCount, state.clusterCount);
    gl.uniform2f(u.uOffset, state.offset[0] * aspect, state.offset[1]);
    gl.uniform4f(u.uMouse, state.mouse[0], state.mouse[1], state.mouse[2], 0);
    gl.uniform4fv(u.uClusters, state.clusters);

    gl.bindVertexArray(src.vao);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, dst.posBuf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, dst.velBuf);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, state.active);
    gl.endTransformFeedback();
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
    gl.disable(gl.RASTERIZER_DISCARD);

    state.current = 1 - state.current;

    // draw into the trail buffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, state.width, state.height);
    gl.enable(gl.BLEND);

    gl.useProgram(fade.p);
    gl.uniform1f(fade.u.uTrail, g.trail ** frameScale);
    gl.blendFunc(gl.ZERO, gl.SRC_COLOR);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(draw.p);
    gl.uniform1f(draw.u.uAspect, aspect);
    gl.uniform1f(draw.u.uSize, g.size);
    gl.uniform1f(draw.u.uDpr, state.dpr);
    // Keep overall brightness steady whatever the particle count and trail length are.
    gl.uniform1f(draw.u.uIntensity, 0.42 * (140000 / state.active) * (1 - g.trail) * frameScale / state.dpr);
    gl.uniform3fv(draw.u.uColA, g.a);
    gl.uniform3fv(draw.u.uColB, g.b);
    gl.uniform1i(draw.u.uForm, state.form);
    gl.uniform1i(draw.u.uHot, state.hot);
    gl.uniform1i(draw.u.uCount, state.clusterCount);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(states[state.current].vao);
    gl.drawArrays(gl.POINTS, 0, state.active);

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // show
    gl.viewport(0, 0, state.width, state.height);
    gl.useProgram(show.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(show.u.uTex, 0);
    gl.uniform1f(show.u.uDim, state.dim);
    gl.bindVertexArray(emptyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  function loop(now) {
    if (!state.running) return;
    state.raf = requestAnimationFrame(loop);
    const dt = (now - state.last) / 1000;
    state.last = now;
    if (dt <= 0) return;

    // Hold 45fps or better on weak GPUs: lower resolution first, then particles.
    if (dt < 0.2) {
      state.slow = state.slow * 0.97 + (dt > 0.03 ? 0.03 : 0);
      if (++state.frames > 90 && state.slow > 0.6) {
        state.frames = 0;
        state.slow = 0;
        if ((state.dprCap ?? 2) > 1) {
          state.dprCap = 1;
          resize();
        } else if (state.active > 18000) {
          state.active = Math.max(18000, Math.floor(state.active * 0.72));
        }
      }
    }
    frame(dt);
  }

  const toLinear = (rgb) => rgb.map((v) => v / 255);

  const api = {
    setGenes(p, instant = false) {
      const next = {
        flowScale: p.flowScale, speed: p.speed, curl: p.curl, size: p.size, trail: p.trail,
        a: toLinear(p.accent), b: toLinear(p.accent2),
      };
      state.goal = next;
      if (instant || !state.genes) state.genes = { ...next, a: [...next.a], b: [...next.b] };
    },
    setForm(name) {
      const f = FORMS[name];
      if (f === undefined || f === state.form) return;
      state.prev = state.form;
      state.form = f;
      state.change = state.time;
    },
    setOffset(x, y = 0) { state.offsetTarget = [x, y]; },
    setDim(v) { state.dimTarget = v; },
    setScroll(v) { state.scroll = v; },
    kick(v) { state.kick = Math.min(1.1, Math.max(state.kick, v)); },
    setHot(i) { state.hot = i; },
    setClusters(list) {
      const n = Math.min(list.length, MAX_CLUSTERS);
      state.clusterCount = Math.max(n, 1);
      for (let i = 0; i < n; i++) {
        state.clusters[i * 4] = list[i].x;
        state.clusters[i * 4 + 1] = list[i].y;
        state.clusters[i * 4 + 2] = list[i].r;
      }
    },
    /** Only the AR scene reads this, to place its object. */
    pointer(clientX, clientY) {
      const aspect = state.width / state.height;
      state.mouseTarget = [(clientX / canvas.clientWidth * 2 - 1) * aspect, 1 - clientY / canvas.clientHeight * 2];
    },
    resize,
    start() {
      if (state.running || !state.genes) return;
      if (staticRender) {
        // Reduced motion: settle once into a still picture, and leave it there.
        resize();
        for (let i = 0; i < 300; i++) frame(1 / 30);
        return;
      }
      state.running = true;
      state.last = performance.now();
      state.change = state.time;
      state.prev = state.form;
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
