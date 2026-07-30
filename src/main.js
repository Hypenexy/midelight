import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

// 1. Scene & Camera Setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(10, 8, 12);

// 2. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 2.1. Vibe settings

scene.background = new THREE.Color('#64c2db'); // Bright Italian coast sky color

// 2.1.1  Colors
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// 2.1.2 Shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

// 2.1.3 Sun
const hemiLight = new THREE.HemisphereLight(0xb1e1ff, 0x665544, 1.2);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfffaed, 2.5); // Warm sun tint
sunLight.position.set(1.34, 1.98, 3.17); // Angle light high from the right
sunLight.castShadow = true;

// 2.1.3.1 Shadow settings
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
const d = 25;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;

scene.add(sunLight);

// 2.1.4 Atmosphere
const sky = new Sky();
sky.scale.setScalar(450000);
scene.add(sky);

const skyUniforms = sky.material.uniforms;
skyUniforms['turbidity'].value = 8;        // Atmosphere haze
skyUniforms['rayleigh'].value = 2;         // Sky blueness
skyUniforms['mieCoefficient'].value = 0.005;
skyUniforms['mieDirectionalG'].value = 0.8;


// 3. Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 4. Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// 5. Helper Function: Create Web Text as a 3D Texture
function createTextTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Text Styling
  ctx.fillStyle = '#1e1e24'; // Text color
  ctx.font = 'Bold 90px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Render text to canvas
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 6. Create 3D Wall Sign Plane
const textTexture = createTextTexture('WELCOME TO MY SITE');
const signGeometry = new THREE.PlaneGeometry(4, 2); // Width, Height in 3D units
const signMaterial = new THREE.MeshStandardMaterial({
  map: textTexture,
  transparent: true,
  roughness: 0.5,
  polygonOffset: true, // Prevents texture flickering against the building wall
  polygonOffsetFactor: -1
});

const signMesh = new THREE.Mesh(signGeometry, signMaterial);

// Positional adjustment (Adjust X, Y, Z to align with your building wall)
signMesh.position.set(0.5, 3.2, 2.1);
signMesh.rotation.y = 0; // Rotate to align flush with the facade
scene.add(signMesh);

// 7. Load GLTF / GLB Model
const loader = new GLTFLoader();
loader.load(
  '/scene/cinque_terre.glb',
  (gltf) => {
    const model = gltf.scene;
    model.scale.setScalar(0.1);

    model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

    scene.add(model);
  },
  (xhr) => {
    // Use later for a loading gui?
    // console.log(`Loading model: ${((xhr.loaded / xhr.total) * 100).toFixed(0)}%`);
  },
  (error) => {
    // console.error('Error loading model:', error);
  }
);

// 8. Handle Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});



// Press 'C' while viewing to log current camera position and target to console
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'c') {
    const p = camera.position;
    const t = controls.target;
    console.log(`%c--- CAMERA CHECKPOINT ---`, 'color: #3b82f6; font-weight: bold;');
    console.log(`position: { x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)}, z: ${p.z.toFixed(2)} },`);
    console.log(`target:   { x: ${t.x.toFixed(2)}, y: ${t.y.toFixed(2)}, z: ${t.z.toFixed(2)} }`);
  }
});


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

// 2. Helper function to fly the camera to a checkpoint
function goToCheckpoint(checkpointKey) {
  const cp = checkpoints[checkpointKey];
  if (!cp) return;

  // Jump camera position and focus target
  camera.position.copy(cp.position);
  controls.target.copy(cp.target);
  controls.update();
}

// 3. Optional: Bind number keys (1, 2, 3) to switch views instantly
window.addEventListener('keydown', (e) => {
  if (e.key === '1') goToCheckpoint('overview');
  if (e.key === '2') goToCheckpoint('buildingWall');
  if (e.key === '3') goToCheckpoint('streetView');
});

document.addEventListener("DOMContentLoaded", () => {
  goToCheckpoint("starting");
})

function updateSunToLocalTime() {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60; // e.g. 14.5 = 2:30 PM

  // Convert time to solar angle (6 AM = sunrise, 12 PM = zenith, 6 PM = sunset)
  const elevation = ((hours - 6) / 12) * 180; // 0° at 6 AM, 90° at noon, 180° at 6 PM
  const azimuth = 180; // Facing south

  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);

  const sunPosition = new THREE.Vector3();
  sunPosition.setFromSphericalCoords(1, phi, theta);

  // Sync Sky shader & Directional light position
  sky.material.uniforms['sunPosition'].value.copy(sunPosition);
  
  // Position light far out along the sun's vector relative to building center
  sunLight.position.set(
    1.34 + sunPosition.x * 150,
    1.98 + sunPosition.y * 150,
    3.17 + sunPosition.z * 150
  );

  // Adjust brightness for day vs night
  if (sunPosition.y < 0) {
    // Night
    sunLight.intensity = 0.1;
    ambientLight.intensity = 0.2;
  } else {
    // Day
    sunLight.intensity = Math.max(0.5, sunPosition.y * 3.0);
    ambientLight.intensity = 0.8;
  }
}

// Initial sun position update
updateSunToLocalTime();


// 9. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();