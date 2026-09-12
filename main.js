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
  controls.target.set(0, -1.05, 0);
  controls.update();
}

if (window.innerWidth <= 430 && window.innerHeight >= 800) {
  camera.position.set(0, 0.65, 11.4);
  controls.target.set(0, -1.55, 0);
  controls.update();
}

const overviewPosition = camera.position.clone();
const overviewTarget = controls.target.clone();

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
const overviewToggle = document.getElementById("overview-toggle");

rotationToggle.addEventListener("click", () => {
  isAutoRotating = !isAutoRotating;
  rotationToggle.setAttribute("aria-pressed", String(isAutoRotating));
  rotationToggle.textContent = isAutoRotating ? "Parar giro" : "Iniciar giro";
});

overviewToggle.addEventListener("click", () => {
  activeCameraFollow = null;
  animateCamera(overviewPosition, overviewTarget);
  overviewToggle.hidden = true;
  activeStopId = null;
  updateTimelineState();
  routeObjects.forEach((route) => {
    route.line.visible = true;
    route.line.material.opacity = 0.85;
    if (route.icon) route.icon.visible = false;
  });
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
  const context = canvas.getContext("2d");
  const font = '600 11px "Manrope", sans-serif';
  const horizontalPadding = 8;
  context.font = font;
  const textWidth = context.measureText(text).width;
  canvas.width = Math.ceil(textWidth + horizontalPadding * 2);
  canvas.height = 32;
  context.font = font;

  context.fillStyle = "#edeae2";
  context.strokeStyle = "rgba(10, 14, 26, 0.95)";
  context.lineWidth = 4;
  context.lineJoin = "round";
  context.textBaseline = "middle";
  context.strokeText(text, horizontalPadding, canvas.height / 2);
  context.fillText(text, horizontalPadding, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  const labelHeight = 0.11;
  sprite.scale.set((canvas.width / canvas.height) * labelHeight, labelHeight, 1);
  sprite.userData.baseScale = sprite.scale.clone();
  sprite.center.set(0.5, 0);
  sprite.position.set(0, 0, 0.05);
  return sprite;
}

function buildMarkers() {
  TRIP.stops.forEach((stop) => {
    if (stop.showMarker === false) return;

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
      if (stop.labelOffset) {
        label.position.fromArray(stop.labelOffset);
      }
      markerGroup.add(label);
    }

    globeGroup.add(markerGroup);
    markerObjects.push({ group: markerGroup, dot, ring, label, stop });
  });
}
buildMarkers();

function updateMarkerScale() {
  const distance = camera.position.distanceTo(globeGroup.position);
  const zoomProgress = THREE.MathUtils.clamp(
    (distance - controls.minDistance) / (controls.maxDistance - controls.minDistance),
    0,
    1
  );
  const markerScale = 0.55 + zoomProgress * 0.65;
  const dotScale = markerScale * 0.5;
  const ringScale = markerScale * 0.65;
  const labelScale = 0.35 + zoomProgress * 2.2;

  markerObjects.forEach((marker) => {
    marker.dot.scale.setScalar(dotScale);
    marker.ring.scale.setScalar(marker.ring.userData.pulse * ringScale);

    if (marker.label) {
      marker.label.scale.copy(marker.label.userData.baseScale).multiplyScalar(labelScale);
    }
  });
}

// ============================================================
// Rotas (arcos entre pontos)
// ============================================================

const routeObjects = []; // { line, icon, type }
const FLIGHT_DURATION_SECONDS = 14;
const LONG_FLIGHT_DURATION_SECONDS = 10;
const TRAIN_DURATION_SECONDS = 9;
const ROUTES_WITHOUT_ICON = new Set(["nanjing:yangzhou"]);
const CAMERA_FOLLOW_ROUTE_KEYS = new Set([
  "sao-paulo:istambul",
  "istambul:guangzhou",
]);
let activeCameraFollow = null;
const routeIconWorldPosition = new THREE.Vector3();

function createRouteIcon(type) {
  const symbols = {
    voo: String.fromCodePoint(0x2708),
    trem: String.fromCodePoint(0x1f686),
  };
  const symbol = symbols[type];
  if (!symbol) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  // Mantém o avião com o mesmo glifo original; apenas o trem usa a fonte emoji.
  context.font =
    type === "voo"
      ? '600 22px "Segoe UI Symbol", sans-serif'
      : '600 22px "Segoe UI Emoji", "Segoe UI Symbol", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#05070d";
  context.lineWidth = 2;
  context.lineJoin = "round";
  context.strokeText(symbol, 32, 32);
  context.fillText(symbol, 32, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (type === "trem") {
    const icon = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true })
    );
    icon.scale.setScalar(0.08);
    icon.visible = false;
    return icon;
  }

  const icon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.08),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    })
  );
  icon.visible = false;
  return icon;
}

