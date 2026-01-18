import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';


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
renderer.setClearColor(0x000000);document.body.appendChild(renderer.domElement);

// --- Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enabled = false; // start in follow mode

let cameraMode = 'follow'; // 'follow' or 'explore'



// --- Lorenz parameters ---
const sigma = 10;
const rho = 28;
const beta = 8 / 3;
const dt = 0.0001; // the smaller this is the better for accuracy, but the more points will be in the buffer

// Initial condition
let state = { x: 1, y: 1, z: 1 };

// --- Geometry ---
const maxPoints = 200000;
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
function updateFollowCamera() {
   const target = new THREE.Vector3(state.x, state.y, state.z);

   // where the camera should be relative to the trajectory
   const offset = new THREE.Vector3(5, 5, 5);

   camera.position.lerp(target.clone().add(offset), 0.02);
   camera.lookAt(target);
}



// --- Time variables ---

// --- Wall-clock time mapping ---
const startTime = new Date('2026-01-18T15:58:00').getTime();

// Lorenz time units per real second (tweak later)
const lorenzRate = 0.1;

let timeSinceLastRenderPoint = 0;
const renderInterval = 0.005; // Lorenz time units (tune this)
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
   timeSinceLastRenderPoint += dt;

      if (timeSinceLastRenderPoint >= renderInterval) {
         timeSinceLastRenderPoint = 0;

         if (drawCount < maxPoints) {
            positions[3 * drawCount]     = state.x;
            positions[3 * drawCount + 1] = state.y;
            positions[3 * drawCount + 2] = state.z;
            drawCount++;
         }
      }

   if (cameraMode === 'follow') {
     updateFollowCamera();
   } else {
     controls.update();
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


const ui = document.createElement('div');
ui.style.position = 'fixed';
ui.style.top = '12px';
ui.style.left = '12px';
ui.style.color = '#ffd400';
ui.style.fontFamily = 'sans-serif';
ui.style.fontSize = '14px';
ui.style.zIndex = '10';

const followBtn = document.createElement('button');
followBtn.textContent = 'follow';
const exploreBtn = document.createElement('button');
exploreBtn.textContent = 'explore';

[followBtn, exploreBtn].forEach(btn => {
  btn.style.marginRight = '8px';
  btn.style.background = 'black';
  btn.style.color = '#ffd400';
  btn.style.border = '1px solid #ffd400';
  btn.style.cursor = 'pointer';
});

ui.appendChild(followBtn);
ui.appendChild(exploreBtn);
document.body.appendChild(ui);

followBtn.onclick = () => {
  cameraMode = 'follow';
  controls.enabled = false;
};

exploreBtn.onclick = () => {
  cameraMode = 'explore';
  controls.enabled = true;

  // zoom out to see the full attractor
  camera.position.set(0, 0, 120);
  controls.target.set(0, 0, 0);
};
