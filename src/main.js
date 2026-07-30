import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { syncLiveWeather } from './liveWeather.js';
import { getMoonPhase } from './liveMoonCycle.js';

// 1. Scene & Camera Setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// 2. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 2.1 Colors & Shadows
renderer.domElement.style.filter = 'saturate(1.45) contrast(1.12) brightness(1.05)';

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.2;

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

// Generate ambient environment lighting for rich color reflections
// const environment = new RoomEnvironment(renderer);
// const pmremGenerator = new THREE.PMREMGenerator(renderer);

// scene.environment = pmremGenerator.fromScene(environment).texture;
// scene.environmentIntensity = 1.2; // Adjust ambient gloss & pop

// 2.2 Sun & Environment Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x445566, 1.8);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 3.5);
sunLight.castShadow = true;

// Set shadow target to building center
sunLight.position.set(-60, 45, 60);
sunLight.target.position.set(1.34, 1.98, 3.17);
scene.add(sunLight.target);

// Expanded shadow box to cover large model
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 300;
sunLight.shadow.bias = -0.0005;
const d = 35;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;

scene.add(sunLight);

// 2.3 Atmosphere (Sky)
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 0.5;       // Clears dark horizon haze
skyUniforms['rayleigh'].value = 0.5;        // Crisp sky blue
skyUniforms['mieCoefficient'].value = 0.001;
skyUniforms['mieDirectionalG'].value = 0.8;

const sunVector = new THREE.Vector3(-60, 45, 60).normalize();
sky.material.uniforms['sunPosition'].value.copy(sunVector);

// 3. Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 4. Web Text Sign
function createTextTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1e1e24';
  ctx.font = 'Bold 90px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const textTexture = createTextTexture('WELCOME TO MY SITE');
const signGeometry = new THREE.PlaneGeometry(4, 2);
const signMaterial = new THREE.MeshStandardMaterial({
  map: textTexture,
  transparent: true,
  roughness: 0.5,
  polygonOffset: true,
  polygonOffsetFactor: -1
});

const signMesh = new THREE.Mesh(signGeometry, signMaterial);
signMesh.position.set(0.5, 3.2, 2.1);
scene.add(signMesh);

// 5. Load Model
const loader = new GLTFLoader();
loader.load('/scene/cinque_terre.glb', (gltf) => {
  const model = gltf.scene;
  model.scale.setScalar(0.1);

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.shadowSide = THREE.DoubleSide;
      }
    }
  });

  scene.add(model);
});

// 6. Checkpoints System
const checkpoints = {
  starting: {
    position: new THREE.Vector3(-72.57, 4.99, 26.86),
    target: new THREE.Vector3(1.34, 1.98, 3.17)
  },
  overview: {
    position: new THREE.Vector3(15, 10, 15),
    target: new THREE.Vector3(0, 0, 0)
  },
  buildingWall: {
    position: new THREE.Vector3(2.5, 4.1, 5.2),
    target: new THREE.Vector3(0, 3.5, 2.0)
  },
  streetView: {
    position: new THREE.Vector3(-6, 2, 8),
    target: new THREE.Vector3(0, 1.5, 0)
  }
};

function goToCheckpoint(checkpointKey) {
  const cp = checkpoints[checkpointKey];
  if (!cp) return;

  camera.position.copy(cp.position);
  controls.target.copy(cp.target);
  controls.update();
}

// Set initial camera view directly
goToCheckpoint("starting");

// night:

const starsCount = 2500;
const starsGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starsCount * 3);

for (let i = 0; i < starsCount; i++) {
  // Distribute stars in a high dome shell around the scene
  const radius = 350 + Math.random() * 150;
  const u = Math.random();
  const v = Math.random();
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos(2.0 * v - 1.0);

  starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  // Keep stars in the upper sky (y > 0)
  starPositions[i * 3 + 1] = Math.abs(radius * Math.sin(phi) * Math.sin(theta)); 
  starPositions[i * 3 + 2] = radius * Math.cos(phi);
}

starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

const starsMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.8,
  transparent: true,
  opacity: 0 // Fades in dynamically at night
});

const starField = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starField);

const moonGeometry = new THREE.SphereGeometry(12, 32, 32);
const moonMaterial = new THREE.MeshStandardMaterial({
  color: 0xe0e6ed,
  roughness: 0.9,
  metalness: 0.1
});
const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
scene.add(moonMesh);

// Dedicated light that illuminates the Moon sphere to create physical phase shading
const moonIlluminator = new THREE.DirectionalLight(0xffffff, 2.5);
scene.add(moonIlluminator);

// 7. Time, Weather, and GUI Systems
import { GUI } from 'lil-gui';

// --- Debug Parameters Object ---
const debugParams = {
  timeOfDay: 14.0, // 2:00 PM default
  useRealTime: false,
  weatherPreset: 'Sunny',
};

