// The Cybersecurity scene: one continuous world the camera travels through, following a single
// route from the Root CA past each thing I work on. It's one scrubbed timeline in crisp DOM and
// SVG, so it plays exactly backwards when scrolling up.

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
const ALERTS = [
  ['Certificate expires in 7 days', 'payments.prod', 'now', 'warn'],
  ['Certificate renewed', 'api-gateway', '2m', 'ok'],
  ['Issuance denied', 'ci-runner', '5m', 'bad'],
];
// What the satellite finds as it passes overhead, in two rows of three.
const SERVICES = ['payments', 'api-gateway', 'ci-runner', 'ai-agent', 'database', 'k8s-ingress'];
const CHIP_X = [109, 318, 527];
const ISSUING = ['Issuing CA, prod', 'Issuing CA, dev'];
const LEAVES = ['payments', 'api-gateway', 'ci-runner', 'ai-agent'];

const clamp = (v) => Math.max(0, Math.min(1, v));

/** A point on the satellite's orbit, a quadratic arc across the sky. */
function orbit(t) {
  const u = 1 - t;
  return { x: u * u * 40 + 2 * u * t * 320 + t * t * 600, y: u * u * 190 + 2 * u * t * -30 + t * t * 190 };
}

function buildWorld() {
  const header = `<div class="m-row m-head"><span></span>${ACTIONS.map((a) => `<span>${a}</span>`).join('')}</div>`;
  const matrix = ROLES.map((role) => `<div class="m-row" data-role="${role}"><b>${role}</b>${ACTIONS.map((action) => `<i class="m-cell ${KEPT[role].includes(action) ? 'keep' : 'drop'}"></i>`).join('')}</div>`).join('');
  const envs = ENVS.map((e) => `<div class="env" data-env="${e}"><span>${e}</span><i class="flag"><em></em></i></div>`).join('');
  const rowsHtml = LOG.map(([env, who, what, result]) => `<div class="log-row ${result}" data-env="${env}"><span>${env}</span><b>${who}</b><span>${what}</span><em>${result}</em></div>`).join('');
  const alerts = ALERTS.map(([title, who, when, kind]) => `<div class="alert ${kind}"><i></i><div><b>${title}</b><span>${who}</span></div><em>${when}</em></div>`).join('');
  const chips = SERVICES.map((s, i) => `<div class="vs-chip" data-x="${CHIP_X[i % 3]}" style="left:${CHIP_X[i % 3] - 95}px;top:${i < 3 ? 330 : 400}px"><i></i>${s}</div>`).join('');
  const sat = `<g class="sat" data-sat>
      <rect x="-34" y="-9" width="22" height="18"/><rect x="12" y="-9" width="22" height="18"/>
      <rect class="sat-body" x="-11" y="-13" width="22" height="26"/>
      <path d="M0 13v8"/>
    </g>`;
  const issuing = ISSUING.map((name, i) => `<div class="ca ca-mid" style="left:${60 + i * 300}px;top:160px"><b>${name}</b></div>`).join('');
  const leaves = LEAVES.map((name, i) => `<div class="ca-leaf" style="left:${10 + i * 160}px;top:330px"><span>X.509</span><b>${name}</b></div>`).join('');
  const tree = [
    'M320 70V115H170V160', 'M320 115H470V160',
    'M170 218V275H75V330', 'M170 275H235V330', 'M470 218V275H405V330', 'M470 275H565V330',
  ].map((d) => `<path pathLength="1" d="${d}"/>`).join('');
  return `
    <svg class="route" aria-hidden="true"><path class="route-track"/><path class="route-live"/></svg>
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
    <div class="cy-note" data-note="notify"><h3>Notifications</h3><p>I work on notifications for certificate events.</p></div>
    <div class="alerts" data-alerts>${alerts}</div>
    <div class="cy-note" data-note="vsat"><h3>VSat</h3><p>I work on VSat, a satellite that discovers certificates on-prem.</p></div>
    <div class="vsat" data-vsat>
      <svg class="vsat-sky" viewBox="0 0 640 520" aria-hidden="true">
        <path class="orbit" d="M40 190Q320 -30 600 190"/>
        <polygon class="beam" data-beam points="0,0 0,0 0,0 0,0"/>
        ${sat}
      </svg>
      ${chips}
      <p class="vsat-count" data-count>0 of ${SERVICES.length} certificates found</p>
    </div>
    <div class="cy-note" data-note="pca"><h3>Private CA</h3><p>I work on Private CA, certificates issued from your own root.</p></div>
    <div class="pca" data-pca>
      <svg class="pca-lines" viewBox="0 0 640 500" aria-hidden="true">${tree}</svg>
      <div class="ca ca-root" style="left:190px;top:0"><b>Private root CA</b></div>
      ${issuing}
      ${leaves}
    </div>
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
      matrix: { x: 1220, y: 270 }, matrixNote: { x: 1220, y: 90 }, matrixCam: { x: 1540, y: 420, z: 1.2 },
      audit: { x: 2200, y: 500 }, auditNote: { x: 2200, y: 310 }, auditCam: { x: 2520, y: 720, z: 0.96 },
      notify: { x: 3340, y: 380 }, notifyNote: { x: 3340, y: 190 }, notifyCam: { x: 3620, y: 450, z: 1.15 },
      vsat: { x: 4160, y: 300 }, vsatNote: { x: 4160, y: 110 }, vsatCam: { x: 4480, y: 470, z: 1 },
      pca: { x: 5180, y: 330 }, pcaNote: { x: 5180, y: 140 }, pcaCam: { x: 5500, y: 490, z: 1 },
    }
    : {
      root: { x: 320, y: 150 }, head: { x: 20, y: 640 }, start: { x: 320, y: 520, z: 1 },
      matrix: { x: 10, y: 1800 }, matrixNote: { x: 40, y: 1490 }, matrixCam: { x: 320, y: 1870, z: 1 },
      audit: { x: 0, y: 3000 }, auditNote: { x: 40, y: 2700 }, auditCam: { x: 320, y: 3250, z: 0.92 },
      notify: { x: 40, y: 4300 }, notifyNote: { x: 40, y: 4020 }, notifyCam: { x: 320, y: 4330, z: 1 },
      vsat: { x: 0, y: 5400 }, vsatNote: { x: 40, y: 5120 }, vsatCam: { x: 320, y: 5520, z: 1 },
      pca: { x: 0, y: 6620 }, pcaNote: { x: 40, y: 6340 }, pcaCam: { x: 320, y: 6720, z: 1 },
    };

  place(head, L.head.x, L.head.y);
  place(q('[data-note="matrix"]'), L.matrixNote.x, L.matrixNote.y);
  place(q('[data-matrix]'), L.matrix.x, L.matrix.y);
  place(q('[data-note="audit"]'), L.auditNote.x, L.auditNote.y);
  place(q('[data-audit]'), L.audit.x, L.audit.y);
  place(q('[data-note="notify"]'), L.notifyNote.x, L.notifyNote.y);
  place(q('[data-alerts]'), L.notify.x, L.notify.y);
  place(q('[data-note="vsat"]'), L.vsatNote.x, L.vsatNote.y);
  place(q('[data-vsat]'), L.vsat.x, L.vsat.y);
  place(q('[data-note="pca"]'), L.pcaNote.x, L.pcaNote.y);
  place(q('[data-pca]'), L.pca.x, L.pca.y);

  // The route, leg by leg. Each stop is measured from the real layout.
  const paymentsRow = q('.m-row[data-role="payments"]');
  const rowY = L.matrix.y + paymentsRow.offsetTop + paymentsRow.offsetHeight / 2;
  const ledger = q('.cy-ledger');
  const firstAlert = q('.alert');
  const alertY = L.notify.y + firstAlert.offsetTop + firstAlert.offsetHeight / 2;
  const groundY = L.vsat.y + 490;
  const P = [
    L.root,
    { x: L.matrix.x + 10, y: rowY },
    { x: L.matrix.x + q('[data-matrix]').offsetWidth + 20, y: rowY },
    { x: L.audit.x + ledger.offsetLeft, y: L.audit.y + ledger.offsetTop + 34 },
    { x: L.notify.x - 10, y: alertY },
    { x: L.notify.x + q('[data-alerts]').offsetWidth + 20, y: alertY },
    { x: L.vsat.x + 14, y: groundY },
    { x: L.vsat.x + 626, y: groundY },
    { x: L.pca.x + 190, y: L.pca.y + 35 },
  ];
  // Straight legs run through a station; curved ones travel between them.
  const straight = new Set([2, 5, 7]);
  const curve = (a, b) => (wide
    ? `C${(a.x + b.x) / 2} ${a.y} ${(a.x + b.x) / 2} ${b.y} ${b.x} ${b.y}`
    : `C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`);
  const seg = (i) => (straight.has(i) ? `L${P[i].x} ${P[i].y}` : curve(P[i - 1], P[i]));
  const route = q('.route');
  const measure = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  route.append(measure);
  const stop = [0];
  for (let i = 1; i < P.length; i++) {
    measure.setAttribute('d', `M${P[i - 1].x} ${P[i - 1].y}${seg(i)}`);
    stop.push(stop[i - 1] + measure.getTotalLength());
  }
  measure.remove();
  const whole = `M${P[0].x} ${P[0].y}${P.slice(1).map((_, i) => seg(i + 1)).join('')}`;
  const track = q('.route-track');
  const live = q('.route-live');
  track.setAttribute('d', whole);
  live.setAttribute('d', whole);
  const total = track.getTotalLength();
  live.style.strokeDasharray = total;

  const token = q('[data-token]');
  const satEl = q('[data-sat]');
  const beam = q('[data-beam]');
  const chips = qa('.vs-chip');
  const count = q('[data-count]');

  // Everything visible is computed from these values, so reversing is exact.
  const cam = { x: L.start.x, y: L.start.y, z: L.start.z };
  const run = { d: 0 };
  const scan = { p: 0 };
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
    const docked = run.d >= total - 1 || run.d < 1;
    token.style.visibility = docked ? 'hidden' : 'visible';
    token.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;

    // The satellite sweeps the sky, and lights up each service its beam passes over.
    const sat = orbit(scan.p);
    satEl.setAttribute('transform', `translate(${sat.x} ${sat.y})`);
    beam.setAttribute('points', `${sat.x - 8},${sat.y + 20} ${sat.x + 8},${sat.y + 20} ${sat.x + 80},322 ${sat.x - 80},322`);
    beam.style.opacity = scan.p > 0.001 && scan.p < 0.999 ? 1 : 0;
    let found = 0;
    chips.forEach((chip) => {
      const on = scan.p > 0.001 && sat.x >= Number(chip.dataset.x);
      chip.classList.toggle('found', on);
      if (on) found += 1;
    });
    count.textContent = `${found} of ${SERVICES.length} certificates found`;

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
  gsap.set(qa('.audit-lines path'), { strokeDasharray: 1, strokeDashoffset: 1 });
  logRows.forEach((row) => gsap.set(row, { autoAlpha: 0, x: envOffset[row.dataset.env], y: -190, scale: 0.42 }));
  gsap.set(qa('.alert'), { autoAlpha: 0, y: -36 });
  gsap.set(qa('.pca-lines path'), { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(qa('.ca-mid, .ca-leaf'), { autoAlpha: 0, y: -14 });
  gsap.set(tag, { autoAlpha: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, paused: true, onUpdate: draw });
  const travel = (toD, camTo, at, duration) => {
    tl.to(run, { d: toD, duration }, at);
    if (camTo) tl.to(cam, { ...camTo, duration }, at);
  };

  tl.to(tag, { autoAlpha: 1, duration: 0.2, ease: 'none' }, 0.75);

  // Into the access matrix, which drops to least privilege as it arrives.
  travel(stop[1], L.matrixCam, 0.4, 1.1);
  tl.to(qa('.m-cell.drop'), {
    backgroundColor: 'rgba(255,255,255,0.05)',
    scale: 0.42,
    duration: 0.1,
    stagger: { each: 0.018, from: 'random' },
    ease: 'power2.in',
  }, 1.3);
  tl.to(run, { d: stop[2], duration: 0.5, ease: 'none' }, 1.8);

  // The log: the flags go on one environment at a time, and everything converges.
  travel(stop[3], L.auditCam, 2.3, 0.9);
  ENVS.forEach((env, i) => {
    const at = 2.75 + i * 0.2;
    tl.to(q(`.env[data-env="${env}"] .flag`), { backgroundColor: 'var(--accent)', duration: 0.05, ease: 'none' }, at);
    tl.to(q(`.env[data-env="${env}"] .flag em`), { x: 18, duration: 0.05, ease: 'none' }, at);
    tl.to(qa('.audit-lines path')[i], { strokeDashoffset: 0, duration: 0.12, ease: 'none' }, at + 0.02);
    tl.to(logRows.filter((r) => r.dataset.env === env), {
      autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.2, stagger: 0.04, ease: 'power3.out',
    }, at + 0.06);
  });

  // Notifications drop in, newest on top.
  travel(stop[4], L.notifyCam, 4.0, 0.9);
  tl.to(qa('.alert'), { autoAlpha: 1, y: 0, duration: 0.18, stagger: 0.12, ease: 'power3.out' }, 4.55);
  tl.to(run, { d: stop[5], duration: 0.4, ease: 'none' }, 5.0);

  // The satellite passes over, and the route keeps pace with it along the ground.
  travel(stop[6], L.vsatCam, 5.4, 0.9);
  tl.to(scan, { p: 1, duration: 1, ease: 'none' }, 6.3);
  tl.to(run, { d: stop[7], duration: 1, ease: 'none' }, 6.3);

  // The private CA: the root, then its issuing CAs, then the certificates they issue.
  travel(stop[8], L.pcaCam, 7.3, 0.9);
  const lines = qa('.pca-lines path');
  tl.to(lines.slice(0, 2), { strokeDashoffset: 0, duration: 0.15, ease: 'none' }, 8.15);
  tl.to(qa('.ca-mid'), { autoAlpha: 1, y: 0, duration: 0.15, stagger: 0.06, ease: 'power3.out' }, 8.28);
  tl.to(lines.slice(2), { strokeDashoffset: 0, duration: 0.15, ease: 'none' }, 8.45);
  tl.to(qa('.ca-leaf'), { autoAlpha: 1, y: 0, duration: 0.15, stagger: 0.06, ease: 'power3.out' }, 8.58);

  // Hold on the finished tree, then clear the page for the next role.
  tl.to(host, { autoAlpha: 0, duration: 0.3, ease: 'none' }, 9.3);

  const pin = ScrollTrigger.create({
    trigger: section,
    pin: true,
    start: 'top top',
    end: () => `+=${viewHeight() * 8.2}`,
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
