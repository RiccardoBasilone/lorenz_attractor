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

// --- Time variables ---

// --- Wall-clock time mapping ---
const startTime = new Date('2026-01-17T12:20:00').getTime();

// Lorenz time units per real second (tweak later)
const lorenzRate = 0.00005;

let timeSinceLastRenderPoint = 0;
const renderInterval = 0.05; // Lorenz time units (tune this)
let simulatedTime = 0;



// --- Lorenz step ---
function lorenzDeriv(s) {
  return {
    x: sigma * (s.y - s.x),
    y: s.x * (rho - s.z) - s.y,
    z: s.x * s.y - beta * s.z
  };
}

function stepLorenzRK4(s) {
  const k1 = lorenzDeriv(s);

  const k2 = lorenzDeriv({
    x: s.x + 0.5 * dt * k1.x,
    y: s.y + 0.5 * dt * k1.y,
    z: s.z + 0.5 * dt * k1.z
  });

  const k3 = lorenzDeriv({
    x: s.x + 0.5 * dt * k2.x,
    y: s.y + 0.5 * dt * k2.y,
    z: s.z + 0.5 * dt * k2.z
  });

  const k4 = lorenzDeriv({
    x: s.x + dt * k3.x,
    y: s.y + dt * k3.y,
    z: s.z + dt * k3.z
  });

  return {
    x: s.x + (dt / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
    y: s.y + (dt / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
    z: s.z + (dt / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z)
  };
}

// --- Catch up to current time before resuming slow animation---
function catchUpToNow() {
  const now = Date.now();
  const elapsedSeconds = (now - startTime) / 1000;
  const targetLorenzTime = elapsedSeconds * lorenzRate;

  const stepsNeeded = Math.floor(
    (targetLorenzTime - simulatedTime) / dt
  );

  for (let i = 0; i < stepsNeeded; i++) {
    state = stepLorenzRK4(state);
    simulatedTime += dt;

    if (drawCount < maxPoints) {
      positions[3 * drawCount]     = state.x;
      positions[3 * drawCount + 1] = state.y;
      positions[3 * drawCount + 2] = state.z;
      drawCount++;
    }
  }

  geometry.setDrawRange(0, drawCount);
  geometry.attributes.position.needsUpdate = true;
}





// --- Animation loop ---
function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();
  const elapsedSeconds = (now - startTime) / 1000;
  const targetLorenzTime = elapsedSeconds * lorenzRate;

  // Advance the system until we catch up to wall-clock time
  while (simulatedTime < targetLorenzTime) {
    state = stepLorenzRK4(state);
    simulatedTime += dt;

    if (drawCount < maxPoints) {
      positions[3 * drawCount]     = state.x;
      positions[3 * drawCount + 1] = state.y;
      positions[3 * drawCount + 2] = state.z;
      drawCount++;
    } else {
      // stop adding points if buffer is full
      break;
    }
  }

  geometry.setDrawRange(0, drawCount);
  geometry.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}


catchUpToNow();
animate();

// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
