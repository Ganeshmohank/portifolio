// The Root CA: the crystal that opens the page and leads the Cybersecurity section.
import * as THREE from 'three';

function labelTexture(text) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.font = '800 58px "Anybody", "Hanken Grotesk", Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createIdentity({ glow }) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const core = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0x7a7e8a, metalness: 1, roughness: 0.24, flatShading: true, transparent: true, emissive: 0x20222a,
  }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  edges.scale.setScalar(1.002);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(3.6, 3.6, 1);
  const rings = [[1.42, 0.012], [1.72, 0.008]].map(([r, tube]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 96), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(ring);
    return ring;
  });
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture('ROOT CA'), transparent: true, opacity: 0, depthWrite: false, depthTest: false }));
  label.scale.set(1.3, 0.244, 1);
  label.position.y = -2;
  group.add(core, edges, halo, label);

  function setColors(rgbList) {
    const colors = rgbList.map((c) => new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace));
    edges.material.color.copy(colors[0]);
    halo.material.color.copy(colors[0]);
    label.material.color.copy(colors[0]);
    rings.forEach((r, i) => r.material.color.copy(colors[i + 1]));
  }

  function update({ time, visibility, labelOpacity = 0 }) {
    group.visible = visibility > 0.004;
    if (!group.visible) return;
    core.material.opacity = visibility;
    edges.material.opacity = visibility;
    halo.material.opacity = 0.32 * visibility;
    rings.forEach((r) => { r.material.opacity = 0.85 * visibility; });
    label.material.opacity = labelOpacity * visibility;
    core.rotation.set(time * 0.11, time * 0.17, 0);
    edges.rotation.copy(core.rotation);
    rings[0].rotation.set(1.2 + Math.sin(time * 0.2) * 0.15, time * 0.28, 0);
    rings[1].rotation.set(1.9, -time * 0.2, 0.5);
  }

  return { group, update, setColors };
}
