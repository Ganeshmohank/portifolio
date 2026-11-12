// Vidrona: transmission towers rise, the power lines string between them, and each tower is
// tagged as a managed asset, scrubbed by scroll.

const GROUND = 330;
// Receding into the distance, left to right: x, height, base width.
const TOWERS = [[80, 260, 74], [230, 215, 60], [358, 178, 50], [462, 148, 40]];

function towerParts([x, h, w]) {
  const top = GROUND - h;
  const tw = w * 0.2;
  const legAt = (y, side) => x + side * (tw / 2 + ((y - top) / h) * (w - tw) / 2);
  const levels = 6;
  let d = `M${x - w / 2} ${GROUND}L${x - tw / 2} ${top}M${x + w / 2} ${GROUND}L${x + tw / 2} ${top}`;
  for (let i = 0; i < levels; i++) {
    const y1 = top + (h * i) / levels;
    const y2 = top + (h * (i + 1)) / levels;
    d += `M${legAt(y1, -1)} ${y1}L${legAt(y2, 1)} ${y2}M${legAt(y1, 1)} ${y1}L${legAt(y2, -1)} ${y2}`;
    d += `M${legAt(y2, -1)} ${y2}L${legAt(y2, 1)} ${y2}`;
  }
  // Two cross-arms, braced back to the body, and a peak for the earth wire.
  const arms = [[top + h * 0.1, w * 0.95], [top + h * 0.26, w * 0.75]];
  const tips = [];
  arms.forEach(([y, reach]) => {
    d += `M${x - reach} ${y}L${x + reach} ${y}`;
    d += `M${x - reach} ${y}L${legAt(y + h * 0.07, -1)} ${y + h * 0.07}M${x + reach} ${y}L${legAt(y + h * 0.07, 1)} ${y + h * 0.07}`;
    tips.push([x - reach, y + 6], [x + reach, y + 6]);
  });
  d += `M${x - tw / 2} ${top}L${x} ${top - h * 0.08}L${x + tw / 2} ${top}`;
  return { d, tips, top: top - h * 0.08, x };
}

export function initVidrona({ reduced }) {
  const host = document.querySelector('.grid-art');
  if (!host) return;
  const towers = TOWERS.map(towerParts);
  const spans = [];
  for (let c = 0; c < 4; c++) {
    // A line in from off the page, then one span between each pair of towers.
    const first = towers[0].tips[c];
    spans.push(`M-30 ${first[1] - 20}Q${(first[0] - 30) / 2} ${first[1] + 14} ${first[0]} ${first[1]}`);
    for (let t = 0; t < towers.length - 1; t++) {
      const [ax, ay] = towers[t].tips[c];
      const [bx, by] = towers[t + 1].tips[c];
      spans.push(`M${ax} ${ay}Q${(ax + bx) / 2} ${Math.max(ay, by) + 18} ${bx} ${by}`);
    }
  }
  host.innerHTML = `<svg viewBox="-30 0 560 380" aria-hidden="true">
      <path class="g-ground" d="M-30 ${GROUND}H530"/>
      ${towers.map((t) => `<path class="g-tower" d="${t.d}"/>`).join('')}
      ${spans.map((d) => `<path class="g-line" pathLength="1" d="${d}"/>`).join('')}
      ${towers.map((t, i) => `<g class="g-tag"><circle cx="${t.x}" cy="${t.top - 24}" r="6"/><text x="${t.x + 12}" y="${t.top - 19}">T-0${i + 1}</text></g>`).join('')}
      <g class="g-state"><circle cx="-14" cy="366" r="6"/><text x="0" y="372" data-grid-state>4 towers, 12 spans online</text></g>
    </svg>`;
  if (reduced) return;

  const towerEls = [...host.querySelectorAll('.g-tower')];
  const lines = [...host.querySelectorAll('.g-line')];
  const tags = [...host.querySelectorAll('.g-tag')];
  const state = host.querySelector('.g-state');
  gsap.set(host, { autoAlpha: 0, y: 40 });
  gsap.set(towerEls, { scaleY: 0, transformOrigin: '50% 100%' });
  gsap.set(lines, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(tags, { autoAlpha: 0, y: 8 });
  gsap.set(state, { autoAlpha: 0 });

  const tl = gsap.timeline({
    defaults: { ease: 'power2.out' },
    scrollTrigger: { trigger: host, start: 'top 95%', end: 'center 50%', scrub: 0.6 },
  });
  tl.to(host, { autoAlpha: 1, y: 0, duration: 0.5 }, 0)
    .to(towerEls, { scaleY: 1, duration: 0.6, stagger: 0.15 }, 0.2)
    .to(lines, { strokeDashoffset: 0, duration: 0.8, stagger: 0.02, ease: 'none' }, 0.9)
    .to(tags, { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.12 }, 1.6)
    .to(state, { autoAlpha: 1, duration: 0.2 }, 2.1);
}
