import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import type { DiceRollRequest, DieType } from './DiceRollerContext';
import './DiceRoller3D.css';

// ─── Constants ──────────────────────────────────────────

const TOTAL_ROLL_DURATION = 3200;  // full physics sim until dice are at rest
const RESULT_HOLD = 1400;

const DIE_COLORS: Record<string, string> = {
  d4:  '#c0392b',
  d6:  '#2980b9',
  d8:  '#27ae60',
  d10: '#8e44ad',
  d12: '#d35400',
  d20: '#2c3e50',
};

const RESULT_COLORS: Record<string, string> = {
  'critical-success': '#FFD700',
  'success':          '#4CAF50',
  'failure':          '#FF6B6B',
  'critical-failure': '#DC143C',
};

// ─── Texture helpers ────────────────────────────────────

/** Canvas texture with a number on a solid coloured background.
 *  @param scale 0-1, shrinks the number (use ~0.7 for triangular faces). */
function createFaceTexture(value: number, bgColor: string, scale = 1.0): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.6);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const baseFs = value >= 10 ? size * 0.32 : size * 0.42;
  const fs = baseFs * scale;
  ctx.fillStyle = '#FFF';
  ctx.font = `bold ${fs}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 5;
  ctx.fillText(String(value), size / 2, size / 2);
  if (value === 6 || value === 9) {
    ctx.shadowBlur = 0; ctx.fillStyle = '#FFF';
    const uw = size * 0.2 * scale;
    const uh = size * 0.025 * scale;
    ctx.fillRect(size / 2 - uw / 2, size * 0.5 + fs * 0.55, uw, uh);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// ─── Geometry builders ──────────────────────────────────

function createRawGeometry(type: string): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry;
  switch (type) {
    case 'd4':  geo = new THREE.TetrahedronGeometry(0.9); break;
    case 'd6':  geo = new THREE.BoxGeometry(1, 1, 1); break;
    case 'd8':  geo = new THREE.OctahedronGeometry(0.85); break;
    case 'd10': geo = createD10Geometry(0.85); break;
    case 'd12': geo = new THREE.DodecahedronGeometry(0.8); break;
    case 'd20': geo = new THREE.IcosahedronGeometry(0.85); break;
    default:    geo = new THREE.IcosahedronGeometry(0.75); break;
  }
  // Polyhedron geometries are indexed by default — we need non-indexed
  // so each face gets its own unique vertices for per-face UVs/materials
  if (geo.index) {
    const nonIndexed = geo.toNonIndexed();
    geo.dispose();
    return nonIndexed;
  }
  return geo;
}

/**
 * Create a proper d10 (pentagonal trapezohedron) geometry.
 * 10 kite-shaped faces, each split into 2 triangles = 20 triangles total.
 */
function createD10Geometry(radius: number): THREE.BufferGeometry {
  const topAngle = Math.atan(0.5);   // angle above equator for top vertices
  const botAngle = -Math.atan(0.5);  // angle below equator for bottom vertices
  const topY = Math.sin(topAngle) * radius;
  const topR = Math.cos(topAngle) * radius;
  const botY = Math.sin(botAngle) * radius;
  const botR = Math.cos(botAngle) * radius;
  const tipTop = radius * 1.1;
  const tipBot = -radius * 1.1;

  // 5 top vertices (rotated 0°) and 5 bottom vertices (rotated 36°)
  const topVerts: THREE.Vector3[] = [];
  const botVerts: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) {
    const aTop = (i / 5) * Math.PI * 2;
    topVerts.push(new THREE.Vector3(Math.cos(aTop) * topR, topY, Math.sin(aTop) * topR));
    const aBot = ((i + 0.5) / 5) * Math.PI * 2;
    botVerts.push(new THREE.Vector3(Math.cos(aBot) * botR, botY, Math.sin(aBot) * botR));
  }

  const positions: number[] = [];
  // 10 kite faces — 5 upper kites and 5 lower kites
  // Upper kite i: tipTop → topVerts[i] → botVerts[i] → topVerts[(i+1)%5]
  for (let i = 0; i < 5; i++) {
    const t0 = topVerts[i];
    const b0 = botVerts[i];
    const t1 = topVerts[(i + 1) % 5];
    // Triangle 1: tip → t0 → b0
    positions.push(0, tipTop, 0, t0.x, t0.y, t0.z, b0.x, b0.y, b0.z);
    // Triangle 2: tip → b0 → t1
    positions.push(0, tipTop, 0, b0.x, b0.y, b0.z, t1.x, t1.y, t1.z);
  }
  // Lower kite i: botVerts[i] → topVerts[(i+1)%5] → tipBot → topVerts[i] — wait, rethink
  // Lower kite i: tipBot → botVerts[(i+1)%5] → topVerts[(i+1)%5] → botVerts[i]
  for (let i = 0; i < 5; i++) {
    const b0 = botVerts[i];
    const t1 = topVerts[(i + 1) % 5];
    const b1 = botVerts[(i + 1) % 5];
    // Triangle 1: tipBot → b0 → t1
    positions.push(0, tipBot, 0, b0.x, b0.y, b0.z, t1.x, t1.y, t1.z);
    // Triangle 2: tipBot → t1 → b1
    positions.push(0, tipBot, 0, t1.x, t1.y, t1.z, b1.x, b1.y, b1.z);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  // Generate basic UVs (will be overridden by setupFaceGroups)
  const uvs = new Float32Array(positions.length / 3 * 2);
  for (let i = 0; i < uvs.length; i += 6) {
    uvs[i] = 0.5; uvs[i + 1] = 1.0;
    uvs[i + 2] = 0.0; uvs[i + 3] = 0.0;
    uvs[i + 4] = 1.0; uvs[i + 5] = 0.0;
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geo;
}

// ─── Per-face setup for polyhedra ───────────────────────

const FACE_CONFIG: Record<string, { faces: number; trisPerFace: number }> = {
  d4:  { faces: 4,  trisPerFace: 1 },
  d8:  { faces: 8,  trisPerFace: 1 },
  d10: { faces: 10, trisPerFace: 2 },
  d12: { faces: 12, trisPerFace: 3 },
  d20: { faces: 20, trisPerFace: 1 },
};

// Equilateral triangle UVs centered at (0.5, 0.5)
// side = 0.86, height = 0.86 × √3/2 ≈ 0.745
// centroid sits at 1/3 height from base → offsets: +2h/3 top, −h/3 bottom
const TRI_UV: [number, number][] = [
  [0.50, 0.997],  // top vertex
  [0.07, 0.252],  // bottom-left
  [0.93, 0.252],  // bottom-right
];

// Regular pentagon UVs centered at (0.5, 0.5), circumscribed radius = 0.42
// Vertices at angles 90°, 162°, 234°, 306°, 378° (= 18°)
const PENT_UV: [number, number][] = [
  [0.500, 0.920],  // v0 — top (fan apex)
  [0.900, 0.630],  // v1 — upper-right
  [0.747, 0.160],  // v2 — lower-right
  [0.253, 0.160],  // v3 — lower-left
  [0.100, 0.630],  // v4 — upper-left
];

// Kite UVs for d10 (2-triangle kite face, number centered)
const KITE_UV: [number, number][] = [
  [0.50, 0.95],  // top tip
  [0.10, 0.50],  // left
  [0.50, 0.10],  // bottom
  [0.90, 0.50],  // right
];

/**
 * Add material groups and remap UVs so each face shows its own numbered texture.
 * Only modifies group metadata and UV values (never touches position data).
 * Returns false if the geometry doesn't match expected vertex count.
 */
function setupFaceGroups(geo: THREE.BufferGeometry, type: string): boolean {
  const config = FACE_CONFIG[type];
  if (!config) return false;

  const { faces, trisPerFace } = config;
  const vertsPerFace = trisPerFace * 3;
  const expectedVerts = faces * vertsPerFace;

  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  if (!pos || !uv || pos.count !== expectedVerts) {
    console.warn(`🎲 ${type}: expected ${expectedVerts} verts, got ${pos?.count}`);
    return false;
  }

  // Add one material group per face
  geo.clearGroups();
  for (let i = 0; i < faces; i++) {
    geo.addGroup(i * vertsPerFace, vertsPerFace, i);
  }

  // Remap UVs so the number (centered in texture) is visible on every face
  for (let f = 0; f < faces; f++) {
    const base = f * vertsPerFace;

    if (trisPerFace === 1) {
      // Single-triangle face (d4/d8/d20): proper equilateral triangle
      uv.setXY(base,     TRI_UV[0][0], TRI_UV[0][1]);
      uv.setXY(base + 1, TRI_UV[1][0], TRI_UV[1][1]);
      uv.setXY(base + 2, TRI_UV[2][0], TRI_UV[2][1]);
    } else if (trisPerFace === 2) {
      // 2-triangle kite face (d10): tip→left→bottom, tip→bottom→right
      uv.setXY(base,     KITE_UV[0][0], KITE_UV[0][1]);
      uv.setXY(base + 1, KITE_UV[1][0], KITE_UV[1][1]);
      uv.setXY(base + 2, KITE_UV[2][0], KITE_UV[2][1]);
      uv.setXY(base + 3, KITE_UV[0][0], KITE_UV[0][1]);
      uv.setXY(base + 4, KITE_UV[2][0], KITE_UV[2][1]);
      uv.setXY(base + 5, KITE_UV[3][0], KITE_UV[3][1]);
    } else {
      // 3-triangle fan (d12 pentagon): v0→v1→v2, v0→v2→v3, v0→v3→v4
      uv.setXY(base,     PENT_UV[0][0], PENT_UV[0][1]);
      uv.setXY(base + 1, PENT_UV[1][0], PENT_UV[1][1]);
      uv.setXY(base + 2, PENT_UV[2][0], PENT_UV[2][1]);
      uv.setXY(base + 3, PENT_UV[0][0], PENT_UV[0][1]);
      uv.setXY(base + 4, PENT_UV[2][0], PENT_UV[2][1]);
      uv.setXY(base + 5, PENT_UV[3][0], PENT_UV[3][1]);
      uv.setXY(base + 6, PENT_UV[0][0], PENT_UV[0][1]);
      uv.setXY(base + 7, PENT_UV[3][0], PENT_UV[3][1]);
      uv.setXY(base + 8, PENT_UV[4][0], PENT_UV[4][1]);
    }
  }
  uv.needsUpdate = true;
  return true;
}

// ─── Die preparation ────────────────────────────────────

interface DieSetup {
  geometry: THREE.BufferGeometry;
  materials: THREE.Material | THREE.Material[];
  targetQuaternion: THREE.Quaternion;
}

// Direction from the die (at origin) toward the camera — result face should point this way
const CAMERA_DIR = new THREE.Vector3(0, 6, 5).normalize();

/**
 * Compute the outward normal of a face from its first triangle's vertices.
 */
function faceNormal(geo: THREE.BufferGeometry, baseVert: number): THREE.Vector3 {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const a = new THREE.Vector3().fromBufferAttribute(pos, baseVert);
  const b = new THREE.Vector3().fromBufferAttribute(pos, baseVert + 1);
  const c = new THREE.Vector3().fromBufferAttribute(pos, baseVert + 2);
  const n = new THREE.Vector3().crossVectors(
    b.clone().sub(a), c.clone().sub(a),
  ).normalize();
  // Ensure it points outward (away from origin)
  const centroid = a.clone().add(b).add(c).divideScalar(3);
  if (n.dot(centroid) < 0) n.negate();
  return n;
}

function prepareDie(type: string, resultValue: number): DieSetup {
  const bg = DIE_COLORS[type] || '#555555';
  const geo = createRawGeometry(type);

  // ── d6: BoxGeometry has native 6 material groups ──
  if (type === 'd6') {
    const layout = [3, 4, 1, 6, 2, 5]; // +X,-X,+Y,-Y,+Z,-Z
    const normals = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ];
    const mats = layout.map(n =>
      new THREE.MeshStandardMaterial({ map: createFaceTexture(n, bg), metalness: 0.2, roughness: 0.5 })
    );
    const idx = layout.indexOf(resultValue);
    const faceIdx = idx >= 0 ? idx : 2;
    const q = new THREE.Quaternion().setFromUnitVectors(normals[faceIdx], CAMERA_DIR);
    return { geometry: geo, materials: mats, targetQuaternion: q };
  }

  // ── d4 / d8 / d12 / d20: per-face numbered textures via material groups ──
  const config = FACE_CONFIG[type];
  if (config) {
    try {
      const grouped = setupFaceGroups(geo, type);
      if (grouped) {
        // Shrink numbers so they fit inside the inscribed circle of the face
        const textScale = type === 'd20' ? 0.6 : type === 'd12' ? 0.75 : type === 'd10' ? 0.65 : 0.7;
        const mats = Array.from({ length: config.faces }, (_, i) =>
          new THREE.MeshStandardMaterial({ map: createFaceTexture(i + 1, bg, textScale), metalness: 0.2, roughness: 0.5 })
        );
        // Orient so the result face points toward the camera
        const resultIdx = Math.min(resultValue - 1, config.faces - 1);
        const baseVert = resultIdx * config.trisPerFace * 3;
        const n = faceNormal(geo, baseVert);
        const q = new THREE.Quaternion().setFromUnitVectors(n, CAMERA_DIR);
        return { geometry: geo, materials: mats, targetQuaternion: q };
      }
    } catch (e) {
      console.warn('🎲 Face group setup failed for', type, e);
    }
  }

  // ── Fallback (if grouping failed): single result-number texture ──
  const mat = new THREE.MeshStandardMaterial({
    map: createFaceTexture(resultValue, bg),
    metalness: 0.2,
    roughness: 0.5,
  });
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
    ),
  );
  return { geometry: geo, materials: mat, targetQuaternion: q };
}

// ─── Layout ─────────────────────────────────────────────

function layoutDice(count: number, index: number): THREE.Vector3 {
  if (count === 1) return new THREE.Vector3(0, 0, 0);
  const spacing = Math.min(2.5, 6 / count);
  const totalWidth = (count - 1) * spacing;
  return new THREE.Vector3(index * spacing - totalWidth / 2, 0, 0);
}

// ─── Animation state ────────────────────────────────────

interface DieMeshState {
  mesh: THREE.Mesh;
  targetQuaternion: THREE.Quaternion;
  tumbleAxes: THREE.Vector3[];
  tumbleSpeeds: number[];
  bouncePhase: number;
  startPos: THREE.Vector3;
  /** Velocity in units/sec */
  velocity: THREE.Vector3;
  /** Landing target on the XZ plane */
  landing: THREE.Vector3;
}

// ─── Component ──────────────────────────────────────────

interface Props {
  request: DiceRollRequest;
  onComplete: () => void;
  onDismiss: () => void;
}

const DiceRoller3D: React.FC<Props> = ({ request, onComplete, onDismiss }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const showResultCalledRef = useRef(false);
  const [phase, setPhase] = useState<'rolling' | 'settling' | 'result'>('rolling');
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    console.log('🎲 [DiceRoller3D] Mounting —', request.dice.length, 'dice');

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      console.error('🎲 WebGL init failed:', e);
      setError('WebGL not available');
      setTimeout(onComplete, 500);
      return;
    }

    const width = Math.min(600, window.innerWidth - 40);
    const height = 320;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 6, 5);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 8, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    scene.add(key);
    const fill = new THREE.PointLight(0x8888ff, 0.4, 20);
    fill.position.set(-3, 4, -2);
    scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.3 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const disposables: THREE.Material[] = [];
    const disposeGeos: THREE.BufferGeometry[] = [];

    // ── Create dice ───────────────────────────────────
    let diceStates: DieMeshState[];
    try {
      diceStates = request.dice.map((die, i) => {
        const setup = prepareDie(die.type, die.value);
        const mesh = new THREE.Mesh(setup.geometry, setup.materials as any);
        mesh.castShadow = true;
        disposeGeos.push(setup.geometry);
        if (Array.isArray(setup.materials)) {
          setup.materials.forEach(m => disposables.push(m));
        } else {
          disposables.push(setup.materials);
        }

        // Dice enter from the left and roll across horizontally
        const sx = -5 - i * 1.0 - Math.random() * 0.8;
        const sy = 2.0 + Math.random() * 1.5;
        const sz = -0.5 + Math.random() * 1.0;
        mesh.position.set(sx, sy, sz);
        mesh.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        );
        scene.add(mesh);

        const landing = layoutDice(request.dice.length, i);

        // Initial throw velocity — aim generally toward landing with scatter
        const dx = landing.x - sx;
        const dz = landing.z - sz;
        // Overshoot the landing slightly so the spring pulls it back naturally
        const vx = dx * 1.8 + (Math.random() - 0.3) * 3.0;
        const vz = dz * 1.5 + (Math.random() - 0.5) * 2.5;

        // Generate well-separated tumble axes for realistic multi-axis spin
        // Axis 1: predominantly X (forward roll)
        // Axis 2: predominantly Y (yaw / flat spin)
        // Axis 3: predominantly Z (sideways tumble)
        // Random perturbation ensures each die looks unique
        const axes = [
          new THREE.Vector3(1, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4).normalize(),
          new THREE.Vector3((Math.random() - 0.5) * 0.4, 1, (Math.random() - 0.5) * 0.6).normalize(),
          new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, 1).normalize(),
        ];

        return {
          mesh,
          targetQuaternion: setup.targetQuaternion,
          tumbleAxes: axes,
          tumbleSpeeds: [14 + Math.random() * 12, 11 + Math.random() * 10, 9 + Math.random() * 8],
          bouncePhase: Math.random() * Math.PI * 2,
          startPos: new THREE.Vector3(sx, sy, sz),
          velocity: new THREE.Vector3(vx, 0, vz),
          landing,
        };
      });
    } catch (e) {
      console.error('🎲 Dice creation failed:', e);
      setError('Failed to create dice');
      setTimeout(onComplete, 500);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      return;
    }

    startTimeRef.current = performance.now();
    setPhase('rolling');

    // ── Animation loop ───────────────────────────────
    let prevTime = startTimeRef.current;

    const animate = () => {
      try {
        const now = performance.now();
        const elapsed = now - startTimeRef.current;
        const dt = Math.min((now - prevTime) / 1000, 0.05); // delta in seconds, capped
        prevTime = now;

        if (elapsed < TOTAL_ROLL_DURATION) {
          // ── Unified physics phase ──
          const t = elapsed / TOTAL_ROLL_DURATION; // 0 → 1

          for (let i = 0; i < diceStates.length; i++) {
            const ds = diceStates[i];

            // ── Spring force toward landing: starts gentle, ramps up ──
            // t² ramp means very little pull early, strong pull late
            const springStrength = 2.0 + t * t * 25.0;
            const dampening = 3.0 + t * 8.0; // velocity dampening also ramps

            const offsetX = ds.landing.x - ds.mesh.position.x;
            const offsetZ = ds.landing.z - ds.mesh.position.z;

            // Spring acceleration: F = k * displacement - c * velocity
            ds.velocity.x += (offsetX * springStrength - ds.velocity.x * dampening) * dt;
            ds.velocity.z += (offsetZ * springStrength - ds.velocity.z * dampening) * dt;

            // Move by velocity
            ds.mesh.position.x += ds.velocity.x * dt;
            ds.mesh.position.z += ds.velocity.z * dt;

            // Bounce height: diminishing bounces, dies out by ~70% through
            const bounceDecay = Math.pow(Math.max(0, 1 - t * 1.4), 2.5);
            const bounceCount = 5;
            const rawBounce = Math.abs(Math.sin(t * Math.PI * bounceCount + ds.bouncePhase));
            ds.mesh.position.y = rawBounce * bounceDecay * 2.2;

            // Tumble rotation — all 3 axes spin strongly, decaying more gradually
            // Decay curve: stays strong until ~60%, then fades to 0 by 100%
            const spinDecay = t < 0.5
              ? 1.0 - t * 0.3                           // 1.0 → 0.85 (first half: mostly full speed)
              : Math.pow(Math.max(0, 1 - (t - 0.5) * 2.0), 1.8); // second half: decays to 0

            for (let a = 0; a < ds.tumbleAxes.length; a++) {
              ds.mesh.rotateOnAxis(ds.tumbleAxes[a], ds.tumbleSpeeds[a] * spinDecay * dt);
            }

            // Slerp rotation toward final face — ramps up in the last ~30%
            const rotBlend = Math.max(0, (t - 0.7) / 0.3); // 0 until t=0.7, then 0→1
            const rotEase = rotBlend * rotBlend * (3 - 2 * rotBlend); // smoothstep
            if (rotEase > 0.001) {
              ds.mesh.quaternion.slerp(ds.targetQuaternion, rotEase * 0.15); // incremental blend each frame
            }
          }

          // Phase label update
          if (t > 0.7) setPhase('settling');

        } else {
          // ── At rest: snap to exact landing (dice are already very close) ──
          for (let i = 0; i < diceStates.length; i++) {
            const ds = diceStates[i];
            ds.mesh.position.set(ds.landing.x, Math.sin(now * 0.002 + i) * 0.04, ds.landing.z);
            ds.mesh.quaternion.copy(ds.targetQuaternion);
          }

          if (!showResultCalledRef.current) {
            showResultCalledRef.current = true;
            setShowResult(true);
            setPhase('result');
            console.log('🎲 [DiceRoller3D] Animation complete');
            setTimeout(onComplete, RESULT_HOLD);
          }
        }

        renderer.render(scene, camera);
      } catch (e) {
        console.error('🎲 Animation error:', e);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      disposables.forEach(m => { try { m.dispose(); } catch (_) {} });
      disposeGeos.forEach(g => { try { g.dispose(); } catch (_) {} });
      try { renderer.dispose(); } catch (_) {}
      if (container.contains(renderer.domElement)) {
        try { container.removeChild(renderer.domElement); } catch (_) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Build result display ───────────────────────────────

  const resultDisplay = useMemo(() => {
    if (!showResult) return null;
    const diceStr = request.dice.map((d) => `${d.value}`).join(' + ');
    const modStr = request.modifier || '';
    const totalStr = request.total != null ? ` = ${request.total}` : '';
    return { diceStr, modStr, totalStr };
  }, [showResult, request]);

  const resultColor = request.result ? RESULT_COLORS[request.result] : '#FFD700';

  const resultLabel = request.result
    ? request.result.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  return (
    <div className="dice-overlay" onClick={onDismiss}>
      <div className="dice-overlay__backdrop" />
      <div className="dice-overlay__content" onClick={(e) => e.stopPropagation()}>
        {request.label && (
          <div className="dice-overlay__label">{request.label}</div>
        )}

        {error ? (
          <div style={{ color: '#ff6b6b', padding: '2rem', fontSize: '1rem' }}>{error}</div>
        ) : (
          <div ref={containerRef} className="dice-overlay__canvas" />
        )}

        <div className="dice-overlay__notation">
          {request.dice.map((d, i) => (
            <span key={i} className="dice-overlay__die-badge" style={{ background: DIE_COLORS[d.type] || '#555' }}>
              {d.type}
            </span>
          ))}
        </div>

        {resultDisplay && (
          <div className="dice-overlay__result" style={{ color: resultColor }}>
            <span className="dice-overlay__values">
              {resultDisplay.diceStr}
              {resultDisplay.modStr && <span className="dice-overlay__modifier">{resultDisplay.modStr}</span>}
              {resultDisplay.totalStr}
            </span>
            {resultLabel && (
              <span className="dice-overlay__degree" style={{ background: resultColor }}>
                {resultLabel}
              </span>
            )}
          </div>
        )}

        <div className="dice-overlay__hint">Click anywhere to dismiss</div>
      </div>
    </div>
  );
};

export default DiceRoller3D;
