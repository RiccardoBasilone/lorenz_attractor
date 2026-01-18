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
controls.enableRotate = true;
controls.enablePan = true;
controls.enableZoom = true;

// Constrain zoom
controls.minDistance = 1;
controls.maxDistance = 200;



// // Constrain vertical rotation (prevents camera flipping)
// controls.maxPolarAngle = Math.PI / 2; // 90 degrees
// controls.minPolarAngle = 0;           // ground level
// controls.enabled = false;             // follow mode default


let cameraMode = 'follow'; // 'follow' or 'explore'

// --- Lorenz parameters ---
const sigma = 10;
const rho = 28;
const beta = 8 / 3;
const dt = 0.0001; // the smaller this is the better for accuracy, but the more points will be in the buffer

// Initial condition
let state = { x: 1, y: 1, z: 1 };

// --- Line Geometry ---
const maxPoints = 2000000;
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

// --- Current point marker ---

const currentPointGeometry = new THREE.SphereGeometry(0.2, 16, 16);
const currentPointMaterial = new THREE.MeshStandardMaterial({
  color: 0xff3333
});
currentPointMaterial.emissive = new THREE.Color(0xff3333);
currentPointMaterial.emissiveIntensity = 1;
// Add a light to make the emissive material visible
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(10, 10, 10);
scene.add(light);

const currentPoint = new THREE.Mesh(
  currentPointGeometry,
  currentPointMaterial
  
);

scene.add(currentPoint);


function updateFollowCamera() {
  if (cameraMode !== 'follow') return;

  const targetPos = new THREE.Vector3(state.x, state.y, state.z);
  const offset = new THREE.Vector3(2, 1, 2);
  const desiredPosition = targetPos.clone().add(offset);

  const cameraAlpha = 0.02;
  const cameraSubsteps = 20;

  for (let i = 0; i < cameraSubsteps; i++) {
    camera.position.lerp(desiredPosition, cameraAlpha);
    controls.target.lerp(targetPos, cameraAlpha);
  }

  camera.lookAt(controls.target);
}


controls.zoomSpeed = 1.2;  // adjust sensitivity



// --- Time variables ---
// --- Wall-clock time mapping ---
const startTime = new Date('2025-10-18T18:19:00').getTime();

// Lorenz time units per real second (tweak later)
const lorenzRate = 0.000025;
let timeSinceLastRenderPoint = 0;
const renderInterval = 0.0001; // Lorenz time units (tune this)
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

function lorenzLoop() {
  const now = Date.now();
  const elapsedSeconds = (now - startTime) / 1000;
  const targetLorenzTime = elapsedSeconds * lorenzRate;

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
  }

  // Update current point ONCE per Lorenz batch
  currentPoint.position.set(state.x, state.y, state.z);

  geometry.setDrawRange(0, drawCount);
  geometry.attributes.position.needsUpdate = true;

  // Schedule next Lorenz update
  setTimeout(lorenzLoop, 200); // <-- tune (e.g. 100–500 ms)
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
function renderLoop() {
  requestAnimationFrame(renderLoop);

  if (cameraMode === 'follow') {
    updateFollowCamera();
  } else {
    controls.update();
  }

  renderer.render(scene, camera);
}


catchUpToNow();
renderLoop();
lorenzLoop();


// --- Resize handling ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- UI ---
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
  camera.position.set(0, 0, 80);
  controls.target.set(0, 0, 0);
};

[followBtn, exploreBtn].forEach(btn => {
  btn.style.marginRight = '8px';
  btn.style.background = 'rgba(0,0,0,0.5)';
  btn.style.color = '#ffd400';
  btn.style.border = '1px solid #ffd400';
  btn.style.borderRadius = '4px';
  btn.style.padding = '4px 8px';
  btn.style.fontFamily = 'sans-serif';
  btn.style.fontSize = '13px';
  btn.style.cursor = 'pointer';
  btn.style.transition = '0.2s';
});

[followBtn, exploreBtn].forEach(btn => {
  btn.addEventListener('mouseover', () => btn.style.background = 'rgba(255, 212, 0, 0.1)');
  btn.addEventListener('mouseout', () => btn.style.background = 'rgba(0,0,0,0.5)');
});

