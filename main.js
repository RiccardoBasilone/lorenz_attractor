import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// --- Scene ---
const scene = new THREE.Scene();

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 60;

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// --- Lorenz parameters ---
const sigma = 10;
const rho = 28;
const beta = 8 / 3;
const dt = 0.0001;

// Initial condition
let state = { x: 1, y: 1, z: 1 };

// --- Geometry ---
const maxPoints = 100000;
const positions = new Float32Array(maxPoints * 3);
let drawCount = 0;

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setDrawRange(0, drawCount);

const material = new THREE.LineBasicMaterial({
  color: 0xffd400
});

const line = new THREE.Line(geometry, material);
scene.add(line);

// --- Lorenz step (Euler for now) ---
function stepLorenz(s) {
  const dx = sigma * (s.y - s.x);
  const dy = s.x * (rho - s.z) - s.y;
  const dz = s.x * s.y - beta * s.z;

  return {
    x: s.x + dx * dt,
    y: s.y + dy * dt,
    z: s.z + dz * dt
  };
}

// --- Animation loop ---
function animate() {
  requestAnimationFrame(animate);

  // Integrate a few steps per frame for smoother growth
  for (let i = 0; i < 5; i++) {
    state = stepLorenz(state);

    if (drawCount < maxPoints) {
      positions[3 * drawCount]     = state.x;
      positions[3 * drawCount + 1] = state.y;
      positions[3 * drawCount + 2] = state.z;
      drawCount++;
      geometry.setDrawRange(0, drawCount);
    }
  }

  geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}

animate();

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
