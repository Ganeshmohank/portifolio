// The Cybersecurity scene: one continuous world the camera travels through, following a single
// request from the Root CA to the audit log. It's one scrubbed timeline in crisp DOM and SVG,
// so it plays exactly backwards when scrolling up.

const PLAINTEXT = 'GET /v1/identity HTTP/1.1';
const FIELDS = [
  ['Subject', 'CN=payments.prod'],
  ['Issuer', 'CN=Root CA'],
  ['Serial', '4F:9A:21:7C:03:E8'],
  ['Validity', '90 days'],
  ['Public key', 'ECDSA P-256'],
];
const ROLES = ['api-gateway', 'payments', 'ci-runner', 'ai-agent', 'database'];
const ACTIONS = ['read', 'issue', 'renew', 'revoke', 'admin'];
// What each machine keeps once access is granular. Everything else switches off.
const KEPT = {
  'api-gateway': ['read', 'renew'],
  payments: ['read', 'renew'],
  'ci-runner': ['issue'],
  'ai-agent': ['read'],
  database: ['read', 'renew'],
};
const ENVS = ['dev', 'test', 'stage', 'prod'];
const LOG = [
  ['dev', 'ci-runner', 'issue', 'allowed'],
  ['dev', 'ai-agent', 'revoke', 'denied'],
  ['test', 'api-gateway', 'renew', 'allowed'],
  ['test', 'ci-runner', 'admin', 'denied'],
  ['stage', 'database', 'read', 'allowed'],
  ['stage', 'ai-agent', 'issue', 'denied'],
  ['prod', 'api-gateway', 'read', 'allowed'],
  ['prod', 'payments', 'renew', 'allowed'],
];
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const hash = (n) => { const x = Math.sin(n * 91.345) * 47453.5453; return x - Math.floor(x); };
const clamp = (v) => Math.max(0, Math.min(1, v));

/** Text from one string to another, a character at a time. Same input, same output. */
function morphText(from, to, f) {
  const length = Math.max(from.length, to.length);
  const step = Math.floor(f * 30);
  let out = '';
  for (let i = 0; i < length; i++) {
    const at = (i / length) * 0.7;
    if (f <= at) out += from[i] ?? ' ';
    else if (f >= at + 0.26) out += to[i] ?? ' ';
    else out += GLYPHS[Math.floor(hash(i * 13.7 + step) * GLYPHS.length)];
  }
  return out;
}

/** A real signature and ciphertext, made in the visitor's browser. */
async function makeCrypto() {
  const subtle = window.crypto?.subtle;
  if (!subtle) return null;
  try {
    const encoder = new TextEncoder();
    const signer = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const signature = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer.privateKey, encoder.encode(FIELDS.flat().join('\n')));
    const hex = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipher = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(PLAINTEXT));
    return { signature: hex, ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipher))) };
  } catch {
    return null;
  }
}

function buildWorld() {
  const seal = `<svg class="seal" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="56"/><circle cx="60" cy="60" r="46"/>
      <path d="M38 62l15 15 30-34"/>
    </svg>`;
  const rows = FIELDS.map(([k, v]) => `<div class="cert-row"><span>${k}</span><b>${v}</b></div>`).join('');
  const header = `<div class="m-row m-head"><span></span>${ACTIONS.map((a) => `<span>${a}</span>`).join('')}</div>`;
  const matrix = ROLES.map((role) => `<div class="m-row" data-role="${role}"><b>${role}</b>${ACTIONS.map((action) => `<i class="m-cell ${KEPT[role].includes(action) ? 'keep' : 'drop'}"></i>`).join('')}</div>`).join('');
  const envs = ENVS.map((e) => `<div class="env" data-env="${e}"><span>${e}</span><i class="flag"><em></em></i></div>`).join('');
  const rowsHtml = LOG.map(([env, who, what, result]) => `<div class="log-row ${result}" data-env="${env}"><span>${env}</span><b>${who}</b><span>${what}</span><em>${result}</em></div>`).join('');
  return `
    <svg class="route" aria-hidden="true"><path class="route-track"/><path class="route-live"/></svg>
    <div class="cy-note" data-note="cert"><h3>Signed by the root</h3><p>Machine identity is what I work on. Every service proves who it is with a certificate that chains back to a trusted root.</p></div>
    <div class="cert" data-cert>
      <div class="cert-top"><strong>Certificate</strong><span>X.509 v3</span></div>
      ${rows}
      <div class="cert-sig" data-sig><span>Signature</span><code data-sig-text></code></div>
      ${seal}
    </div>
    <div class="cy-note" data-note="wire"><h3>Encrypted in transit</h3><p>With an identity it can prove, one service can talk to another over mutual TLS. Anyone watching the wire sees noise.</p></div>
    <div class="node" data-node="a"><b>api-gateway</b><span>mTLS verified</span></div>
    <div class="node" data-node="b"><b>payments</b><span>mTLS verified</span></div>
    <div class="cy-note" data-note="matrix"><h3>Access groups</h3><p>I replaced all-or-nothing RBAC with granular access groups. Least privilege is now a shared layer that services enforce by default.</p></div>
    <div class="matrix" data-matrix>${header}${matrix}</div>
    <div class="cy-note" data-note="audit"><h3>Audit trail</h3><p>I moved the platform's audit trail onto Palo Alto's central logging after the acquisition, one environment at a time, behind feature flags.</p></div>
    <div class="audit" data-audit>
      <div class="envs">${envs}</div>
      <svg class="audit-lines" viewBox="0 0 640 130" preserveAspectRatio="none" aria-hidden="true">
        ${ENVS.map((_, i) => `<path pathLength="1" d="M${80 + i * 160} 0C${80 + i * 160} 80 320 50 320 130"/>`).join('')}
      </svg>
      <div class="cy-ledger"><div class="cy-ledger-head"><strong>Central audit log</strong></div><div class="cy-ledger-rows">${rowsHtml}</div></div>
    </div>
    <code class="packet" data-packet>${PLAINTEXT}</code>
    <i class="token" data-token></i>
  `;
}