function positionFlightIcon(icon, curve, progress) {
  icon.position.copy(curve.getPointAt(progress));

  // O eixo X do desenho do avião aponta para a frente. Alinhamos esse eixo
  // com a tangente da curva para que ele siga o sentido origem → destino.
  const direction = curve.getTangentAt(progress).normalize();
  const normal = icon.position.clone().normalize();
  const fixedUp = new THREE.Vector3().crossVectors(normal, direction).normalize();
  icon.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(direction, fixedUp, normal)
  );
}

function getRouteProgress(route, duration, elapsed) {
  const startedAt = route.animationStartedAt;
  const offset = startedAt === null ? route.iconOffset : 0;
  const startTime = startedAt === null ? 0 : startedAt;
  return ((elapsed - startTime) / duration + offset) % 1;
}

function getFlightDuration(route) {
  const routeKey = `${route.from}:${route.to}`;
  return CAMERA_FOLLOW_ROUTE_KEYS.has(routeKey)
    ? LONG_FLIGHT_DURATION_SECONDS
    : FLIGHT_DURATION_SECONDS;
}

function startCameraFollow(route) {
  if (route.hasCameraFollowed || !route.icon) return false;

  const now = clock.getElapsedTime();
  route.hasCameraFollowed = true;
  route.animationStartedAt = now;
  positionFlightIcon(route.icon, route.curve, 0);
  activeCameraFollow = {
    route,
    endsAt: now + getFlightDuration(route),
    restorePosition: camera.position.clone(),
    restoreTarget: controls.target.clone(),
  };
  return true;
}

function buildRoutes() {
  const stopsById = Object.fromEntries(TRIP.stops.map((s) => [s.id, s]));

  TRIP.routes.forEach((route, index) => {
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
      color: route.phase === "volta" ? 0xc1432e : style.color,
      transparent: true,
      opacity: 0.85,
    });

    const line = new THREE.Line(geometry, material);
    globeGroup.add(line);
    const routeKey = `${route.from}:${route.to}`;
    const icon = ROUTES_WITHOUT_ICON.has(routeKey) ? null : createRouteIcon(route.type);
    if (icon) {
      icon.position.copy(curve.getPoint(0.5));
      if (route.type === "voo") {
        positionFlightIcon(icon, curve, 0.5);
      }
      globeGroup.add(icon);
    }
    routeObjects.push({
      line,
      icon,
      type: route.type,
      phase: route.phase,
      from: route.from,
      to: route.to,
      curve,
      iconOffset: index / TRIP.routes.length,
      animationStartedAt: null,
      hasCameraFollowed: false,
    });
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
        .forEach((r) => {
          r.line.visible = visible;
          if (r.icon) r.icon.visible = visible;
        });
    });

    legend.appendChild(btn);
  });
}
buildLegend();

// ============================================================
// Estatísticas do roteiro
// ============================================================

