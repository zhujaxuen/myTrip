import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TRIP, ROUTE_STYLES } from "./data.js";

// ============================================================
// Configuração básica
// ============================================================

const GLOBE_RADIUS = 2;

document.getElementById("trip-title").textContent = TRIP.title;
document.getElementById("trip-subtitle").textContent = TRIP.subtitle;

const canvas = document.getElementById("globe-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.35, 8.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 12;
controls.rotateSpeed = 0.45;

if (window.innerWidth <= 720) {
  camera.position.set(0, 0.6, 10.8);
  controls.target.set(0, -0.7, 0);
  controls.update();
}

// Luzes
scene.add(new THREE.AmbientLight(0xffffff, 0.65));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.1);
sun.position.set(5, 3, 5);
scene.add(sun);

// ============================================================
// Estrelas de fundo
// ============================================================

function buildStarfield() {
  const count = 2200;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 40 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xf2efe6,
    size: 0.045,
    transparent: true,
    opacity: 0.55,
  });
  scene.add(new THREE.Points(geo, mat));
}
buildStarfield();

// ============================================================
// Globo
// ============================================================

const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load(
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-blue-marble.jpg"
);
const earthBumpMap = textureLoader.load(
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-topology.png"
);

const globeGroup = new THREE.Group();
scene.add(globeGroup);

let isAutoRotating = false;
const rotationToggle = document.getElementById("rotation-toggle");

rotationToggle.addEventListener("click", () => {
  isAutoRotating = !isAutoRotating;
  rotationToggle.setAttribute("aria-pressed", String(isAutoRotating));
  rotationToggle.textContent = isAutoRotating ? "Parar giro" : "Iniciar giro";
});

const globe = new THREE.Mesh(
  new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96),
  new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: earthBumpMap,
    bumpScale: 0.035,
    shininess: 6,
  })
);
globeGroup.add(globe);

