// NatWest's vault: it arrives open, with the gold on show. As you scroll, the heavy door swings
// shut on its hinge in 3D, the wheel spins, the bolts throw, and the light goes from OPEN to LOCKED.

const LAYERS = 14;

export function initVault({ reduced }) {
  const vault = document.querySelector('.vault');
  if (!vault) return;
  const door = vault.querySelector('.v-door');
  const slab = vault.querySelector('.v-slab');
  const back = vault.querySelector('.v-back');
  const wheel = vault.querySelector('.v-wheel');
  const bolts = [...vault.querySelectorAll('.v-bolt')];
  const lamp = vault.querySelector('.v-lamp');
  const open = vault.querySelector('.v-open');
  const locked = vault.querySelector('.v-locked');

  // The door's thickness: discs stacked behind the face, shaded darker with depth, so its
  // steel edge shows when it swings. The back plate sits behind the last one.
  slab.innerHTML = Array.from({ length: LAYERS }, () => '<i></i>').join('');
  const discs = [...slab.children];
  const build = () => {
    const thick = door.offsetWidth * 0.11;
    discs.forEach((d, i) => {
      const t = i / (LAYERS - 1);
      const shade = Math.round(196 - t * 70);
      d.style.background = `rgb(${shade} ${shade - 1} ${shade - 8})`;
      d.style.transform = `translateZ(${-1 - t * (thick - 2)}px)`;
    });
    back.style.transform = `translateZ(${-thick}px) rotateY(180deg)`;
  };
  build();
  window.addEventListener('resize', build);

  if (reduced) {
    vault.classList.add('is-static');
    bolts.forEach((b) => b.setAttribute('x', 318));
    return;
  }

  // Open: swung out toward the visitor, past square, bolts drawn in.
  gsap.set(door, { rotationY: -118 });
  gsap.set(bolts, { attr: { x: 290 } });

  // It fades up on arrival, still open.
  gsap.fromTo(vault, { autoAlpha: 0, y: 40 }, {
    autoAlpha: 1,
    y: 0,
    ease: 'none',
    scrollTrigger: { trigger: vault, start: 'top 100%', end: 'top 75%', scrub: 0.4 },
  });

  // The lock runs on its own clock, the instant the door is shut: a thud, the wheel spins,
  // the bolts throw, and the light goes to LOCKED. Opening the door again unlocks it first.
  const lock = gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } });
  lock.to(vault, { x: 3, duration: 0.05, yoyo: true, repeat: 1, ease: 'none' }, 0)
    .to(wheel, { rotation: 300, svgOrigin: '200 200', duration: 0.55 }, 0.05)
    .to(bolts, { attr: { x: 318 }, duration: 0.22, stagger: 0.02, ease: 'power3.out' }, 0.45)
    .to(lamp, { fill: 'var(--accent)', duration: 0.06, ease: 'none' }, 0.72)
    .to(open, { opacity: 0, duration: 0.06, ease: 'none' }, 0.72)
    .to(locked, { opacity: 1, duration: 0.06, ease: 'none' }, 0.72);

  // The door itself swings with the scroll, and is shut a little before the middle of the screen.
  // The lock is keyed to the door as drawn, not the raw scroll, so it fires as it visibly shuts.
  let shut = false;
  gsap.to(door, {
    rotationY: 0,
    ease: 'power2.in',
    onUpdate() {
      const nowShut = this.progress() > 0.995;
      if (nowShut === shut) return;
      shut = nowShut;
      if (shut) lock.timeScale(1).play();
      else lock.timeScale(2.5).reverse();
    },
    scrollTrigger: { trigger: vault, start: 'top 65%', end: 'top 30%', scrub: 0.4 },
  });
}