// --- Weather Preset Logic ---
function applyWeatherPreset(preset) {
  if (preset === 'Sunny') {
    skyUniforms['turbidity'].value = 0.5;
    skyUniforms['rayleigh'].value = 0.5;
  } else if (preset === 'Overcast') {
    skyUniforms['turbidity'].value = 25;
    skyUniforms['rayleigh'].value = 1;
  } else if (preset === 'Stormy') {
    skyUniforms['turbidity'].value = 50;
    skyUniforms['rayleigh'].value = 0.2;
  } else if (preset === 'Live API') {
    syncLiveWeather(45.44, 12.31, skyUniforms, sunLight);
  }
}

// --- Unified Master Time & Light Controller ---
function updateSunPosition() {
  const now = new Date();
  let hours;

  // Use either live system time or the GUI slider
  if (debugParams.useRealTime) {
    hours = now.getHours() + now.getMinutes() / 60;
  } else {
    hours = debugParams.timeOfDay;
  }

  const elevation = ((hours - 6) / 12) * 180;
  const azimuth = 180;

  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);

  const sunPosition = new THREE.Vector3();
  sunPosition.setFromSphericalCoords(1, phi, theta);

  // Calculate Real Moon Phase & Vector Position
  const phase = getMoonPhase(now);
  const phaseAngle = phase * Math.PI * 2;

  const moonPosition = new THREE.Vector3(
    -sunPosition.x * Math.cos(phaseAngle * 0.1),
    Math.max(0.3, -sunPosition.y), // Keep moon visible above horizon
    -sunPosition.z
  ).normalize();
  
  moonMesh.position.copy(moonPosition.clone().multiplyScalar(200));

  const illumDir = new THREE.Vector3(
    Math.cos(phaseAngle),
    0,
    Math.sin(phaseAngle)
  );
  moonIlluminator.position.copy(moonMesh.position).add(illumDir.multiplyScalar(50));
  moonIlluminator.target = moonMesh;

  // Day vs Night State Logic
  const isNight = sunPosition.y < 0;

  if (isNight) {
    // --- BRIGHT STYLIZED NIGHT ---
    sky.material.uniforms['sunPosition'].value.copy(moonPosition);
    
    skyUniforms['turbidity'].value = 2.0;
    skyUniforms['rayleigh'].value = 0.3;

    // FADE IN STARS
    starsMaterial.opacity = Math.min(1.0, Math.abs(sunPosition.y) * 2.5);
    moonMesh.visible = true;

    // Bright Blue Moonlight
    sunLight.color.setHex(0x8ab4f8);
    sunLight.intensity = 1.6;
    sunLight.position.copy(moonMesh.position);

    // High Ambient Cyan Fill Light
    hemiLight.color.setHex(0x385888);
    hemiLight.groundColor.setHex(0x1a2233);
    hemiLight.intensity = 1.2;

  } else {
    // --- SUNNY DAYTIME ---
    sky.material.uniforms['sunPosition'].value.copy(sunPosition);
    
    // We only reset sky uniforms if we are NOT overriding with a weather preset
    if (debugParams.weatherPreset === 'Sunny') {
        skyUniforms['turbidity'].value = 0.5;
        skyUniforms['rayleigh'].value = 0.5;
    }

    // HIDE STARS & MOON
    starsMaterial.opacity = 0.0;
    moonMesh.visible = false;

    // Warm Golden Sun Light (Fixed stylized angle)
    sunLight.color.setHex(0xfffaed);
    sunLight.intensity = 3.2;
    sunLight.position.set(-40, 60, -30);

    // Warm Day Fill
    hemiLight.color.setHex(0xddeeff);
    hemiLight.groundColor.setHex(0x443322);
    hemiLight.intensity = 0.5;
  }
}

// --- Create the GUI Panel ---
const gui = new GUI({ title: 'Scene Controls' });

gui.add(debugParams, 'timeOfDay', 0, 24, 0.1)
   .name('Time of Day (hrs)')
   .onChange(updateSunPosition);

gui.add(debugParams, 'useRealTime')
   .name('Sync Real Time')
   .onChange(updateSunPosition);

gui.add(debugParams, 'weatherPreset', ['Sunny', 'Overcast', 'Stormy', 'Live API'])
   .name('Weather')
   .onChange((val) => {
       applyWeatherPreset(val);
       updateSunPosition(); // Re-trigger lighting updates
   });

// --- Initialize State ---
updateSunPosition();
applyWeatherPreset(debugParams.weatherPreset);

// --- Key Controls & Resize ---
window.addEventListener('keydown', (e) => {
  if (e.key === '1') goToCheckpoint('overview');
  if (e.key === '2') goToCheckpoint('buildingWall');
  if (e.key === '3') goToCheckpoint('streetView');
  if (e.key.toLowerCase() === 'c') {
    const p = camera.position;
    const t = controls.target;
    console.log(`position: { x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)}, z: ${p.z.toFixed(2)} },`);
    console.log(`target:   { x: ${t.x.toFixed(2)}, y: ${t.y.toFixed(2)}, z: ${t.z.toFixed(2)} }`);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 8. Animation Loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();