// Brilho atmosférico (halo) usando shader simples de Fresnel
const atmosphereMat = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.BackSide,
  uniforms: {
    glowColor: { value: new THREE.Color(0xc9a24b) },
  },
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    uniform vec3 glowColor;
    void main() {
      float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      gl_FragColor = vec4(glowColor, intensity * 0.75);
    }
  `,
});
const atmosphere = new THREE.Mesh(
  new THREE.SphereGeometry(GLOBE_RADIUS * 1.06, 64, 64),
  atmosphereMat
);
scene.add(atmosphere);

// ============================================================
// Utilidades de posicionamento
// ============================================================

function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ============================================================
// Marcadores dos locais
// ============================================================

const markerObjects = []; // { mesh, stop }

function createCityLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.font = '600 26px "Manrope", sans-serif';
  const textWidth = context.measureText(text).width;

  context.fillStyle = "rgba(10, 14, 26, 0.84)";
  context.strokeStyle = "rgba(201, 162, 75, 0.75)";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(4, 6, textWidth + 24, 48, 8);
  context.fill();
  context.stroke();

  context.fillStyle = "#edeae2";
  context.textBaseline = "middle";
  context.fillText(text, 16, 31);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((textWidth + 24) / 120, 0.3, 1);
  sprite.position.set(0, 0, 0.13);
  return sprite;
}

function buildMarkers() {
  TRIP.stops.forEach((stop) => {
    const pos = latLonToVector3(stop.lat, stop.lon, GLOBE_RADIUS);
    let label = null;

    const markerGroup = new THREE.Group();
    markerGroup.position.copy(pos);
    markerGroup.lookAt(pos.clone().multiplyScalar(2));

    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xc1432e })
    );
    markerGroup.add(dot);

    const ringGeo = new THREE.RingGeometry(0.038, 0.05, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc1432e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.z = 0.001;
    markerGroup.add(ring);

    if (stop.showLabel !== false) {
      label = createCityLabel(stop.name);
      markerGroup.add(label);
    }

    globeGroup.add(markerGroup);
    markerObjects.push({ group: markerGroup, dot, ring, label, stop });
  });
}
buildMarkers();

// ============================================================
// Rotas (arcos entre pontos)
// ============================================================

const routeObjects = []; // { line, type }

function buildRoutes() {
  const stopsById = Object.fromEntries(TRIP.stops.map((s) => [s.id, s]));

  TRIP.routes.forEach((route) => {
    const from = stopsById[route.from];
    const to = stopsById[route.to];
    if (!from || !to) return;

    const start = latLonToVector3(from.lat, from.lon, GLOBE_RADIUS);
    const end = latLonToVector3(to.lat, to.lon, GLOBE_RADIUS);

    const distance = start.distanceTo(end);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(GLOBE_RADIUS + distance * 0.45);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(64);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const style = ROUTE_STYLES[route.type] || ROUTE_STYLES.voo;
    const material = new THREE.LineBasicMaterial({
      color: style.color,
      transparent: true,
      opacity: 0.85,
    });

    const line = new THREE.Line(geometry, material);
    globeGroup.add(line);
    routeObjects.push({ line, type: route.type });
  });
}
buildRoutes();

// ============================================================
// Legenda (filtro por tipo de trajeto)
// ============================================================

function buildLegend() {
  const legend = document.getElementById("legend");
  const usedTypes = [...new Set(TRIP.routes.map((r) => r.type))];

  usedTypes.forEach((type) => {
    const style = ROUTE_STYLES[type] || ROUTE_STYLES.voo;
    const btn = document.createElement("button");
    const hex = "#" + style.color.toString(16).padStart(6, "0");
    btn.innerHTML = `<span class="dot" style="background:${hex}"></span>${style.label}`;
    btn.dataset.type = type;

    btn.addEventListener("click", () => {
      btn.classList.toggle("off");
      const visible = !btn.classList.contains("off");
      routeObjects
        .filter((r) => r.type === type)
        .forEach((r) => (r.line.visible = visible));
    });

    legend.appendChild(btn);
  });
}
buildLegend();

// ============================================================
// Painel lateral (linha do tempo)
// ============================================================

let activeStopId = null;

function buildTimeline() {
  const timeline = document.getElementById("timeline");

  TRIP.stops.forEach((stop) => {
    const el = document.createElement("div");
    el.className = "stop";
    el.dataset.id = stop.id;
    el.innerHTML = `
      <div class="date">${stop.date}</div>
      <h3>${stop.name}</h3>
      <div class="tag">${stop.tag}</div>
      <p>${stop.description}</p>
    `;
    el.addEventListener("click", () => selectStop(stop.id, true));
    timeline.appendChild(el);
  });
}
buildTimeline();

function selectStop(id, flyTo) {
  activeStopId = id;

  document.querySelectorAll(".stop").forEach((el) => {
    el.classList.toggle("active", el.dataset.id === id);
  });

  const marker = markerObjects.find((m) => m.stop.id === id);
  if (marker && flyTo) {
    const target = marker.group.position.clone().normalize().multiplyScalar(4.6);
    animateCamera(target);
  }
}

function animateCamera(targetPos) {
  const startPos = camera.position.clone();
  const startTime = performance.now();
  const duration = 900;

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(startPos, targetPos, eased);
    controls.update();
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ============================================================
// Interação: clicar num marcador do globo
// ============================================================

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const floatingCard = document.getElementById("floating-card");
const fcName = document.getElementById("fc-name");
const fcDate = document.getElementById("fc-date");

function onPointerMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const dots = markerObjects.map((m) => m.dot);
  const hits = raycaster.intersectObjects(dots);

  if (hits.length > 0) {
    const hit = markerObjects.find((m) => m.dot === hits[0].object);
    document.body.style.cursor = "pointer";
    fcName.textContent = hit.stop.name;
    fcDate.textContent = hit.stop.date;
    floatingCard.style.left = event.clientX + 16 + "px";
    floatingCard.style.top = event.clientY - 10 + "px";
    floatingCard.classList.add("visible");
  } else {
    document.body.style.cursor = "default";
    floatingCard.classList.remove("visible");
  }
}

function onClick(event) {
  raycaster.setFromCamera(pointer, camera);
  const dots = markerObjects.map((m) => m.dot);
  const hits = raycaster.intersectObjects(dots);
  if (hits.length > 0) {
    const hit = markerObjects.find((m) => m.dot === hits[0].object);
    selectStop(hit.stop.id, false);
    document.querySelector(`.stop[data-id="${hit.stop.id}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

window.addEventListener("pointermove", onPointerMove);
window.addEventListener("click", onClick);

// ============================================================
// Loop de animação
// ============================================================

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  if (isAutoRotating) {
    globeGroup.rotation.y += 0.0009;
  }

  markerObjects.forEach((m, i) => {
    const pulse = 1 + Math.sin(elapsed * 2.4 + i) * 0.18;
    m.ring.scale.setScalar(pulse);

  });

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ============================================================
// Responsividade
// ============================================================

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Seleciona a primeira parada por padrão
if (TRIP.stops.length > 0) {
  selectStop(TRIP.stops[0].id, false);
}
