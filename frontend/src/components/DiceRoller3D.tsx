import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { DiceRollRequest } from './DiceRollerContext';
import './DiceRoller3D.css';

// ─── Physics Configuration ──────────────────────────────
// Physics engine: cannon-es
// Chosen for: lightweight pure-JS (~40KB gzip), good rigid body simulation,
// box/sphere colliders, straightforward Three.js sync. Alternatives considered:
// - Rapier (WASM, faster but heavier, async init complexity)
// - Ammo.js (Bullet port, very heavy for dice use case)

const GRAVITY = -9.82 * 4;           // scaled up for snappy dice feel
const FLOOR_Y = -1.2;
const WALL_DISTANCE = 4.5;           // invisible wall distance from center
const SETTLE_VEL = 0.15;             // linear velocity threshold for "settled"
const SETTLE_ANGVEL = 0.3;           // angular velocity threshold for "settled"
const SETTLE_FRAMES = 15;            // consecutive calm frames to confirm settled
const MAX_PHYSICS_MS = 4500;         // hard cap on physics simulation (ms)
const SLERP_BLEND = 0.12;            // per-frame slerp blend toward target quaternion
const RESULT_HOLD_MS = 1400;         // how long to show result before dismissing

const FLOOR_FRICTION = 0.5;
const FLOOR_RESTITUTION = 0.3;
const DICE_FRICTION = 0.4;
const DICE_RESTITUTION = 0.35;
const DICE_MASS = 1;

// Fallback spring animation duration (used when physics init fails)
const FALLBACK_ROLL_MS = 2400;

let physicsAvailable = true;          // flipped to false if CANNON init fails

// ─── Dice Themes ────────────────────────────────────────

export type DiceTheme = 'classic' | 'metallic' | 'obsidian' | 'stone';

interface ThemeConfig {
  label: string;
  bgColors: Record<string, string>;
  numberColor: string;
  metalness: number;
  roughness: number;
  emissive?: string;
  emissiveIntensity?: number;
  noiseOverlay?: boolean;
}

export const DICE_THEMES: Record<DiceTheme, ThemeConfig> = {
  classic: {
    label: 'Classic',
    bgColors: { d4: '#c0392b', d6: '#2980b9', d8: '#27ae60', d10: '#8e44ad', d12: '#d35400', d20: '#2c3e50' },
    numberColor: '#FFFFFF',
    metalness: 0.2,
    roughness: 0.5,
  },
  metallic: {
    label: 'Metallic Gold',
    bgColors: { d4: '#b8860b', d6: '#c0a040', d8: '#d4af37', d10: '#aa8822', d12: '#daa520', d20: '#b8960b' },
    numberColor: '#1a1000',
    metalness: 0.75,
    roughness: 0.18,
  },
  obsidian: {
    label: 'Obsidian',
    bgColors: { d4: '#1a1a2e', d6: '#16213e', d8: '#0f0f23', d10: '#1a1a2e', d12: '#12122a', d20: '#0d0d1a' },
    numberColor: '#d4af37',
    metalness: 0.35,
    roughness: 0.35,
    emissive: '#331100',
    emissiveIntensity: 0.15,
  },
  stone: {
    label: 'Carved Stone',
    bgColors: { d4: '#6b6b6b', d6: '#7a7a7a', d8: '#5e5e5e', d10: '#696969', d12: '#757575', d20: '#636363' },
    numberColor: '#e0e0e0',
    metalness: 0.05,
    roughness: 0.85,
    noiseOverlay: true,
  },
};

const THEME_STORAGE_KEY = 'pf2e-dice-theme';

export function getStoredTheme(): DiceTheme {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v && v in DICE_THEMES) return v as DiceTheme;
  } catch { /* ignore */ }
  return 'classic';
}

export function setStoredTheme(theme: DiceTheme): void {
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* ignore */ }
}

function getCurrentTheme(): ThemeConfig {
  return DICE_THEMES[getStoredTheme()];
}

const RESULT_COLORS: Record<string, string> = {
  'critical-success': '#FFD700',
  'success':          '#4CAF50',
  'failure':          '#FF6B6B',
  'critical-failure': '#DC143C',
};

// ─── Texture helpers ────────────────────────────────────