export function initCyber({ stage, viewHeight }) {
  const section = document.querySelector('.cyber');
  const host = document.getElementById('cyber-stage');
  if (!section || !host) return null;
  section.classList.add('is-scene');
  host.innerHTML = `<div class="cy-world">${buildWorld()}</div><p class="cy-tag">Palo Alto Networks, Machine Identity</p>`;
  const world = host.querySelector('.cy-world');
  const tag = host.querySelector('.cy-tag');
  const head = section.querySelector('.cyber-head');
  world.prepend(head);
  const q = (s) => world.querySelector(s);
  const qa = (s) => [...world.querySelectorAll(s)];
  const place = (el, x, y) => { el.style.left = `${x}px`; el.style.top = `${y}px`; };

  // The world is laid out left to right on wide screens, and top to bottom on phones.
  const wide = window.innerWidth >= 900;
  const L = wide
    ? {
      root: { x: 640, y: 340 }, head: { x: -340, y: 340 }, start: { x: 300, y: 340, z: 1.05 },
      cert: { x: 1220, y: 250 }, certNote: { x: 1220, y: 80 }, certCam: { x: 1500, y: 390, z: 1.25 },
      wire: { ax: 2230, bx: 2770, y: 800 }, wireNote: { x: 2250, y: 560 }, wireCam: { x: 2500, y: 720, z: 1.2 },
      matrix: { x: 3190, y: 270 }, matrixNote: { x: 3190, y: 90 }, matrixCam: { x: 3510, y: 420, z: 1.2 },
      audit: { x: 4190, y: 500 }, auditNote: { x: 4190, y: 310 }, auditCam: { x: 4510, y: 720, z: 0.96 },
    }
    : {
      root: { x: 320, y: 150 }, head: { x: 20, y: 640 }, start: { x: 320, y: 520, z: 1 },
      cert: { x: 40, y: 1800 }, certNote: { x: 40, y: 1500 }, certCam: { x: 320, y: 1900, z: 1 },
      wire: { ax: 320, bx: 320, y: 3360, by: 3760 }, wireNote: { x: 40, y: 3020 }, wireCam: { x: 320, y: 3460, z: 1 },
      matrix: { x: 10, y: 4400 }, matrixNote: { x: 40, y: 4090 }, matrixCam: { x: 320, y: 4470, z: 1 },
      audit: { x: 0, y: 5650 }, auditNote: { x: 40, y: 5350 }, auditCam: { x: 320, y: 5900, z: 0.92 },
    };

  place(head, L.head.x, L.head.y);
  place(q('[data-cert]'), L.cert.x, L.cert.y);
  place(q('[data-note="cert"]'), L.certNote.x, L.certNote.y);
  place(q('[data-note="wire"]'), L.wireNote.x, L.wireNote.y);
  place(q('[data-node="a"]'), L.wire.ax - 120, L.wire.y - 60);
  place(q('[data-node="b"]'), L.wire.bx - 120, (L.wire.by ?? L.wire.y) - 60);
  place(q('[data-note="matrix"]'), L.matrixNote.x, L.matrixNote.y);
  place(q('[data-matrix]'), L.matrix.x, L.matrix.y);
  place(q('[data-note="audit"]'), L.auditNote.x, L.auditNote.y);
  place(q('[data-audit]'), L.audit.x, L.audit.y);

  // The route, leg by leg. Each stop is measured from the real layout.
  const paymentsRow = q('.m-row[data-role="payments"]');
  const rowY = L.matrix.y + paymentsRow.offsetTop + paymentsRow.offsetHeight / 2;
  const ledger = q('.cy-ledger');
  const P = {
    root: L.root,
    seal: { x: L.cert.x + 464, y: L.cert.y + 310 },
    a: { x: L.wire.ax, y: L.wire.y },
    b: { x: L.wire.bx, y: L.wire.by ?? L.wire.y },
    rowIn: { x: L.matrix.x + 10, y: rowY },
    rowOut: { x: L.matrix.x + q('[data-matrix]').offsetWidth + 20, y: rowY },
    log: { x: L.audit.x + ledger.offsetLeft, y: L.audit.y + ledger.offsetTop + 34 },
  };
  const curve = (a, b) => (wide
    ? `C${(a.x + b.x) / 2} ${a.y} ${(a.x + b.x) / 2} ${b.y} ${b.x} ${b.y}`
    : `C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`);
  const legs = [
    `M${P.root.x} ${P.root.y}${curve(P.root, P.seal)}`,
    `M${P.seal.x} ${P.seal.y}${curve(P.seal, P.a)}`,
    `M${P.a.x} ${P.a.y}L${P.b.x} ${P.b.y}`,
    `M${P.b.x} ${P.b.y}${curve(P.b, P.rowIn)}`,
    `M${P.rowIn.x} ${P.rowIn.y}L${P.rowOut.x} ${P.rowOut.y}`,
    `M${P.rowOut.x} ${P.rowOut.y}${curve(P.rowOut, P.log)}`,
  ];
  const route = q('.route');
  const measure = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  route.append(measure);
  const legLengths = legs.map((d) => { measure.setAttribute('d', d); return measure.getTotalLength(); });
  measure.remove();
  const whole = `M${P.root.x} ${P.root.y}${curve(P.root, P.seal)}${curve(P.seal, P.a)}L${P.b.x} ${P.b.y}${curve(P.b, P.rowIn)}L${P.rowOut.x} ${P.rowOut.y}${curve(P.rowOut, P.log)}`;
  const track = q('.route-track');
  const live = q('.route-live');
  track.setAttribute('d', whole);
  live.setAttribute('d', whole);
  const total = track.getTotalLength();
  live.style.strokeDasharray = total;
  const stop = legLengths.reduce((acc, len) => [...acc, acc[acc.length - 1] + len], [0]);

  const crypto = { signature: '3045022100'.padEnd(72, 'a'), ciphertext: btoa(PLAINTEXT) };
  const sigText = q('[data-sig-text]');
  const packet = q('[data-packet]');
  const token = q('[data-token]');
  const setSignature = () => { sigText.textContent = crypto.signature.slice(0, 40); };
  setSignature();
  makeCrypto().then((result) => {
    if (result) { Object.assign(crypto, result); setSignature(); }
  });

  // Everything visible is computed from these two values, so reversing is exact.
  const cam = { x: L.start.x, y: L.start.y, z: L.start.z };
  const run = { d: 0 };
  let base = 1;
  let vw = 1;
  let vh = 1;
  const fit = () => {
    vw = host.clientWidth;
    vh = host.clientHeight;
    base = wide ? Math.min(vw / 1440, vh / 900) : vw / 640;
  };
  fit();

  const draw = () => {
    const s = cam.z * base;
    const tx = vw / 2 - cam.x * s;
    const ty = vh / 2 - cam.y * s;
    world.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;

    const point = track.getPointAtLength(run.d);
    live.style.strokeDashoffset = total - run.d;
    const onWire = run.d >= stop[2] && run.d <= stop[3];
    const f = clamp((run.d - stop[2]) / (stop[3] - stop[2]));
    const cipher = crypto.ciphertext.slice(0, 25);
    packet.textContent = f < 0.5
      ? morphText(PLAINTEXT, cipher, Math.min(1, f / 0.4))
      : morphText(cipher, PLAINTEXT, Math.max(0, (f - 0.6) / 0.4));
    packet.classList.toggle('is-cipher', f > 0.18 && f < 0.82);
    packet.style.visibility = onWire && f > 0.001 && f < 0.999 ? 'visible' : 'hidden';
    packet.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
    // The dot steps aside when it docks, so the stamped seal and the log can be read.
    const docked = Math.abs(run.d - stop[1]) < 2 || run.d >= total - 1 || run.d < 1;
    token.style.visibility = docked || (onWire && f > 0.001 && f < 0.999) ? 'hidden' : 'visible';
    token.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;

    // The crystal lives at the start of the world, so it scrolls out with the camera.
    const box = host.getBoundingClientRect();
    stage.setRootPose({
      x: box.left + tx + L.root.x * s,
      y: box.top + ty + L.root.y * s,
      r: 112 * s,
      o: 1,
      label: 1,
    });
  };

  // Rows start out under their environment, then fly to their slot in the one log.
  const logRows = qa('.log-row');
  const envOffset = { dev: -240, test: -80, stage: 80, prod: 240 };
  gsap.set(qa('.cert-row'), { autoAlpha: 0, x: -14 });
  gsap.set(q('[data-sig]'), { autoAlpha: 0 });
  gsap.set(q('.seal'), { autoAlpha: 0, scale: 2.4, rotate: -22 });
  gsap.set(qa('.audit-lines path'), { strokeDasharray: 1, strokeDashoffset: 1 });
  logRows.forEach((row) => gsap.set(row, { autoAlpha: 0, x: envOffset[row.dataset.env], y: -190, scale: 0.42 }));
  gsap.set(tag, { autoAlpha: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, paused: true, onUpdate: draw });
  const travel = (toD, camTo, at, duration) => {
    tl.to(run, { d: toD, duration }, at);
    if (camTo) tl.to(cam, { ...camTo, duration }, at);
  };

  tl.to(tag, { autoAlpha: 1, duration: 0.2, ease: 'none' }, 0.75);

  // From the root to the certificate, whose fields fill in as it arrives.
  travel(stop[1], L.certCam, 0.4, 1);
  tl.to(qa('.cert-row'), { autoAlpha: 1, x: 0, duration: 0.2, stagger: 0.08, ease: 'power2.out' }, 0.95);
  tl.to(q('.seal'), { autoAlpha: 1, scale: 1, rotate: -9, duration: 0.12, ease: 'power4.in' }, 1.4);
  tl.to(q('[data-cert]'), { y: 6, duration: 0.05, yoyo: true, repeat: 1, ease: 'none' }, 1.52);
  tl.to(q('[data-sig]'), { autoAlpha: 1, duration: 0.14, ease: 'none' }, 1.56);

  // Across the wire, encrypted in the middle.
  travel(stop[2], L.wireCam, 2.0, 1);
  tl.to(run, { d: stop[3], duration: 0.75, ease: 'none' }, 3.0);

  // Into the access matrix, which drops to least privilege as it arrives.
  travel(stop[4], L.matrixCam, 3.75, 0.95);
  tl.to(qa('.m-cell.drop'), {
    backgroundColor: 'rgba(255,255,255,0.05)',
    scale: 0.42,
    duration: 0.1,
    stagger: { each: 0.018, from: 'random' },
    ease: 'power2.in',
  }, 4.45);
  tl.to(run, { d: stop[5], duration: 0.5, ease: 'none' }, 5.0);

  // Then the log: the flags go on one environment at a time, and everything converges.
  travel(stop[6], L.auditCam, 5.5, 0.9);
  ENVS.forEach((env, i) => {
    const at = 5.95 + i * 0.2;
    tl.to(q(`.env[data-env="${env}"] .flag`), { backgroundColor: 'var(--accent)', duration: 0.05, ease: 'none' }, at);
    tl.to(q(`.env[data-env="${env}"] .flag em`), { x: 18, duration: 0.05, ease: 'none' }, at);
    tl.to(qa('.audit-lines path')[i], { strokeDashoffset: 0, duration: 0.12, ease: 'none' }, at + 0.02);
    tl.to(logRows.filter((r) => r.dataset.env === env), {
      autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.2, stagger: 0.04, ease: 'power3.out',
    }, at + 0.06);
  });

  // Hold on the finished log, then clear the page for the next role.
  tl.to(host, { autoAlpha: 0, duration: 0.3, ease: 'none' }, 7.2);

  const pin = ScrollTrigger.create({
    trigger: section,
    pin: true,
    start: 'top top',
    end: () => `+=${viewHeight() * 6.4}`,
    invalidateOnRefresh: true,
    animation: tl,
    scrub: 0.2,
    onRefresh() { fit(); draw(); },
  });
  gsap.ticker.add(() => {
    if (Math.abs(pin.start - window.scrollY) < viewHeight() * 1.2) draw();
  });
  draw();
  window.addEventListener('resize', () => {
    // The layout direction is chosen once, so crossing it needs a fresh layout.
    if ((window.innerWidth >= 900) !== wide) window.location.reload();
    fit();
    draw();
  });
  return pin;
}