function haversineKm(a, b) {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function buildStats() {
  const stats = document.getElementById("stats");
  if (!stats) return;

  const stopsById = Object.fromEntries(TRIP.stops.map((stop) => [stop.id, stop]));
  const totalKm = TRIP.routes.reduce((sum, route) => {
    const from = stopsById[route.from];
    const to = stopsById[route.to];
    return from && to ? sum + haversineKm(from, to) : sum;
  }, 0);

  let countdown = "";
  if (TRIP.startDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const departure = new Date(`${TRIP.startDate}T00:00:00`);
    const days = Math.round((departure - today) / 86400000);
    countdown = days > 1
      ? `faltam <strong>${days}</strong> dias`
      : days === 1
        ? "falta <strong>1</strong> dia"
        : days === 0
          ? "a viagem começa <strong>hoje</strong> 🎉"
          : "a viagem já começou 🎉";
  }

  stats.innerHTML = `
    <span><strong>${TRIP.stops.length}</strong> paradas</span>
    <span><strong>${Math.round(totalKm).toLocaleString("pt-BR")}</strong> km</span>
    ${countdown ? `<span>${countdown}</span>` : ""}
  `;
}
buildStats();

// ============================================================
// Painel lateral (linha do tempo)
// ============================================================

let activeStopId = null;

function updateTimelineState() {
  const activeIndex = TRIP.stops.findIndex((stop) => stop.id === activeStopId);
  document.querySelectorAll(".stop").forEach((el, index) => {
    el.classList.toggle("active", el.dataset.id === activeStopId);
    el.classList.toggle("visited", activeIndex >= 0 && index < activeIndex);
  });
}

function buildTimeline() {
  const timeline = document.getElementById("timeline");

  let currentPhase = null;
  TRIP.stops.forEach((stop) => {
    let phase = currentPhase || "deslocamento";
    if (stop.id === "guangzhou") phase = "roteiro";
    if (stop.id === "guangzhou-retorno") phase = "retorno";
    if (phase !== currentPhase) {
      const section = document.createElement("div");
      section.className = `timeline-section ${phase}`;
      section.textContent = {
        deslocamento: "Deslocamento para China",
        roteiro: "Roteiro pela China",
        retorno: "Retorno ao Brasil",
      }[phase];
      timeline.appendChild(section);
      currentPhase = phase;
    }

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
  activeCameraFollow = null;

  updateTimelineState();

  const selectedStop = TRIP.stops.find((stop) => stop.id === id);
  const marker = markerObjects.find((m) => m.stop.id === id);
  if (selectedStop) {
    routeObjects.forEach((route) => {
      const isOutbound = route.from === id;
      route.line.visible = isOutbound;
      route.line.material.opacity = 0.9;
      if (route.icon) route.icon.visible = isOutbound;
    });

  }

  const routeToFollow = routeObjects.find(
    (route) =>
      route.from === id &&
      CAMERA_FOLLOW_ROUTE_KEYS.has(`${route.from}:${route.to}`) &&
      route.icon
  );
  const isStartingCameraFollow =
    Boolean(selectedStop && flyTo && routeToFollow) && startCameraFollow(routeToFollow);

  if (selectedStop && flyTo && !isStartingCameraFollow) {
    const position = marker
      ? marker.group.getWorldPosition(markerWorldPosition).clone()
      : latLonToVector3(selectedStop.lat, selectedStop.lon, GLOBE_RADIUS);
    const target = position.normalize().multiplyScalar(3.8);
    const focusTarget = window.innerWidth <= 720
      ? globeGroup.position.clone()
      : controls.target.clone();
    animateCamera(target, focusTarget);
    overviewToggle.hidden = false;
  }
}

function animateCamera(targetPos, targetLookAt = controls.target.clone()) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();
  const duration = 900;

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(startPos, targetPos, eased);
    controls.target.lerpVectors(startTarget, targetLookAt, eased);
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
const markerWorldPosition = new THREE.Vector3();
const floatingCard = document.getElementById("floating-card");
const fcName = document.getElementById("fc-name");
const fcDate = document.getElementById("fc-date");

function onPointerMove(event) {
  updatePointer(event);

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

function updatePointer(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick(event) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const dots = markerObjects.map((m) => m.dot);
  const hits = raycaster.intersectObjects(dots);
  if (hits.length > 0) {
    const hit = markerObjects.find((m) => m.dot === hits[0].object);
    selectStop(hit.stop.id, true);
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
    globeGroup.rotation.y -= 0.0009;
  }

  markerObjects.forEach((m, i) => {
    const pulse = 1 + Math.sin(elapsed * 2.4 + i) * 0.18;
    m.ring.userData.pulse = pulse;
  });

  routeObjects.forEach((route) => {
    if (!route.icon || !route.icon.visible) return;

    if (route.type === "voo") {
      const progress = getRouteProgress(route, getFlightDuration(route), elapsed);
      positionFlightIcon(route.icon, route.curve, progress);
    }

    if (route.type === "trem") {
      const progress = getRouteProgress(route, TRAIN_DURATION_SECONDS, elapsed);
      route.icon.position.copy(route.curve.getPointAt(progress));
    }
  });

  if (activeCameraFollow) {
    if (elapsed >= activeCameraFollow.endsAt) {
      const { restorePosition, restoreTarget } = activeCameraFollow;
      activeCameraFollow = null;
      animateCamera(restorePosition, restoreTarget);
    } else {
      const { icon } = activeCameraFollow.route;
      icon.getWorldPosition(routeIconWorldPosition);
      const cameraTarget = routeIconWorldPosition.clone().normalize().multiplyScalar(6.6);
      camera.position.lerp(cameraTarget, 0.055);
      controls.target.lerp(routeIconWorldPosition, 0.1);
    }
  }

  controls.update();
  updateMarkerScale();
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