function createFaceTexture(value: number, bgColor: string, theme: ThemeConfig, scale = 1.0): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, size, size);

  if (theme.noiseOverlay) {
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 40;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.6);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const baseFs = value >= 10 ? size * 0.32 : size * 0.42;
  const fs = baseFs * scale;
  ctx.fillStyle = theme.numberColor;
  ctx.font = `bold ${fs}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 5;
  ctx.fillText(String(value), size / 2, size / 2);

  if (value === 6 || value === 9) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.numberColor;
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
  if (geo.index) {
    const nonIndexed = geo.toNonIndexed();
    geo.dispose();
    return nonIndexed;
  }
  return geo;
}

function createD10Geometry(radius: number): THREE.BufferGeometry {
  const topAngle = Math.atan(0.5);
  const botAngle = -Math.atan(0.5);
  const topY = Math.sin(topAngle) * radius;
  const topR = Math.cos(topAngle) * radius;
  const botY = Math.sin(botAngle) * radius;
  const botR = Math.cos(botAngle) * radius;
  const tipTop = radius * 1.1;
  const tipBot = -radius * 1.1;

  const topVerts: THREE.Vector3[] = [];
  const botVerts: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) {
    const aTop = (i / 5) * Math.PI * 2;
    topVerts.push(new THREE.Vector3(Math.cos(aTop) * topR, topY, Math.sin(aTop) * topR));
    const aBot = ((i + 0.5) / 5) * Math.PI * 2;
    botVerts.push(new THREE.Vector3(Math.cos(aBot) * botR, botY, Math.sin(aBot) * botR));
  }

  const positions: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t0 = topVerts[i];
    const b0 = botVerts[i];
    const t1 = topVerts[(i + 1) % 5];
    positions.push(0, tipTop, 0, t0.x, t0.y, t0.z, b0.x, b0.y, b0.z);
    positions.push(0, tipTop, 0, b0.x, b0.y, b0.z, t1.x, t1.y, t1.z);
  }
  for (let i = 0; i < 5; i++) {
    const b0 = botVerts[i];
    const t1 = topVerts[(i + 1) % 5];
    const b1 = botVerts[(i + 1) % 5];
    positions.push(0, tipBot, 0, b0.x, b0.y, b0.z, t1.x, t1.y, t1.z);
    positions.push(0, tipBot, 0, t1.x, t1.y, t1.z, b1.x, b1.y, b1.z);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
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

const TRI_UV: [number, number][] = [
  [0.50, 0.997], [0.07, 0.252], [0.93, 0.252],
];
const PENT_UV: [number, number][] = [
  [0.500, 0.920], [0.900, 0.630], [0.747, 0.160], [0.253, 0.160], [0.100, 0.630],
];
const KITE_UV: [number, number][] = [
  [0.50, 0.95], [0.10, 0.50], [0.50, 0.10], [0.90, 0.50],
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

const CAMERA_DIR = new THREE.Vector3(0, 6, 5).normalize();

function faceNormal(geo: THREE.BufferGeometry, baseVert: number): THREE.Vector3 {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const a = new THREE.Vector3().fromBufferAttribute(pos, baseVert);
  const b = new THREE.Vector3().fromBufferAttribute(pos, baseVert + 1);
  const c = new THREE.Vector3().fromBufferAttribute(pos, baseVert + 2);
  const n = new THREE.Vector3().crossVectors(
    b.clone().sub(a), c.clone().sub(a),
  ).normalize();
  const centroid = a.clone().add(b).add(c).divideScalar(3);
  if (n.dot(centroid) < 0) n.negate();
  return n;
}

function makeMaterial(theme: ThemeConfig, map: THREE.CanvasTexture): THREE.MeshStandardMaterial {
  const opts: THREE.MeshStandardMaterialParameters = {
    map,
    metalness: theme.metalness,
    roughness: theme.roughness,
  };
  if (theme.emissive) {
    opts.emissive = new THREE.Color(theme.emissive);
    opts.emissiveIntensity = theme.emissiveIntensity ?? 0.1;
  }
  return new THREE.MeshStandardMaterial(opts);
}

function prepareDie(type: string, resultValue: number, theme: ThemeConfig): DieSetup {
  const bg = theme.bgColors[type] || '#555555';
  const geo = createRawGeometry(type);

  // ── d6: BoxGeometry has native 6 material groups ──
  if (type === 'd6') {
    const layout = [3, 4, 1, 6, 2, 5]; // +X,-X,+Y,-Y,+Z,-Z
    const normals = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ];
    const mats = layout.map(n => makeMaterial(theme, createFaceTexture(n, bg, theme)));
    const idx = layout.indexOf(resultValue);
    const faceIdx = idx >= 0 ? idx : 2;
    const q = new THREE.Quaternion().setFromUnitVectors(normals[faceIdx], CAMERA_DIR);
    return { geometry: geo, materials: mats, targetQuaternion: q };
  }

  // ── Polyhedra with per-face textures ──
  const config = FACE_CONFIG[type];
  if (config) {
    try {
      const grouped = setupFaceGroups(geo, type);
      if (grouped) {
        const textScale = type === 'd20' ? 0.6 : type === 'd12' ? 0.75 : type === 'd10' ? 0.65 : 0.7;
        const mats = Array.from({ length: config.faces }, (_, i) =>
          makeMaterial(theme, createFaceTexture(i + 1, bg, theme, textScale))
        );
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

  // ── Fallback: single result-number texture ──
  const mat = makeMaterial(theme, createFaceTexture(resultValue, bg, theme));
  const q = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2),
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

// ─── Physics world ──────────────────────────────────────

function createPhysicsWorld(): CANNON.World | null {
  try {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });

    const floorMat = new CANNON.Material('floor');
    const diceMat = new CANNON.Material('dice');

    world.addContactMaterial(new CANNON.ContactMaterial(floorMat, diceMat, {
      friction: FLOOR_FRICTION,
      restitution: FLOOR_RESTITUTION,
    }));
    world.addContactMaterial(new CANNON.ContactMaterial(diceMat, diceMat, {
      friction: DICE_FRICTION,
      restitution: DICE_RESTITUTION,
    }));

    // Floor plane
    const floorBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      material: floorMat,
      shape: new CANNON.Plane(),
    });
    floorBody.quaternion.setFromEulerAngles(-Math.PI / 2, 0, 0);
    floorBody.position.set(0, FLOOR_Y, 0);
    world.addBody(floorBody);

    // Invisible walls
    const walls: { pos: [number, number, number]; euler: [number, number, number] }[] = [
      { pos: [WALL_DISTANCE, 0, 0], euler: [0, -Math.PI / 2, 0] },
      { pos: [-WALL_DISTANCE, 0, 0], euler: [0, Math.PI / 2, 0] },
      { pos: [0, 0, WALL_DISTANCE], euler: [Math.PI, 0, 0] },
      { pos: [0, 0, -WALL_DISTANCE], euler: [0, 0, 0] },
      { pos: [0, 6, 0], euler: [Math.PI / 2, 0, 0] }, // ceiling
    ];
    for (const w of walls) {
      const wall = new CANNON.Body({
        type: CANNON.Body.STATIC,
        material: floorMat,
        shape: new CANNON.Plane(),
      });
      wall.position.set(w.pos[0], w.pos[1], w.pos[2]);
      wall.quaternion.setFromEulerAngles(w.euler[0], w.euler[1], w.euler[2]);
      world.addBody(wall);
    }

    return world;
  } catch (e) {
    console.warn('🎲 Physics world creation failed:', e);
    physicsAvailable = false;
    return null;
  }
}

function createPhysicsBody(type: string, diceMat: CANNON.Material): CANNON.Body {
  let shape: CANNON.Shape;
  if (type === 'd6') {
    shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
  } else {
    // Sphere approximation for polyhedra — standard approach for dice physics.
    // Visual mesh rotation is decoupled; physics just drives bounce/collision.
    const radii: Record<string, number> = {
      d4: 0.65, d8: 0.6, d10: 0.6, d12: 0.55, d20: 0.6,
    };
    shape = new CANNON.Sphere(radii[type] || 0.6);
  }
  return new CANNON.Body({ mass: DICE_MASS, shape, material: diceMat });
}

// ─── Die state ──────────────────────────────────────────

interface DieState {
  mesh: THREE.Mesh;
  targetQuaternion: THREE.Quaternion;
  landing: THREE.Vector3;
  body: CANNON.Body | null;
  // Fallback animation fields
  tumbleAxes: THREE.Vector3[];
  tumbleSpeeds: number[];
  bouncePhase: number;
  velocity: THREE.Vector3;
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
  const showResultCalledRef = useRef(false);
  const [phase, setPhase] = useState<'rolling' | 'settling' | 'result'>('rolling');
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme = getCurrentTheme();
    console.log('🎲 [DiceRoller3D] Mounting —', request.dice.length, 'dice, theme:', getStoredTheme());

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
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(3, 8, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x8888ff, 0.4, 20);
    fillLight.position.set(-3, 4, -2);
    scene.add(fillLight);

    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.3 }),
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = FLOOR_Y;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const disposables: THREE.Material[] = [];
    const disposeGeos: THREE.BufferGeometry[] = [];

    // ── Physics world ──
    const world = physicsAvailable ? createPhysicsWorld() : null;
    const usePhysics = world !== null;

    // Get dice material reference for creating bodies
    let diceMat: CANNON.Material | null = null;
    if (world) {
      diceMat = new CANNON.Material('dice');
    }

    // ── Create dice ──
    let diceStates: DieState[];
    try {
      diceStates = request.dice.map((die, i) => {
        const setup = prepareDie(die.type, die.value, theme);
        const mesh = new THREE.Mesh(
          setup.geometry,
          setup.materials as THREE.Material | THREE.Material[],
        );
        mesh.castShadow = true;
        disposeGeos.push(setup.geometry);
        if (Array.isArray(setup.materials)) {
          setup.materials.forEach(m => disposables.push(m));
        } else {
          disposables.push(setup.materials);
        }

        const landing = layoutDice(request.dice.length, i);

        // Random initial positions above and to the left
        const sx = -3 - i * 0.8 - Math.random() * 1.5;
        const sy = 2.5 + Math.random() * 1.5;
        const sz = (Math.random() - 0.5) * 2.0;

        mesh.position.set(sx, sy, sz);
        mesh.rotation.set(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
        );
        scene.add(mesh);

        // Physics body
        let body: CANNON.Body | null = null;
        if (world && diceMat) {
          body = createPhysicsBody(die.type, diceMat);
          body.position.set(sx, sy, sz);
          body.quaternion.set(
            mesh.quaternion.x, mesh.quaternion.y,
            mesh.quaternion.z, mesh.quaternion.w,
          );
          // Initial velocity — throw toward center with scatter
          const throwVx = (landing.x - sx) * 2.0 + (Math.random() - 0.3) * 3.0;
          const throwVy = 2.0 + Math.random() * 2.0;
          const throwVz = (landing.z - sz) * 1.5 + (Math.random() - 0.5) * 2.0;
          body.velocity.set(throwVx, throwVy, throwVz);
          // Random angular velocity — this gives realistic tumbling
          body.angularVelocity.set(
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 25,
          );
          world.addBody(body);
        }

        // Fallback animation fields
        const axes = [
          new THREE.Vector3(1, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.4).normalize(),
          new THREE.Vector3((Math.random() - 0.5) * 0.4, 1, (Math.random() - 0.5) * 0.6).normalize(),
          new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, 1).normalize(),
        ];
        const dx = landing.x - sx;
        const dz = landing.z - sz;

        return {
          mesh,
          targetQuaternion: setup.targetQuaternion,
          landing,
          body,
          tumbleAxes: axes,
          tumbleSpeeds: [14 + Math.random() * 12, 11 + Math.random() * 10, 9 + Math.random() * 8],
          bouncePhase: Math.random() * Math.PI * 2,
          velocity: new THREE.Vector3(
            dx * 1.8 + (Math.random() - 0.3) * 3.0,
            0,
            dz * 1.5 + (Math.random() - 0.5) * 2.5,
          ),
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

    const startTime = performance.now();
    let prevTime = startTime;
    let settledFrameCount = 0;
    let settled = false;
    let settleStartTime = 0;
    setPhase('rolling');

    // ── Animation loop ──
    const animate = () => {
      try {
        const now = performance.now();
        const elapsed = now - startTime;
        const dt = Math.min((now - prevTime) / 1000, 0.05);
        prevTime = now;

        if (usePhysics) {
          // ═══════════════════════════════════════════
          // PHYSICS MODE (cannon-es)
          // ═══════════════════════════════════════════
          if (!settled) {
            // Step physics
            world!.step(1 / 60, dt, 3);

            // Sync Three.js meshes from CANNON bodies
            for (const ds of diceStates) {
              if (ds.body) {
                ds.mesh.position.set(
                  ds.body.position.x,
                  ds.body.position.y,
                  ds.body.position.z,
                );
                ds.mesh.quaternion.set(
                  ds.body.quaternion.x,
                  ds.body.quaternion.y,
                  ds.body.quaternion.z,
                  ds.body.quaternion.w,
                );
              }
            }

            // Check if all dice have settled
            const allCalm = diceStates.every(ds => {
              if (!ds.body) return true;
              return ds.body.velocity.length() < SETTLE_VEL
                  && ds.body.angularVelocity.length() < SETTLE_ANGVEL;
            });

            if (allCalm) {
              settledFrameCount++;
              if (settledFrameCount >= SETTLE_FRAMES) {
                settled = true;
                settleStartTime = now;
                setPhase('settling');
                // Freeze physics bodies
                for (const ds of diceStates) {
                  if (ds.body) {
                    ds.body.type = CANNON.Body.STATIC;
                  }
                }
              }
            } else {
              settledFrameCount = 0;
            }

            // Hard timeout
            if (elapsed > MAX_PHYSICS_MS && !settled) {
              settled = true;
              settleStartTime = now;
              setPhase('settling');
              for (const ds of diceStates) {
                if (ds.body) ds.body.type = CANNON.Body.STATIC;
              }
            }

          } else {
            // Slerp to target quaternion so the correct face shows
            const slerpElapsed = now - settleStartTime;
            const slerpT = Math.min(slerpElapsed / 600, 1.0);
            const eased = slerpT * slerpT * (3 - 2 * slerpT); // smoothstep

            for (const ds of diceStates) {
              ds.mesh.quaternion.slerp(ds.targetQuaternion, eased * SLERP_BLEND + eased * 0.85 * Math.min(slerpT * 2, 1));
              // Gentle floating at rest
              ds.mesh.position.y += Math.sin(now * 0.002) * 0.001;
            }

            if (slerpT >= 1.0 && !showResultCalledRef.current) {
              showResultCalledRef.current = true;
              setShowResult(true);
              setPhase('result');
              console.log('🎲 [DiceRoller3D] Physics animation complete');
              setTimeout(onComplete, RESULT_HOLD_MS);
            }
          }

        } else {
          // ═══════════════════════════════════════════
          // FALLBACK MODE (spring animation)
          // ═══════════════════════════════════════════
          if (elapsed < FALLBACK_ROLL_MS) {
            const t = elapsed / FALLBACK_ROLL_MS;

            for (const ds of diceStates) {
              const springStrength = 2.0 + t * t * 25.0;
              const dampening = 3.0 + t * 8.0;
              const offsetX = ds.landing.x - ds.mesh.position.x;
              const offsetZ = ds.landing.z - ds.mesh.position.z;

              ds.velocity.x += (offsetX * springStrength - ds.velocity.x * dampening) * dt;
              ds.velocity.z += (offsetZ * springStrength - ds.velocity.z * dampening) * dt;
              ds.mesh.position.x += ds.velocity.x * dt;
              ds.mesh.position.z += ds.velocity.z * dt;

              const bounceDecay = Math.pow(Math.max(0, 1 - t * 1.4), 2.5);
              const rawBounce = Math.abs(Math.sin(t * Math.PI * 5 + ds.bouncePhase));
              ds.mesh.position.y = rawBounce * bounceDecay * 2.2;

              const spinDecay = t < 0.5
                ? 1.0 - t * 0.3
                : Math.pow(Math.max(0, 1 - (t - 0.5) * 2.0), 1.8);

              for (let a = 0; a < ds.tumbleAxes.length; a++) {
                ds.mesh.rotateOnAxis(ds.tumbleAxes[a], ds.tumbleSpeeds[a] * spinDecay * dt);
              }

              const rotBlend = Math.max(0, (t - 0.7) / 0.3);
              const rotEase = rotBlend * rotBlend * (3 - 2 * rotBlend);
              if (rotEase > 0.001) {
                ds.mesh.quaternion.slerp(ds.targetQuaternion, rotEase * 0.15);
              }
            }
            if (elapsed / FALLBACK_ROLL_MS > 0.7) setPhase('settling');
          } else {
            for (const ds of diceStates) {
              ds.mesh.position.set(
                ds.landing.x,
                Math.sin(now * 0.002) * 0.04,
                ds.landing.z,
              );
              ds.mesh.quaternion.copy(ds.targetQuaternion);
            }
            if (!showResultCalledRef.current) {
              showResultCalledRef.current = true;
              setShowResult(true);
              setPhase('result');
              console.log('🎲 [DiceRoller3D] Fallback animation complete');
              setTimeout(onComplete, RESULT_HOLD_MS);
            }
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
      disposables.forEach(m => { try { m.dispose(); } catch (_) { /* noop */ } });
      disposeGeos.forEach(g => { try { g.dispose(); } catch (_) { /* noop */ } });
      try { renderer.dispose(); } catch (_) { /* noop */ }
      if (container.contains(renderer.domElement)) {
        try { container.removeChild(renderer.domElement); } catch (_) { /* noop */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Build result display ──
  const resultDisplay = useMemo(() => {
    if (!showResult) return null;
    const diceStr = request.dice.map((d) => `${d.value}`).join(' + ');
    const modStr = request.modifier || '';
    const totalStr = request.total != null ? ` = ${request.total}` : '';
    return { diceStr, modStr, totalStr };
  }, [showResult, request]);

  const theme = getCurrentTheme();
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
            <span
              key={i}
              className="dice-overlay__die-badge"
              style={{ background: theme.bgColors[d.type] || '#555' }}
            >
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
