import * as THREE from 'three';
import type { CharacterAppearance, CircleObstacle } from '../game/rules';
import { speechLines } from '../game/chatBubbles';

/**
 * Procedural CanvasTexture generators (Zero external image 404s).
 */
export function createCobblestoneTextures(maxAnisotropy: number): {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Cool mortar separates the warmer lit faces of the paving stones.
  cCtx.fillStyle = '#182a35';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#181818';
  bCtx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 8;
  const cellW = size / cols;
  const cellH = size / rows;

  for (let r = 0; r < rows; r++) {
    const offsetX = (r % 2) * (cellW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * cellW + offsetX + 2;
      const y = r * cellH + 2;
      const w = cellW - 4;
      const h = cellH - 4;

      // Deterministic pseudo-random shade per stone
      const hash = Math.abs(Math.sin((r * 13 + c * 29) * 12.9898) * 43758.5453) % 1;
      const baseLum = Math.floor(48 + hash * 28);
      const rCol = baseLum + 5;
      const gCol = baseLum + 12;
      const bCol = baseLum + 18;

      cCtx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
      cCtx.beginPath();
      cCtx.roundRect(x, y, w, h, 5);
      cCtx.fill();

      // Highlight edge
      cCtx.strokeStyle = `rgba(190, 218, 229, 0.2)`;
      cCtx.lineWidth = 1;
      cCtx.stroke();

      // Bump height
      const bumpLum = Math.floor(140 + hash * 90);
      bCtx.fillStyle = `rgb(${bumpLum}, ${bumpLum}, ${bumpLum})`;
      bCtx.beginPath();
      bCtx.roundRect(x, y, w, h, 5);
      bCtx.fill();
    }
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(22, 22);
  colorMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(22, 22);
  bumpMap.anisotropy = maxAnisotropy;

  return { colorMap, bumpMap };
}

export function createStoneMasonryBump(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#222';
  ctx.fillRect(0, 0, size, size);

  for (let r = 0; r < 4; r++) {
    const ox = (r % 2) * 16;
    for (let c = -1; c < 4; c++) {
      const lum = 150 + ((r * 7 + c * 13) % 70);
      ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
      ctx.fillRect(c * 32 + ox + 2, r * 32 + 2, 28, 28);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

let cachedShadowTexture: THREE.CanvasTexture | null = null;
export function getRadialShadowTexture(): THREE.CanvasTexture {
  if (cachedShadowTexture) return cachedShadowTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.48
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  cachedShadowTexture = new THREE.CanvasTexture(canvas);
  cachedShadowTexture.colorSpace = THREE.SRGBColorSpace;
  return cachedShadowTexture;
}

export function createContactShadowDisc(radius: number, opacity = 0.48): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 24);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: getRadialShadowTexture(),
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.016;
  return mesh;
}

/**
 * 1. Composite 12-Part Gothic Cathedral Bell Tower Landmark (Tall Vista Silhouette at Z = -26)
 */
export function createGothicBellTower(bumpMap: THREE.Texture): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x62778b,
    roughness: 0.82,
    metalness: 0.12,
    bumpMap,
    bumpScale: 0.09,
  });
  const trimStoneMat = new THREE.MeshStandardMaterial({
    color: 0x25374c,
    roughness: 0.52,
    metalness: 0.28,
    bumpMap,
    bumpScale: 0.05,
  });
  const slateRoofMat = new THREE.MeshStandardMaterial({
    color: 0x23455c,
    roughness: 0.34,
    metalness: 0.38,
    bumpMap,
    bumpScale: 0.04,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xc59321,
    roughness: 0.24,
    metalness: 0.88,
  });
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff7700,
    emissiveIntensity: 2.4,
    roughness: 0.18,
  });

  // Part 1: Multi-stepped stone foundation plinth + entry stairs
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.5, 7.2), trimStoneMat);
  plinth.position.y = 0.75;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const step1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.45, 1.2), trimStoneMat);
  step1.position.set(0, 0.225, 4.0);
  group.add(step1);

  // Part 2: Primary masonry tower shaft + horizontal cornice bands
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(5.3, 13.2, 5.3), stoneMat);
  shaft.position.y = 1.5 + 6.6;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);

  for (const bandY of [5.2, 9.6, 14.3]) {
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(5.75, 0.32, 5.75), trimStoneMat);
    cornice.position.y = bandY;
    group.add(cornice);
  }

  // Part 3: 4 Corner Multi-Tiered Gothic Flying Buttresses
  const buttressLowerGeo = new THREE.BoxGeometry(1.25, 8.2, 1.25);
  const buttressUpperGeo = new THREE.BoxGeometry(0.95, 6.2, 0.95);
  const corners = [
    [-2.55, -2.55],
    [2.55, -2.55],
    [-2.55, 2.55],
    [2.55, 2.55],
  ];
  for (const [cx, cz] of corners) {
    const bl = new THREE.Mesh(buttressLowerGeo, trimStoneMat);
    bl.position.set(cx * 1.04, 4.8, cz * 1.04);
    bl.castShadow = true;
    group.add(bl);

    const bu = new THREE.Mesh(buttressUpperGeo, trimStoneMat);
    bu.position.set(cx, 11.4, cz);
    bu.castShadow = true;
    group.add(bu);
  }

  // Part 4: Arched Belfry Lantern Stage (open colonnade)
  const belfryFloor = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.55, 6.1), trimStoneMat);
  belfryFloor.position.y = 14.7;
  group.add(belfryFloor);

  const pillarGeo = new THREE.CylinderGeometry(0.34, 0.4, 3.8, 12);
  for (const [cx, cz] of [
    [-2.2, -2.2],
    [2.2, -2.2],
    [-2.2, 2.2],
    [2.2, 2.2],
  ]) {
    const p = new THREE.Mesh(pillarGeo, stoneMat);
    p.position.set(cx, 16.8, cz);
    p.castShadow = true;
    group.add(p);
  }

  // Part 5: LatheGeometry Bronze Cathedral Bell suspended inside belfry
  const bellPoints = [
    new THREE.Vector2(0.0, 1.25),
    new THREE.Vector2(0.36, 1.18),
    new THREE.Vector2(0.5, 0.65),
    new THREE.Vector2(0.88, 0.12),
    new THREE.Vector2(0.98, 0.0),
  ];
  const bellGeo = new THREE.LatheGeometry(bellPoints, 24);
  const bell = new THREE.Mesh(bellGeo, bronzeMat);
  bell.position.y = 16.2;
  bell.name = 'cathedral_bell';
  group.add(bell);

  // Part 6: Glowing Gothic Rose Window with Wheel Tracery Spokes on front facade
  const clockFrame = new THREE.Mesh(
    new THREE.TorusGeometry(1.32, 0.16, 12, 28),
    bronzeMat
  );
  clockFrame.position.set(0, 11.6, 2.7);
  group.add(clockFrame);

  const clockFace = new THREE.Mesh(
    new THREE.CylinderGeometry(1.22, 1.22, 0.22, 24),
    windowGlowMat
  );
  clockFace.rotation.x = Math.PI / 2;
  clockFace.position.set(0, 11.6, 2.62);
  group.add(clockFace);

  const spokeGeo = new THREE.BoxGeometry(2.35, 0.08, 0.12);
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(spokeGeo, bronzeMat);
    spoke.position.set(0, 11.6, 2.74);
    spoke.rotation.z = (i * Math.PI) / 4;
    group.add(spoke);
  }

  // Part 7: Twin Pointed Lancet Windows + Grand Portal Archway
  const lancetGeo = new THREE.BoxGeometry(0.68, 3.3, 0.22);
  for (const lx of [-0.95, 0.95]) {
    const lancet = new THREE.Mesh(lancetGeo, windowGlowMat);
    lancet.position.set(lx, 6.8, 2.66);
    group.add(lancet);

    const archTop = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.85, 4), windowGlowMat);
    archTop.position.set(lx, 8.85, 2.66);
    archTop.rotation.y = Math.PI / 4;
    group.add(archTop);
  }

  // Part 8: Steeply Pitched Octagonal Gothic Main Spire + 4 Corner Pinnacle Spires
  const belfryCornice = new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.55, 6.3), trimStoneMat);
  belfryCornice.position.y = 18.7;
  group.add(belfryCornice);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(3.85, 9.2, 8), slateRoofMat);
  spire.position.y = 18.95 + 4.6;
  spire.castShadow = true;
  group.add(spire);

  const pinnacleShaftGeo = new THREE.CylinderGeometry(0.32, 0.42, 1.5, 8);
  const pinnacleConeGeo = new THREE.ConeGeometry(0.48, 2.6, 8);
  for (const [px, pz] of [
    [-2.55, -2.55],
    [2.55, -2.55],
    [-2.55, 2.55],
    [2.55, 2.55],
  ]) {
    const pShaft = new THREE.Mesh(pinnacleShaftGeo, trimStoneMat);
    pShaft.position.set(px, 19.65, pz);
    group.add(pShaft);

    const pCone = new THREE.Mesh(pinnacleConeGeo, slateRoofMat);
    pCone.position.set(px, 21.65, pz);
    pCone.castShadow = true;
    group.add(pCone);
  }

  // Part 9: Wrought-Iron Cross Finial at peak
  const finialV = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), bronzeMat);
  finialV.position.y = 28.6;
  group.add(finialV);
  const finialH = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 8), bronzeMat);
  finialH.rotation.z = Math.PI / 2;
  finialH.position.y = 29.0;
  group.add(finialH);

  group.add(createContactShadowDisc(5.9, 0.62));
  return group;
}

/**
 * 2. Architectural 12-Part Timbered Tudor/Gothic Cottage
 * Features a true triangular ExtrudeGeometry Pitched Gable Roof, overhanging timber eaves,
 * attic dormer window, shuttered mullioned windows, stone porch steps, and a hanging glowing lantern.
 */
export function createGothicCottage(
  width = 5.4,
  depth = 6.2,
  height = 4.6,
  roofTint = 0x355480,
  bumpMap?: THREE.Texture
): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x526675,
    roughness: 0.86,
    metalness: 0.1,
    bumpMap,
    bumpScale: 0.07,
  });
  const plasterMat = new THREE.MeshStandardMaterial({
    color: 0xb69771,
    roughness: 0.8,
    metalness: 0.05,
    bumpMap,
    bumpScale: 0.03,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x38231e,
    roughness: 0.52,
    metalness: 0.16,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: roofTint,
    roughness: 0.64,
    metalness: 0.12,
    flatShading: true,
    bumpMap,
    bumpScale: 0.05,
  });
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffb84d,
    emissive: 0xff6b1a,
    emissiveIntensity: 2.1,
    roughness: 0.18,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe082,
    emissive: 0xff9100,
    emissiveIntensity: 3.2,
    roughness: 0.1,
  });

  // Part 1: Stone Foundation Plinth + Front Porch Steps
  const foundation = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.36, 0.92, depth + 0.36),
    stoneMat
  );
  foundation.position.y = 0.46;
  foundation.castShadow = true;
  foundation.receiveShadow = true;
  group.add(foundation);

  const porchStep1 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.32, 0.85), stoneMat);
  porchStep1.position.set(0, 0.16, depth / 2 + 0.48);
  group.add(porchStep1);
  const porchStep2 = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.32, 0.55), stoneMat);
  porchStep2.position.set(0, 0.48, depth / 2 + 0.32);
  group.add(porchStep2);

  // Part 2: Main Timber-Plaster Lower & Upper Hull (slight medieval jetty overhang on upper floor)
  const lowerH = height * 0.48;
  const upperH = height * 0.52;
  const lowerBody = new THREE.Mesh(
    new THREE.BoxGeometry(width - 0.12, lowerH, depth - 0.12),
    plasterMat
  );
  lowerBody.position.y = 0.9 + lowerH / 2;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  group.add(lowerBody);

  const upperBody = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.14, upperH, depth + 0.14),
    plasterMat
  );
  upperBody.position.y = 0.9 + lowerH + upperH / 2;
  upperBody.castShadow = true;
  upperBody.receiveShadow = true;
  group.add(upperBody);

  // Part 3: Rich Tudor Dark Oak Timber Framing (Vertical studs, horizontal jetty beams, diagonal braces)
  const postGeo = new THREE.BoxGeometry(0.24, height + 0.12, 0.24);
  for (const sx of [-1, -0.36, 0.36, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, timberMat);
      post.position.set(sx * (width / 2), 0.9 + height / 2, sz * (depth / 2 + 0.04));
      group.add(post);
    }
  }
  for (const bandFactor of [0.02, 0.48, 0.98]) {
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.28, 0.22, depth + 0.28),
      timberMat
    );
    beam.position.y = 0.9 + height * bandFactor;
    group.add(beam);
  }

  // Diagonal Tudor timber braces on front & back facades
  const braceGeo = new THREE.BoxGeometry(0.16, upperH * 0.95, 0.12);
  for (const sx of [-1, 1]) {
    const brace = new THREE.Mesh(braceGeo, timberMat);
    brace.position.set(sx * (width * 0.33), 0.9 + lowerH + upperH * 0.5, depth / 2 + 0.07);
    brace.rotation.z = sx * 0.42;
    group.add(brace);
  }

  // Part 4: True Steep Pitched Triangular Gable Roof (ExtrudeGeometry prism + Gable Plaster Triangle + Bargeboards)
  const roofHeight = 3.35;
  const roofOverhangW = width * 0.58;
  const roofOverhangD = depth + 0.72;

  const gableWallShape = new THREE.Shape();
  gableWallShape.moveTo(-width * 0.51, 0);
  gableWallShape.lineTo(width * 0.51, 0);
  gableWallShape.lineTo(0, roofHeight - 0.18);
  gableWallShape.closePath();
  const gableWallGeo = new THREE.ExtrudeGeometry(gableWallShape, {
    depth: depth + 0.12,
    bevelEnabled: false,
  });
  gableWallGeo.translate(0, 0, -(depth + 0.12) / 2);
  const gableWall = new THREE.Mesh(gableWallGeo, plasterMat);
  gableWall.position.y = 0.9 + height;
  gableWall.castShadow = true;
  gableWall.receiveShadow = true;
  group.add(gableWall);

  // Two Thick Sloped Roof Planes forming the steep pitched Gable Roof with deep eaves
  const slopeLen = Math.hypot(roofOverhangW, roofHeight);
  const slopeAngle = Math.atan2(roofHeight, roofOverhangW);
  const roofPlaneGeo = new THREE.BoxGeometry(slopeLen + 0.25, 0.24, roofOverhangD);

  for (const side of [-1, 1]) {
    const roofSlope = new THREE.Mesh(roofPlaneGeo, roofMat);
    roofSlope.position.set(
      side * (roofOverhangW * 0.5),
      0.9 + height + roofHeight * 0.5,
      0
    );
    roofSlope.rotation.z = -side * slopeAngle;
    roofSlope.castShadow = true;
    roofSlope.receiveShadow = true;
    group.add(roofSlope);

    // Front & Back carved timber bargeboards along the gable rake
    for (const zSide of [-1, 1]) {
      const barge = new THREE.Mesh(
        new THREE.BoxGeometry(slopeLen + 0.3, 0.28, 0.16),
        timberMat
      );
      barge.position.set(
        side * (roofOverhangW * 0.5),
        0.9 + height + roofHeight * 0.5 - 0.04,
        zSide * (roofOverhangD / 2 - 0.04)
      );
      barge.rotation.z = -side * slopeAngle;
      group.add(barge);
    }
  }

  // Heavy Timber Ridge Beam + Spire Finials at front and back peaks
  const ridgeBeam = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.32, roofOverhangD + 0.25),
    timberMat
  );
  ridgeBeam.position.set(0, 0.9 + height + roofHeight + 0.04, 0);
  group.add(ridgeBeam);

  for (const zSide of [-1, 1]) {
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.75, 6), timberMat);
    finial.position.set(0, 0.9 + height + roofHeight + 0.45, zSide * (roofOverhangD / 2));
    group.add(finial);
  }

  // Part 5: Attic Gable Window + Mullion Cross
  const atticWin = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.18), windowGlowMat);
  atticWin.position.set(0, 0.9 + height + roofHeight * 0.42, depth / 2 + 0.06);
  group.add(atticWin);
  const atticFrame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.08, 0.14), timberMat);
  atticFrame.position.set(0, 0.9 + height + roofHeight * 0.42, depth / 2 + 0.04);
  group.add(atticFrame);

  // Part 6: Tall Stone Chimney Stack + Twin Terracotta Chimney Pots
  const chimneyH = height + roofHeight * 0.92;
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, chimneyH, 0.92),
    stoneMat
  );
  const chimX = width * 0.34;
  const chimZ = -depth * 0.22;
  chimney.position.set(chimX, chimneyH / 2 + 0.45, chimZ);
  chimney.castShadow = true;
  group.add(chimney);

  const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.24, 1.12), timberMat);
  chimneyCap.position.set(chimX, chimneyH + 0.5, chimZ);
  group.add(chimneyCap);

  for (const potOffset of [-0.22, 0.22]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.55, 10), stoneMat);
    pot.position.set(chimX + potOffset, chimneyH + 0.85, chimZ);
    group.add(pot);
  }

  // Part 7: Framed Heavy Oak Door + Stone Archway + Hanging Facade Lantern
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 2.35, 0.3),
    stoneMat
  );
  doorFrame.position.set(0, 1.68, depth / 2 + 0.05);
  group.add(doorFrame);

  const doorSlab = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 2.08, 0.34),
    timberMat
  );
  doorSlab.position.set(0, 1.58, depth / 2 + 0.06);
  group.add(doorSlab);

  // Hanging Wrought-Iron Wall Lantern beside the door
  const lanternBracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.45), timberMat);
  lanternBracket.position.set(0.95, 2.55, depth / 2 + 0.25);
  group.add(lanternBracket);
  const wallLantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), lanternGlowMat);
  wallLantern.position.set(0.95, 2.32, depth / 2 + 0.42);
  group.add(wallLantern);

  // Part 8: Mullioned Leaded Glass Windows with Wooden Shutters & Stone Sills (Front & Side facades)
  const winGeo = new THREE.BoxGeometry(0.92, 1.15, 0.16);
  const shutterGeo = new THREE.BoxGeometry(0.28, 1.18, 0.14);
  const sillGeo = new THREE.BoxGeometry(1.38, 0.14, 0.28);

  for (const wx of [-width * 0.29, width * 0.29]) {
    const wy = 0.9 + height * 0.64;
    const wz = depth / 2 + 0.08;
    const w = new THREE.Mesh(winGeo, windowGlowMat);
    w.position.set(wx, wy, wz);
    group.add(w);

    // Mullion crossbars
    const mV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.18, 0.2), timberMat);
    mV.position.set(wx, wy, wz + 0.02);
    group.add(mV);
    const mH = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.08, 0.2), timberMat);
    mH.position.set(wx, wy, wz + 0.02);
    group.add(mH);

    // Left & right shutters + sill
    for (const sSide of [-1, 1]) {
      const shutter = new THREE.Mesh(shutterGeo, timberMat);
      shutter.position.set(wx + sSide * 0.58, wy, wz + 0.01);
      group.add(shutter);
    }
    const sill = new THREE.Mesh(sillGeo, stoneMat);
    sill.position.set(wx, wy - 0.62, wz + 0.04);
    group.add(sill);
  }

  // Side Facade Glowing Windows so cottages look rich from every 360° angle
  const sideWinGeo = new THREE.BoxGeometry(0.18, 1.05, 0.88);
  for (const sx of [-1, 1]) {
    for (const sz of [-depth * 0.22, depth * 0.22]) {
      const sw = new THREE.Mesh(sideWinGeo, windowGlowMat);
      sw.position.set(sx * (width / 2 + 0.06), 0.9 + height * 0.64, sz);
      group.add(sw);
    }
  }

  group.add(createContactShadowDisc(Math.max(width, depth) * 0.76, 0.58));
  return group;
}

/**
 * 3. Composite 8-Part Sacrificial Bonfire & Gallows Altar Plaza at (0, 0)
 */
export function createBonfireAndGallowsPlaza(): {
  group: THREE.Group;
  outerFlame: THREE.Mesh;
  innerFlame: THREE.Mesh;
} {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x4d3c49,
    roughness: 0.85,
    metalness: 0.12,
  });
  const charredWoodMat = new THREE.MeshStandardMaterial({
    color: 0x1b1310,
    roughness: 0.9,
    metalness: 0.05,
  });
  const ropeMat = new THREE.MeshStandardMaterial({
    color: 0x9c8259,
    roughness: 0.75,
    metalness: 0.05,
  });

  // Part 1: Raised Circular Altar Dais (y = 0.025 to prevent Z-fighting)
  const dais = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.6, 0.28, 24),
    stoneMat
  );
  dais.position.y = 0.14;
  dais.receiveShadow = true;
  group.add(dais);

  // Part 2: Ring of 10 Carved Fire-Pit Stones
  const boulderGeo = new THREE.DodecahedronGeometry(0.42, 0);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const stone = new THREE.Mesh(boulderGeo, stoneMat);
    stone.position.set(Math.cos(a) * 1.65, 0.35, Math.sin(a) * 1.65);
    stone.rotation.set(i * 0.5, a, 0.2);
    stone.scale.set(1.1, 0.75, 0.95);
    group.add(stone);
  }

  // Part 3: Stacked Charred Timber Logs in the Pit
  const logGeo = new THREE.CylinderGeometry(0.18, 0.2, 2.3, 8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    const log = new THREE.Mesh(logGeo, charredWoodMat);
    log.position.set(0, 0.48 + (i % 2) * 0.14, 0);
    log.rotation.set(Math.PI / 2 - 0.28, a, 0);
    group.add(log);
  }

  // Part 4 & 5: Multi-Layered Flickering Bonfire Cones
  const outerFlameMat = new THREE.MeshStandardMaterial({
    color: 0xff4500,
    emissive: 0xff3300,
    emissiveIntensity: 3.2,
    roughness: 0.2,
    transparent: true,
    opacity: 0.88,
  });
  const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.4, 9), outerFlameMat);
  outerFlame.position.y = 1.45;
  group.add(outerFlame);

  const innerFlameMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffaa00,
    emissiveIntensity: 4.0,
    roughness: 0.1,
  });
  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.65, 8), innerFlameMat);
  innerFlame.position.y = 1.25;
  group.add(innerFlame);

  // Part 6: Ancient Wooden Gallows Frame behind the fire (x = 4.6, z = -4.2)
  const gallowsGroup = new THREE.Group();
  gallowsGroup.name = 'gallows';
  gallowsGroup.visible = false;
  gallowsGroup.position.set(5.2, 0, -5.2);
  gallowsGroup.rotation.y = -Math.PI / 4;

  const platform = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 2.6), charredWoodMat);
  platform.position.y = 0.28;
  platform.castShadow = true;
  platform.receiveShadow = true;
  gallowsGroup.add(platform);

  const upright = new THREE.Mesh(new THREE.BoxGeometry(0.32, 4.4, 0.32), charredWoodMat);
  upright.position.set(-1.1, 2.4, 0);
  upright.castShadow = true;
  gallowsGroup.add(upright);

  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 0.32), charredWoodMat);
  topBeam.position.set(-0.1, 4.45, 0);
  topBeam.castShadow = true;
  gallowsGroup.add(topBeam);

  // Part 7: Hanging Noose Rope (Cylinder + Torus)
  const ropeLine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), ropeMat);
  ropeLine.position.set(0.55, 3.85, 0);
  gallowsGroup.add(ropeLine);

  const nooseLoop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 16), ropeMat);
  nooseLoop.position.set(0.55, 3.12, 0);
  gallowsGroup.add(nooseLoop);

  group.add(gallowsGroup);
  group.add(createContactShadowDisc(4.0, 0.5));

  return { group, outerFlame, innerFlame };
}

let cachedFabricBump: THREE.CanvasTexture | null = null;
function getFabricBumpTexture(): THREE.CanvasTexture {
  if (cachedFabricBump) return cachedFabricBump;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  // Subtle woven damask/velvet crosshatch + vertical drapery pleats
  for (let x = 0; x < size; x += 2) {
    const pleat = Math.floor(128 + Math.sin((x / size) * Math.PI * 16) * 36);
    ctx.fillStyle = `rgb(${pleat},${pleat},${pleat})`;
    ctx.fillRect(x, 0, 1, size);
  }
  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, y, size, 1);
  }

  cachedFabricBump = new THREE.CanvasTexture(canvas);
  cachedFabricBump.colorSpace = THREE.NoColorSpace;
  cachedFabricBump.wrapS = THREE.RepeatWrapping;
  cachedFabricBump.wrapT = THREE.RepeatWrapping;
  cachedFabricBump.repeat.set(4, 3);
  return cachedFabricBump;
}

/**
 * 4. High-Craft Sculpted 3D Player / Villager Avatar (36-Segment Smooth Surfaces & Articulated Limbs)
 * Supports live customization of Cloak, Trim, Headgear, Lantern, Walking Gait, and Night Werewolf Form.
 */
export function createCharacterAvatar(
  appearance: CharacterAppearance,
  isWerewolfBeast = false,
  isAlive = true
): THREE.Group {
  const root = new THREE.Group();

  // Part 1: Soft radial contact shadow on ground
  root.add(createContactShadowDisc(1.02, isAlive ? 0.56 : 0.25));

  if (!isAlive) {
    // Ornate Gothic Gravestone & Floating Soul Wisp for fallen players
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.72,
      metalness: 0.18,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.26, 0.58), stoneMat);
    base.position.y = 0.13;
    root.add(base);

    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.28, 0.24), stoneMat);
    slab.position.y = 0.76;
    slab.castShadow = true;
    root.add(slab);

    const topArch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.39, 0.24, 28),
      stoneMat
    );
    topArch.rotation.x = Math.PI / 2;
    topArch.position.y = 1.4;
    root.add(topArch);

    const ghostMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.8,
      transparent: true,
      opacity: 0.55,
      roughness: 0.15,
      clearcoat: 1.0,
    });
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), ghostMat);
    wisp.position.set(0, 1.92, 0);
    wisp.name = 'avatar_head';
    root.add(wisp);
    return root;
  }

  const fabricBump = getFabricBumpTexture();
  const cloakColor = new THREE.Color(isWerewolfBeast ? '#1c1116' : appearance.cloakColor);
  const trimColor = new THREE.Color(isWerewolfBeast ? '#dc2626' : appearance.trimColor);

  // Velvet/Brocade Physical Material with Sheen & Clearcoat for rich lighting
  const cloakMat = new THREE.MeshPhysicalMaterial({
    color: cloakColor,
    roughness: 0.62,
    metalness: 0.12,
    bumpMap: fabricBump,
    bumpScale: 0.016,
    sheen: 0.85,
    sheenRoughness: 0.35,
    sheenColor: trimColor,
    clearcoat: 0.12,
  });

  const darkLiningMat = new THREE.MeshStandardMaterial({
    color: cloakColor.clone().multiplyScalar(0.45),
    roughness: 0.8,
    metalness: 0.1,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: trimColor,
    roughness: 0.24,
    metalness: 0.82,
  });

  const leatherMat = new THREE.MeshPhysicalMaterial({
    color: 0x181317,
    roughness: 0.42,
    metalness: 0.22,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
  });

  const skinMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(
      isWerewolfBeast ? '#2b1b20' : appearance.skinTone || '#dec9b8'
    ),
    roughness: 0.48,
    metalness: 0.04,
    clearcoat: 0.08,
  });

  const scleraMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const eyeGlowMat = new THREE.MeshStandardMaterial({
    color: isWerewolfBeast ? 0xff1e1e : new THREE.Color(appearance.lanternColor || '#f59e0b'),
    emissive: isWerewolfBeast ? 0xff0000 : new THREE.Color(appearance.lanternColor || '#f59e0b'),
    emissiveIntensity: isWerewolfBeast ? 3.8 : 1.5,
    roughness: 0.1,
  });

  // Part 2: Sculpted Articulated Legs & Cuffed Gothic Boots (Pivot at hip y = 0.72)
  const bootSpline = new THREE.SplineCurve([
    new THREE.Vector2(0.01, 0.0),
    new THREE.Vector2(0.16, 0.02),
    new THREE.Vector2(0.14, 0.14),
    new THREE.Vector2(0.11, 0.34),
    new THREE.Vector2(0.15, 0.56),
    new THREE.Vector2(0.12, 0.68),
  ]);
  const bootLatheGeo = new THREE.LatheGeometry(bootSpline.getPoints(20), 24);
  bootLatheGeo.translate(0, -0.68, 0); // Pivot at top of leg

  const makeBootLeg = (side: -1 | 1, name: string) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.19, 0.68, 0);
    legGroup.name = name;

    const bootShaft = new THREE.Mesh(bootLatheGeo, leatherMat);
    bootShaft.castShadow = true;
    legGroup.add(bootShaft);

    // Rounded boot toe box
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), leatherMat);
    toe.scale.set(0.95, 0.62, 1.45);
    toe.position.set(0, -0.61, 0.09);
    legGroup.add(toe);

    // Metallic ankle strap buckle
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.02, 10, 22), trimMat);
    strap.rotation.x = Math.PI / 2;
    strap.position.set(0, -0.46, 0);
    legGroup.add(strap);

    return legGroup;
  };

  root.add(makeBootLeg(-1, 'avatar_left_leg'));
  root.add(makeBootLeg(1, 'avatar_right_leg'));

  // Part 3: Smooth Sculpted Hourglass Gothic Coat & Flared Skirt (36-segment Spline Lathe)
  const coatCurve = new THREE.SplineCurve([
    new THREE.Vector2(0.56, 0.18),
    new THREE.Vector2(0.52, 0.38),
    new THREE.Vector2(0.42, 0.72),
    new THREE.Vector2(0.31, 1.04), // Tailored waist
    new THREE.Vector2(0.38, 1.38), // Chest
    new THREE.Vector2(0.34, 1.62), // Shoulders
    new THREE.Vector2(0.16, 1.72), // Neck base
  ]);
  const coatGeo = new THREE.LatheGeometry(coatCurve.getPoints(32), 36);
  const coatMesh = new THREE.Mesh(coatGeo, cloakMat);
  coatMesh.castShadow = true;
  coatMesh.receiveShadow = true;
  root.add(coatMesh);

  // Decorative Front Gold Placket & Buttons down the coat torso
  const placket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.08, 1.38, 16),
    trimMat
  );
  placket.scale.set(1, 1, 0.35);
  placket.position.set(0, 0.92, 0.37);
  placket.rotation.x = -0.12;
  root.add(placket);

  // Part 4: Sculpted Waist Belt, Ornate Filigree Buckle & Hip Potion Vial
  const beltTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.315, 0.048, 16, 36),
    leatherMat
  );
  beltTorus.rotation.x = Math.PI / 2;
  beltTorus.position.y = 1.04;
  root.add(beltTorus);

  const buckleFrame = new THREE.Mesh(
    new THREE.TorusGeometry(0.095, 0.024, 12, 24),
    trimMat
  );
  buckleFrame.position.set(0, 1.04, 0.35);
  root.add(buckleFrame);

  // Hip Alchemical Pouch / Vial on Left Hip
  const hipVial = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 16),
    new THREE.MeshPhysicalMaterial({
      color: trimColor,
      emissive: trimColor,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      clearcoat: 1.0,
    })
  );
  hipVial.scale.set(0.85, 1.25, 0.85);
  hipVial.position.set(-0.34, 0.92, 0.14);
  root.add(hipVial);

  // Part 5: Layered Shoulder Mantle Capelet & High Standing Gothic Collar
  const mantleCurve = new THREE.SplineCurve([
    new THREE.Vector2(0.52, 1.32),
    new THREE.Vector2(0.47, 1.48),
    new THREE.Vector2(0.36, 1.64),
    new THREE.Vector2(0.18, 1.72),
  ]);
  const mantleGeo = new THREE.LatheGeometry(mantleCurve.getPoints(20), 36);
  const mantleMesh = new THREE.Mesh(mantleGeo, darkLiningMat);
  mantleMesh.castShadow = true;
  root.add(mantleMesh);

  const mantleTrimRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.51, 0.022, 14, 36),
    trimMat
  );
  mantleTrimRing.rotation.x = Math.PI / 2;
  mantleTrimRing.position.y = 1.33;
  root.add(mantleTrimRing);

  // High Standing Vampire/Inquisitor Collar behind neck
  const highCollarGeo = new THREE.CylinderGeometry(
    0.29,
    0.21,
    0.26,
    28,
    1,
    true,
    Math.PI * 0.65,
    Math.PI * 1.7
  );
  const highCollar = new THREE.Mesh(
    highCollarGeo,
    new THREE.MeshStandardMaterial({
      color: cloakColor,
      roughness: 0.5,
      metalness: 0.2,
      side: THREE.DoubleSide,
    })
  );
  highCollar.position.y = 1.78;
  root.add(highCollar);

  // Neck Column
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 20), skinMat);
  neck.position.y = 1.74;
  root.add(neck);

  // Part 6: Sculpted High-Resolution Head & Expressive Facial Features
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.96;
  headGroup.name = 'avatar_head';

  // Cranium + subtle jaw contour
  const headSphere = new THREE.Mesh(
    new THREE.SphereGeometry(isWerewolfBeast ? 0.34 : 0.285, 32, 32),
    skinMat
  );
  headSphere.scale.set(0.95, 1.06, 0.98);
  headSphere.castShadow = true;
  headGroup.add(headSphere);

  if (isWerewolfBeast) {
    // Fierce Sculpted Lupine Muzzle, Jaw, Fangs & Pointed Ears
    const upperMuzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.22, 0.44, 20),
      skinMat
    );
    upperMuzzle.rotation.x = Math.PI / 2;
    upperMuzzle.position.set(0, -0.02, 0.32);
    headGroup.add(upperMuzzle);

    const lowerJaw = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.16, 0.36, 16),
      skinMat
    );
    lowerJaw.rotation.x = Math.PI / 2 + 0.22;
    lowerJaw.position.set(0, -0.14, 0.28);
    headGroup.add(lowerJaw);

    // White Fangs
    const fangGeo = new THREE.ConeGeometry(0.028, 0.11, 10);
    for (const fx of [-0.07, 0.07]) {
      const fang = new THREE.Mesh(fangGeo, scleraMat);
      fang.rotation.x = Math.PI;
      fang.position.set(fx, -0.08, 0.46);
      headGroup.add(fang);
    }

    // Swept Wolf Ears
    const earGeo = new THREE.ConeGeometry(0.095, 0.38, 16);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * 0.21, 0.34, -0.04);
      ear.rotation.z = -side * 0.24;
      ear.rotation.x = -0.18;
      headGroup.add(ear);
    }
  } else {
    // Sculpted Nose Bridge, Brow Ridge & Ears for Humanoid Gothic Avatar
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.13, 14), skinMat);
    nose.rotation.x = Math.PI / 2 - 0.15;
    nose.position.set(0, -0.01, 0.285);
    headGroup.add(nose);

    const brow = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.026, 10, 20, Math.PI * 0.75),
      darkLiningMat
    );
    brow.rotation.z = Math.PI * 0.125;
    brow.position.set(0, 0.05, 0.235);
    headGroup.add(brow);

    // Sculpted Ears
    const earGeo = new THREE.SphereGeometry(0.06, 12, 12);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.scale.set(0.45, 1.15, 0.75);
      ear.position.set(side * 0.27, 0.0, 0.0);
      headGroup.add(ear);
    }
  }

  // Expressive Layered Eyes (Sclera + Glowing Iris + Pupil)
  for (const side of [-1, 1]) {
    const eyeSocket = new THREE.Group();
    eyeSocket.position.set(side * 0.095, 0.035, 0.248);
    eyeSocket.rotation.y = side * 0.18;

    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.046, 16, 16), scleraMat);
    sclera.scale.set(1.15, 0.88, 0.65);
    eyeSocket.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 14), eyeGlowMat);
    iris.scale.set(1.0, 1.0, 0.55);
    iris.position.z = 0.018;
    eyeSocket.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 10), leatherMat);
    pupil.position.z = 0.032;
    eyeSocket.add(pupil);

    headGroup.add(eyeSocket);
  }

  // Part 7: High-Detail Sculpted Headgear (32-36 segments, Curved Tubes & Lathes)
  if (!isWerewolfBeast) {
    const hatGroup = new THREE.Group();
    switch (appearance.headgear) {
      case 'witch_hat': {
        // Wavy Wide Witch Brim (Spline Lathe)
        const brimSpline = new THREE.SplineCurve([
          new THREE.Vector2(0.26, 0.21),
          new THREE.Vector2(0.44, 0.2),
          new THREE.Vector2(0.64, 0.16),
          new THREE.Vector2(0.66, 0.18),
          new THREE.Vector2(0.28, 0.24),
        ]);
        const brim = new THREE.Mesh(
          new THREE.LatheGeometry(brimSpline.getPoints(18), 36),
          leatherMat
        );
        brim.castShadow = true;
        hatGroup.add(brim);

        // Gold Ribbon & Buckle at Hat Base
        const ribbon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.285, 0.305, 0.09, 32),
          trimMat
        );
        ribbon.position.y = 0.25;
        hatGroup.add(ribbon);

        // Organically Curved Bent Witch Hat Cone
        const coneLevels = 18;
        const conePoints: THREE.Vector2[] = [];
        for (let i = 0; i <= coneLevels; i++) {
          const t = i / coneLevels;
          conePoints.push(new THREE.Vector2((1 - t) * 0.29 + 0.01, t * 0.72));
        }
        const coneGeo = new THREE.LatheGeometry(conePoints, 32);
        // Bend top vertices backward & sideways for authentic storybook silhouette
        const posAttr = coneGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
          const py = posAttr.getY(i);
          const bend = Math.pow(Math.max(0, py / 0.72), 1.85);
          posAttr.setZ(i, posAttr.getZ(i) - bend * 0.26);
          posAttr.setX(i, posAttr.getX(i) + bend * 0.09);
        }
        coneGeo.computeVertexNormals();
        const cone = new THREE.Mesh(coneGeo, cloakMat);
        cone.position.y = 0.27;
        cone.castShadow = true;
        hatGroup.add(cone);
        break;
      }
      case 'plague_mask': {
        // Curved Avian Plague Doctor Beak (Bent Cone)
        const beakGeo = new THREE.ConeGeometry(0.145, 0.56, 28, 12);
        const bPos = beakGeo.attributes.position;
        for (let i = 0; i < bPos.count; i++) {
          const yNorm = (bPos.getY(i) + 0.28) / 0.56;
          bPos.setZ(i, bPos.getZ(i) - Math.pow(yNorm, 2) * 0.14);
        }
        beakGeo.computeVertexNormals();
        const beakMat = new THREE.MeshPhysicalMaterial({
          color: 0xe2dcd0,
          roughness: 0.35,
          metalness: 0.15,
          clearcoat: 0.4,
        });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.rotation.x = Math.PI / 2 + 0.15;
        beak.position.set(0, -0.02, 0.44);
        hatGroup.add(beak);

        // Twin Brass Goggle Rings & Dark Lenses
        for (const side of [-1, 1]) {
          const goggleRim = new THREE.Mesh(
            new THREE.TorusGeometry(0.068, 0.015, 12, 24),
            trimMat
          );
          goggleRim.position.set(side * 0.098, 0.04, 0.27);
          goggleRim.rotation.y = side * 0.2;
          hatGroup.add(goggleRim);
        }

        // Wide-Brimmed Inquisitor Bolero Hat
        const topBrim = new THREE.Mesh(
          new THREE.CylinderGeometry(0.54, 0.54, 0.04, 36),
          leatherMat
        );
        topBrim.position.y = 0.22;
        hatGroup.add(topBrim);

        const topCrown = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.29, 0.34, 32),
          leatherMat
        );
        topCrown.position.y = 0.39;
        hatGroup.add(topCrown);

        const hatBand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.292, 0.295, 0.06, 32),
          trimMat
        );
        hatBand.position.y = 0.26;
        hatGroup.add(hatBand);
        break;
      }
      case 'hunter_tricorne': {
        // Sculpted Bloodborne-style Hunter Tricorne with Sweeping Plume Feather
        const baseCrown = new THREE.Mesh(
          new THREE.SphereGeometry(0.295, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.55),
          leatherMat
        );
        baseCrown.position.y = 0.14;
        hatGroup.add(baseCrown);

        // 3 Upturned Tricorne Flaps
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 + Math.PI / 2;
          const flap = new THREE.Mesh(
            new THREE.TorusGeometry(0.36, 0.065, 14, 28, Math.PI * 0.72),
            leatherMat
          );
          flap.rotation.x = Math.PI / 2 + 0.38;
          flap.rotation.z = angle;
          flap.position.y = 0.24;
          hatGroup.add(flap);
        }

        // Sweeping Crimson Plume Feather
        const plumeCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.22, 0.26, 0.1),
          new THREE.Vector3(0.32, 0.44, -0.08),
          new THREE.Vector3(0.26, 0.52, -0.34),
        ]);
        const plume = new THREE.Mesh(
          new THREE.TubeGeometry(plumeCurve, 16, 0.045, 10, false),
          cloakMat
        );
        hatGroup.add(plume);
        break;
      }
      case 'noble_crown': {
        const goldMat = new THREE.MeshPhysicalMaterial({
          color: 0xfbbf24,
          roughness: 0.18,
          metalness: 0.92,
          clearcoat: 0.5,
        });
        // Velvet Inner Cap
        const innerCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.27, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
          cloakMat
        );
        innerCap.position.y = 0.18;
        hatGroup.add(innerCap);

        // Ornate Gold Circlet Base
        const circlet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.295, 0.275, 0.14, 32),
          goldMat
        );
        circlet.position.y = 0.24;
        hatGroup.add(circlet);

        // 8 Crown Spires & Glowing Gems
        const spireGeo = new THREE.ConeGeometry(0.048, 0.2, 12);
        const gemGeo = new THREE.OctahedronGeometry(0.032, 0);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const spire = new THREE.Mesh(spireGeo, goldMat);
          spire.position.set(Math.cos(a) * 0.285, 0.38, Math.sin(a) * 0.285);
          hatGroup.add(spire);

          const gem = new THREE.Mesh(gemGeo, eyeGlowMat);
          gem.position.set(Math.cos(a) * 0.298, 0.24, Math.sin(a) * 0.298);
          hatGroup.add(gem);
        }
        break;
      }
      case 'wolf_skull': {
        const boneMat = new THREE.MeshPhysicalMaterial({
          color: 0xebe5d8,
          roughness: 0.42,
          metalness: 0.08,
          clearcoat: 0.2,
        });
        const craniumHelm = new THREE.Mesh(
          new THREE.SphereGeometry(0.315, 28, 22),
          boneMat
        );
        craniumHelm.scale.set(0.96, 0.92, 1.15);
        craniumHelm.position.set(0, 0.14, 0.02);
        hatGroup.add(craniumHelm);

        const snoutBone = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.21, 0.42, 20),
          boneMat
        );
        snoutBone.rotation.x = Math.PI / 2 - 0.18;
        snoutBone.position.set(0, 0.12, 0.28);
        hatGroup.add(snoutBone);

        // Twin Sweeping Dark Horns
        for (const side of [-1, 1]) {
          const hornCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(side * 0.22, 0.22, 0.0),
            new THREE.Vector3(side * 0.38, 0.38, -0.14),
            new THREE.Vector3(side * 0.28, 0.56, -0.28),
          ]);
          const horn = new THREE.Mesh(
            new THREE.TubeGeometry(hornCurve, 16, 0.048, 12, false),
            leatherMat
          );
          hatGroup.add(horn);
        }
        break;
      }
      case 'crimson_hood':
      default: {
        // Sculpted Draped Gothic Cowl Hood with Trailing Point
        const cowlDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.335, 32, 28),
          cloakMat
        );
        cowlDome.scale.set(0.98, 1.08, 1.08);
        cowlDome.position.set(0, 0.05, -0.03);
        hatGroup.add(cowlDome);

        // Gold-Trimmed Face Opening Arch
        const hoodOpening = new THREE.Mesh(
          new THREE.TorusGeometry(0.265, 0.026, 14, 32),
          trimMat
        );
        hoodOpening.position.set(0, 0.03, 0.19);
        hatGroup.add(hoodOpening);

        // Curved Trailing Lyric Hood Tail
        const tailCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.26, -0.18),
          new THREE.Vector3(0, 0.36, -0.38),
          new THREE.Vector3(0, 0.22, -0.54),
        ]);
        const hoodTail = new THREE.Mesh(
          new THREE.TubeGeometry(tailCurve, 16, 0.085, 14, false),
          cloakMat
        );
        hatGroup.add(hoodTail);
        break;
      }
    }
    headGroup.add(hatGroup);
  }

  root.add(headGroup);

  // Part 8: Articulated Multi-Jointed Arms (Shoulder Pauldron + Tapered Sleeve + Cuff + Gloved Hand)
  const buildArm = (side: -1 | 1, isHoldingLantern: boolean) => {
    const armRoot = new THREE.Group();
    armRoot.position.set(side * 0.39, 1.54, 0.02);
    armRoot.name = side === -1 ? 'avatar_left_arm' : 'avatar_right_arm';

    // Rounded Shoulder Pauldron
    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.135, 20, 16),
      cloakMat
    );
    pauldron.scale.set(1.1, 0.85, 1.0);
    armRoot.add(pauldron);

    // Tapered Sleeve
    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.115, 0.56, 20),
      cloakMat
    );
    sleeve.position.set(side * 0.06, -0.26, isHoldingLantern ? 0.14 : 0.04);
    sleeve.rotation.z = side * 0.18;
    sleeve.rotation.x = isHoldingLantern ? -0.52 : -0.12;
    sleeve.castShadow = true;
    armRoot.add(sleeve);

    // Gold Embroidered Cuff Ring
    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.095, 0.02, 12, 20),
      trimMat
    );
    cuff.rotation.x = Math.PI / 2 + (isHoldingLantern ? -0.52 : -0.12);
    cuff.position.set(
      side * 0.11,
      isHoldingLantern ? -0.46 : -0.52,
      isHoldingLantern ? 0.28 : 0.08
    );
    armRoot.add(cuff);

    // Sculpted Gloved Hand
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 16, 16),
      isWerewolfBeast ? skinMat : leatherMat
    );
    hand.scale.set(0.85, 1.15, 0.95);
    hand.position.set(
      side * 0.12,
      isHoldingLantern ? -0.52 : -0.58,
      isHoldingLantern ? 0.34 : 0.1
    );
    armRoot.add(hand);

    return armRoot;
  };

  root.add(buildArm(-1, false));
  const rightArmGroup = buildArm(1, true);
  root.add(rightArmGroup);

  // Part 9: Ornate Multi-Part Wrought-Iron Gothic Lantern attached to Right Hand
  const lanternGroup = new THREE.Group();
  lanternGroup.position.set(0.14, -0.62, 0.42);
  lanternGroup.name = 'avatar_lantern';

  // Hanging Ring Bail
  const bail = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.012, 10, 20),
    trimMat
  );
  bail.position.y = 0.24;
  lanternGroup.add(bail);

  // Flared Pagoda Top Cap
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.15, 16), leatherMat);
  cap.position.y = 0.15;
  lanternGroup.add(cap);

  // Glowing Inner Crystal Flame Core
  const lanternColor = new THREE.Color(appearance.lanternColor || '#f59e0b');
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: lanternColor,
    emissive: lanternColor,
    emissiveIntensity: 3.2,
    roughness: 0.1,
    clearcoat: 1.0,
  });
  const lanternCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.08, 0.24, 20),
    glassMat
  );
  lanternGroup.add(lanternCore);

  // 4 Wrought-Iron Cage Ribs around the glass
  const ribGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.26, 8);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const rib = new THREE.Mesh(ribGeo, leatherMat);
    rib.position.set(Math.cos(a) * 0.105, 0, Math.sin(a) * 0.105);
    lanternGroup.add(rib);
  }

  // Tapered Bottom Cup & Finial
  const baseCup = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.12, 16),
    leatherMat
  );
  baseCup.rotation.x = Math.PI;
  baseCup.position.y = -0.16;
  lanternGroup.add(baseCup);

  rightArmGroup.add(lanternGroup);

  // Part 10: Ground Aura / Voice-Speaking / Selection Ring (y = 0.024)
  const ringGeo = new THREE.RingGeometry(0.68, 0.92, 36);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const auraRing = new THREE.Mesh(ringGeo, ringMat);
  auraRing.position.y = 0.024;
  auraRing.name = 'avatar_aura_ring';
  root.add(auraRing);

  // Part 11: 3D Overhead Target Reticle Crystal (visible when targeted in 3D scene)
  const targetMarkerGroup = new THREE.Group();
  targetMarkerGroup.position.set(0, 3.32, 0);
  targetMarkerGroup.name = 'avatar_target_marker';
  targetMarkerGroup.visible = false;

  const diamondGeo = new THREE.OctahedronGeometry(0.22, 0);
  diamondGeo.scale(0.85, 1.45, 0.85);
  const diamondMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xdc2626,
    emissiveIntensity: 2.6,
    roughness: 0.15,
    metalness: 0.8,
  });
  const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
  targetMarkerGroup.add(diamondMesh);

  const haloRingGeo = new THREE.TorusGeometry(0.32, 0.028, 8, 24);
  haloRingGeo.rotateX(Math.PI / 2);
  const haloRingMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
  });
  const haloRing = new THREE.Mesh(haloRingGeo, haloRingMat);
  targetMarkerGroup.add(haloRing);

  root.add(targetMarkerGroup);

  return root;
}

/**
 * Generates a crisp floating 3D Sprite nameplate for a player in the Gothic Village.
 */
export function createPlayerLabelSprite(
  name: string,
  epithet: string,
  seatIndex: number,
  isAlive: boolean,
  isSpeaking: boolean,
  voteCount: number,
  isLocal: boolean,
  isSelected = false,
  compact = false,
  isHost = false,
  speech?: string
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = compact && !speech ? 320 : 384;
  canvas.height = compact ? (speech ? 64 + speechLines(speech).length * 30 : 72) : 112;
  const ctx = canvas.getContext('2d')!;

  if (compact) {
    return createCompactPlayerLabelSprite(canvas, ctx, name, isAlive, isSpeaking, voteCount, isLocal, isSelected, isHost, speech);
  }

  // Dark Gothic plaque background
  ctx.fillStyle = speech ? 'rgba(18, 14, 27, 0.98)' : isSelected
    ? 'rgba(110, 18, 28, 0.95)'
    : isSpeaking
    ? 'rgba(20, 48, 36, 0.92)'
    : isLocal
    ? 'rgba(42, 18, 26, 0.92)'
    : 'rgba(13, 12, 19, 0.88)';
  ctx.strokeStyle = isSelected
    ? '#fbbf24'
    : isSpeaking
    ? '#10b981'
    : voteCount > 0
    ? '#ef4444'
    : isLocal
    ? '#f59e0b'
    : 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = isSelected ? 4.5 : 3;

  ctx.beginPath();
  ctx.roundRect(12, 10, 360, 88, 12);
  ctx.fill();
  ctx.stroke();

  // Seat Number Badge
  ctx.fillStyle = isSelected ? '#fde047' : isAlive ? '#d4af37' : '#64748b';
  ctx.font = 'bold 20px "Be Vietnam Pro", sans-serif';
  ctx.fillText(`#${seatIndex + 1}`, 28, 44);

  // Player Name
  ctx.fillStyle = isAlive ? '#f8fafc' : '#94a3b8';
  ctx.font = 'bold 24px "Be Vietnam Pro", sans-serif';
  const displayName = name.length > 16 ? name.slice(0, 15) + '…' : name;
  ctx.fillText(displayName, 76, 45);

  // Subtitle / Status
  ctx.fillStyle = isSelected
    ? '#fde047'
    : isSpeaking
    ? '#34d399'
    : !isAlive
    ? '#f87171'
    : '#cbd5e1';
  ctx.font = '600 17px "Be Vietnam Pro", sans-serif';
  const statusText = !isAlive
    ? 'Đã Bỏ Mạng'
    : isSelected
    ? '🎯 ĐÃ CHỌN MỤC TIÊU 3D'
    : isSpeaking
    ? 'Đang phát biểu (Voice)...'
    : epithet || 'Dân Làng';
  ctx.fillText(statusText, 76, 76);

  // Vote counter badge on right
  if (voteCount > 0) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(336, 52, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(voteCount), 336, 60);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(isSelected ? 2.02 : 1.85, isSelected ? 0.58 : 0.52, 1);
  sprite.position.set(0, 3.4, 0);
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * Compact (mobile) overhead nameplate: only the player name, rendered larger so it
 * stays legible on small screens where the panoramic camera sits far away.
 */
function createCompactPlayerLabelSprite(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  name: string,
  isAlive: boolean,
  isSpeaking: boolean,
  voteCount: number,
  isLocal: boolean,
  isSelected: boolean,
  isHost: boolean,
  speech?: string
): THREE.Sprite {
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = speech ? 'rgba(18, 14, 27, 0.98)' : isSelected
    ? 'rgba(110, 18, 28, 0.95)'
    : isSpeaking
    ? 'rgba(20, 48, 36, 0.92)'
    : isLocal
    ? 'rgba(42, 18, 26, 0.92)'
    : 'rgba(13, 12, 19, 0.9)';
  ctx.strokeStyle = isSelected
    ? '#fbbf24'
    : isSpeaking
    ? '#10b981'
    : voteCount > 0
    ? '#ef4444'
    : isLocal
    ? '#f59e0b'
    : 'rgba(212, 175, 55, 0.55)';
  ctx.lineWidth = isSelected ? 4.5 : 3;

  ctx.beginPath();
  ctx.roundRect(6, 6, w - 12, h - 12, 11);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isAlive ? '#f8fafc' : '#94a3b8';
  ctx.font = 'bold 31px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const displayName = name.length > 14 ? name.slice(0, 13) + '…' : name;
  if (isHost) {
    ctx.save();
    if (speech) { ctx.translate(0, 6); ctx.scale(0.7, 0.7); }
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(20, 24); ctx.lineTo(30, 31); ctx.lineTo(38, 18); ctx.lineTo(46, 31); ctx.lineTo(56, 24); ctx.lineTo(52, 47); ctx.lineTo(24, 47); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = isAlive ? '#f8fafc' : '#94a3b8';
  }
  const textLeft = isHost ? 64 : 12;
  const voteSpace = voteCount > 0 ? 56 : 0;
  const textRight = (isSpeaking && isAlive ? w - 48 : w - 12) - voteSpace;
  if (speech) {
    ctx.textAlign = 'left';
    ctx.font = '600 18px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#e8cd82';
    const headerLeft = isHost ? 48 : 18;
    ctx.fillText(displayName, headerLeft, 29, textRight - headerLeft);
    ctx.font = '500 23px "Be Vietnam Pro", sans-serif';
    ctx.fillStyle = '#f8fafc';
    speechLines(speech).forEach((line, index) => ctx.fillText(line, 18, 62 + index * 30, w - 36));
  } else {
    ctx.fillText(displayName, (textLeft + textRight) / 2, h / 2 + 1, textRight - textLeft);
  }

  if (voteCount > 0) {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(w - 34, 36, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 27px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(voteCount), w - 34, 37);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  const labelWidth = speech ? 3 : isSelected ? 2.9 : 2.7;
  sprite.scale.set(labelWidth, speech ? labelWidth * h / w : isSelected ? 0.66 : 0.61, 1);
  mat.fog = false;
  mat.toneMapped = false;
  if (isSpeaking && isAlive) {
    const micCanvas = document.createElement('canvas');
    micCanvas.width = 32;
    micCanvas.height = 48;
    const micCtx = micCanvas.getContext('2d')!;
    micCtx.fillStyle = '#6ee7b7';
    micCtx.beginPath();
    micCtx.roundRect(11, 5, 10, 22, 5);
    micCtx.fill();
    micCtx.strokeStyle = '#6ee7b7';
    micCtx.lineWidth = 3;
    micCtx.lineCap = 'round';
    micCtx.beginPath();
    micCtx.moveTo(6, 21); micCtx.lineTo(6, 25);
    micCtx.arc(16, 25, 10, Math.PI, 0, true);
    micCtx.lineTo(26, 21);
    micCtx.moveTo(16, 35); micCtx.lineTo(16, 42);
    micCtx.moveTo(10, 42); micCtx.lineTo(22, 42);
    micCtx.stroke();
    const micTexture = new THREE.CanvasTexture(micCanvas);
    micTexture.colorSpace = THREE.SRGBColorSpace;
    const mic = new THREE.Sprite(new THREE.SpriteMaterial({ map: micTexture, transparent: true, fog: false, toneMapped: false, depthTest: true, depthWrite: false }));
    mic.name = 'speaking_mic';
    mic.scale.set(0.1, speech ? 40 / h : 0.75, 1);
    mic.position.set(0.41 - voteSpace / w, speech ? 0.5 - 29 / h : 0, 0.01);
    mic.renderOrder = 11;
    sprite.add(mic);
  }
  sprite.position.set(0, speech ? 3.08 + sprite.scale.y / 2 : 3.4, 0);
  sprite.renderOrder = 10;
  return sprite;
}

export interface KickableFireballRig {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  outerAura: THREE.Mesh;
  runeCage: THREE.Group;
  light: THREE.PointLight;
  groundScorch: THREE.Mesh;
  hitbox: THREE.Mesh;
  sparkInstanced: THREE.InstancedMesh;
}

/**
 * Creates the interactive 3D Kickable Fireball ("Quả Cầu Lửa") in the Village Square
 * with molten magma core, intersecting wrought-iron rune bands, outer flame shell,
 * dynamic PointLight, and a pooled 18-spark trail InstancedMesh.
 */
export function createKickableFireball(scene: THREE.Scene): KickableFireballRig {
  const group = new THREE.Group();
  group.name = 'kickable_fireball_root';
  group.position.set(-2.6, 0.52, 8.2);

  // 1. Molten Magma Core Sphere
  const coreGeo = new THREE.IcosahedronGeometry(0.42, 3);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xffd166,
    emissive: 0xff4500,
    emissiveIntensity: 3.4,
    roughness: 0.22,
    metalness: 0.1,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.castShadow = true;
  group.add(coreMesh);

  // 2. Intersecting Wrought-Iron & Gold Runic Bands (spin when kicked)
  const runeCage = new THREE.Group();
  const ironBandMat = new THREE.MeshStandardMaterial({
    color: 0x261c1a,
    emissive: 0x9e1b24,
    emissiveIntensity: 0.65,
    roughness: 0.35,
    metalness: 0.85,
  });
  const goldStudMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xff8800,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.9,
  });

  const ringGeo = new THREE.TorusGeometry(0.46, 0.036, 10, 28);
  const ring1 = new THREE.Mesh(ringGeo, ironBandMat);
  const ring2 = new THREE.Mesh(ringGeo, ironBandMat);
  ring2.rotation.x = Math.PI / 2;
  const ring3 = new THREE.Mesh(ringGeo, goldStudMat);
  ring3.rotation.y = Math.PI / 2;
  runeCage.add(ring1, ring2, ring3);
  group.add(runeCage);

  // 3. Translucent Blazing Outer Flame Shell
  const auraGeo = new THREE.IcosahedronGeometry(0.54, 2);
  const auraMat = new THREE.MeshBasicMaterial({
    color: 0xff6b00,
    transparent: true,
    opacity: 0.42,
    wireframe: true,
  });
  const outerAura = new THREE.Mesh(auraGeo, auraMat);
  group.add(outerAura);

  // 4. Dynamic Fireball PointLight illuminating cobblestones & players
  const light = new THREE.PointLight(0xff5500, 3.6, 11.5, 1.5);
  light.position.set(0, 0.15, 0);
  group.add(light);

  // 5. Ground Ember Ring (stays anchored near ground beneath the ball)
  const scorchGeo = new THREE.RingGeometry(0.42, 0.72, 28);
  scorchGeo.rotateX(-Math.PI / 2);
  const scorchMat = new THREE.MeshBasicMaterial({
    color: 0xff6b1a,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const groundScorch = new THREE.Mesh(scorchGeo, scorchMat);
  groundScorch.position.y = -0.49;
  group.add(groundScorch);

  // 7. Raycast Hitbox so players can also tap/click the Fireball to kick it
  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(0.88, 12, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hitbox.userData.isFireball = true;
  group.add(hitbox);

  scene.add(group);

  // 8. Pooled 18-Particle Fire Spark Trail InstancedMesh
  const sparkGeo = new THREE.OctahedronGeometry(0.085, 0);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xff9922 });
  const sparkInstanced = new THREE.InstancedMesh(sparkGeo, sparkMat, 18);
  sparkInstanced.frustumCulled = false;
  scene.add(sparkInstanced);

  return {
    group,
    coreMesh,
    outerAura,
    runeCage,
    light,
    groundScorch,
    hitbox,
    sparkInstanced,
  };
}

/**
 * Populates the surrounding Gothic Village architecture, street lanterns,
 * multi-tiered 3D Cypress Pines & Multi-Branch Gnarled Oaks, 3D Gothic Mountain Range
 * & Hilltop Ruined Castle background, and returns obstacle colliders.
 */
export function buildGothicVillageEnvironment(
  scene: THREE.Scene,
  maxAnisotropy: number
): {
  obstacles: CircleObstacle[];
  buildingMap: Map<number, THREE.Object3D>;
  outerFlame: THREE.Mesh;
  innerFlame: THREE.Mesh;
  bellMesh: THREE.Object3D | null;
  emberInstanced: THREE.InstancedMesh;
  lampGlowMat: THREE.MeshStandardMaterial;
} {
  const obstacles: CircleObstacle[] = [];
  const buildingMap = new Map<number, THREE.Object3D>();
  const { colorMap, bumpMap } = createCobblestoneTextures(maxAnisotropy);
  const stoneBump = createStoneMasonryBump(maxAnisotropy);

  // 1. Expansive Ground Terrain (radius 110m so no rectangular walls exist)
  const groundGeo = new THREE.CircleGeometry(110, 48);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: colorMap,
    bumpMap,
    bumpScale: 0.06,
    roughness: 0.84,
    metalness: 0.08,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.receiveShadow = true;
  scene.add(ground);

  // 2. Cobblestone Village Plaza Ring + Radial Flagstone Walkways (offset y = 0.012 to prevent Z-fighting)
  const plazaRingGeo = new THREE.RingGeometry(3.4, 11.4, 48);
  plazaRingGeo.rotateX(-Math.PI / 2);
  const plazaRingMat = new THREE.MeshStandardMaterial({
    color: 0x735b68,
    roughness: 0.72,
    metalness: 0.15,
    bumpMap: stoneBump,
    bumpScale: 0.04,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const plazaRing = new THREE.Mesh(plazaRingGeo, plazaRingMat);
  plazaRing.position.y = 0.012;
  plazaRing.receiveShadow = true;
  scene.add(plazaRing);

  // Outer stone curb ring around the village square
  const outerCurbGeo = new THREE.RingGeometry(23.8, 24.9, 48);
  outerCurbGeo.rotateX(-Math.PI / 2);
  const outerCurb = new THREE.Mesh(outerCurbGeo, plazaRingMat);
  outerCurb.position.y = 0.014;
  outerCurb.receiveShadow = true;
  scene.add(outerCurb);

  // 3. Central Sacrificial Bonfire & Gallows Altar at (0, 0)
  const { group: bonfireGroup, outerFlame, innerFlame } = createBonfireAndGallowsPlaza();
  scene.add(bonfireGroup);
  obstacles.push({ x: 0, z: 0, radius: 3.1, label: 'Lửa Thiêng Trung Tâm' });

  // 4. Tall Gothic Bell Tower Landmark at (0, -28) framed in initial spawn vista!
  const bellTower = createGothicBellTower(stoneBump);
  bellTower.position.set(0, 0, -28);
  scene.add(bellTower);
  const bellObsIdx = obstacles.length;
  obstacles.push({ x: 0, z: -28, radius: 4.4, label: 'Tháp Chuông Cổ' });
  buildingMap.set(bellObsIdx, bellTower);
  const bellMesh = bellTower.getObjectByName('cathedral_bell') || null;

  // 5. Ring of 6 Architectural Timbered Gothic Cottages around the outer Village Square
  const cottageSpecs = [
    { x: -21, z: -17, rotY: Math.PI * 0.25, w: 5.6, d: 6.4, h: 4.8, tint: 0x934a3d },
    { x: 21, z: -17, rotY: -Math.PI * 0.25, w: 5.4, d: 6.0, h: 5.0, tint: 0x225d67 },
    { x: -25, z: 4, rotY: Math.PI * 0.48, w: 6.0, d: 6.5, h: 4.5, tint: 0x355480 },
    { x: 25, z: 4, rotY: -Math.PI * 0.48, w: 5.8, d: 6.2, h: 4.7, tint: 0x5b3c78 },
    { x: -20, z: 23, rotY: Math.PI * 0.76, w: 5.2, d: 5.8, h: 4.4, tint: 0x356552 },
    { x: 20, z: 23, rotY: -Math.PI * 0.76, w: 5.5, d: 6.0, h: 4.6, tint: 0x81344a },
  ];

  for (const spec of cottageSpecs) {
    const cottage = createGothicCottage(spec.w, spec.d, spec.h, spec.tint, stoneBump);
    cottage.position.set(spec.x, 0, spec.z);
    cottage.rotation.y = spec.rotY;
    scene.add(cottage);
    const cottageObsIdx = obstacles.length;
    obstacles.push({ x: spec.x, z: spec.z, radius: 4.4, label: 'Nhà Cổ Gothic' });
    buildingMap.set(cottageObsIdx, cottage);
  }

  // 6. Wrought-Iron Street Lamp Posts around the outer plaza (clear of camera sightlines)
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x18181f,
    roughness: 0.38,
    metalness: 0.82,
  });
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffb347,
    emissive: 0xff8800,
    emissiveIntensity: 2.5,
  });

  const lampAngles = [0.35, 1.05, 2.1, 2.8, 3.55, 4.3, 5.1, 5.95];
  for (const angle of lampAngles) {
    const lx = Math.cos(angle) * 14.6;
    const lz = Math.sin(angle) * 14.6;
    const lampGroup = new THREE.Group();
    lampGroup.position.set(lx, 0, lz);

    const basePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.65, 8), postMat);
    basePedestal.position.y = 0.325;
    lampGroup.add(basePedestal);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 3.6, 10), postMat);
    pole.position.y = 1.95;
    lampGroup.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), postMat);
    arm.position.set(0.26, 3.65, 0);
    lampGroup.add(arm);

    const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.22, 6), postMat);
    lanternCap.position.set(0.52, 3.56, 0);
    lampGroup.add(lanternCap);

    const lanternBulb = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), lampGlowMat);
    lanternBulb.position.set(0.52, 3.35, 0);
    lampGroup.add(lanternBulb);

    lampGroup.add(createContactShadowDisc(0.58, 0.38));
    scene.add(lampGroup);
    const lampObsIdx = obstacles.length;
    obstacles.push({ x: lx, z: lz, radius: 0.45 });
    buildingMap.set(lampObsIdx, lampGroup);
  }

  // 7. Upgraded 3D Forest: Multi-Tiered Gothic Cypress Pines (36 trees) + Multi-Branch Ancient Oaks (28 trees)
  const dummy = new THREE.Object3D();
  const colorScratch = new THREE.Color();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x4d2e22,
    roughness: 0.88,
    metalness: 0.05,
    bumpMap: stoneBump,
    bumpScale: 0.04,
  });
  const pineNeedleMat = new THREE.MeshStandardMaterial({
    // Instance colors supply the foliage palette; a dark base would mute it twice.
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.06,
    flatShading: true,
  });
  const oakFoliageMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.06,
    flatShading: true,
  });

  // 7A. 36 Multi-Tiered Gothic Pine / Cypress Trees (Trunk + 3 stacked conical tiers)
  const pineCount = 36;
  const pineTrunkGeo = new THREE.CylinderGeometry(0.18, 0.48, 5.2, 10);
  pineTrunkGeo.translate(0, 2.6, 0);
  const pineTier1Geo = new THREE.ConeGeometry(2.35, 3.4, 9);
  pineTier1Geo.translate(0, 4.2, 0);
  const pineTier2Geo = new THREE.ConeGeometry(1.85, 3.1, 9);
  pineTier2Geo.translate(0, 6.1, 0);
  const pineTier3Geo = new THREE.ConeGeometry(1.25, 2.8, 9);
  pineTier3Geo.translate(0, 7.9, 0);

  const pineTrunks = new THREE.InstancedMesh(pineTrunkGeo, trunkMat, pineCount);
  const pineTier1 = new THREE.InstancedMesh(pineTier1Geo, pineNeedleMat, pineCount);
  const pineTier2 = new THREE.InstancedMesh(pineTier2Geo, pineNeedleMat, pineCount);
  const pineTier3 = new THREE.InstancedMesh(pineTier3Geo, pineNeedleMat, pineCount);
  pineTrunks.castShadow = true;
  pineTier1.castShadow = true;
  pineTier2.castShadow = true;

  for (let i = 0; i < pineCount; i++) {
    const ring = i < 18 ? 30.5 : 43.0;
    const angle = (i / 18) * Math.PI * 2 + (i % 3) * 0.09;
    const tx = Math.cos(angle) * (ring + (i % 4) * 1.9);
    const tz = Math.sin(angle) * (ring + (i % 5) * 1.8);
    // Leave clear sightline directly behind the Bell Tower at (0, -26)
    const finalX = Math.abs(tx) < 5.5 && tz < -20 ? tx + (tx >= 0 ? 6.5 : -6.5) : tx;
    const scale = 0.86 + ((i * 19) % 34) / 100;

    dummy.position.set(finalX, 0, tz);
    dummy.rotation.set(((i % 5) - 2) * 0.025, i * 0.85, ((i % 3) - 1) * 0.025);
    dummy.scale.set(scale, scale * (0.95 + (i % 4) * 0.1), scale);
    dummy.updateMatrix();

    pineTrunks.setMatrixAt(i, dummy.matrix);
    pineTier1.setMatrixAt(i, dummy.matrix);
    pineTier2.setMatrixAt(i, dummy.matrix);
    pineTier3.setMatrixAt(i, dummy.matrix);

    colorScratch.setHSL(0.37 + (i % 4) * 0.025, 0.66, 0.24 + (i % 3) * 0.025, THREE.SRGBColorSpace);
    pineTier1.setColorAt(i, colorScratch);
    colorScratch.setHSL(0.38 + (i % 4) * 0.025, 0.68, 0.29 + (i % 3) * 0.025, THREE.SRGBColorSpace);
    pineTier2.setColorAt(i, colorScratch);
    colorScratch.setHSL(0.39 + (i % 4) * 0.025, 0.7, 0.34 + (i % 3) * 0.025, THREE.SRGBColorSpace);
    pineTier3.setColorAt(i, colorScratch);
  }
  for (const m of [pineTrunks, pineTier1, pineTier2, pineTier3]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    scene.add(m);
  }

  // 7B. 28 Gnarled Multi-Branch Ancient Oaks (Flared Trunk + 2 Angled Boughs + 3 Crown Clusters)
  const oakCount = 28;
  const oakTrunkGeo = new THREE.CylinderGeometry(0.28, 0.62, 4.6, 10);
  oakTrunkGeo.translate(0, 2.3, 0);

  const oakBranchLeftGeo = new THREE.CylinderGeometry(0.14, 0.26, 2.8, 8);
  oakBranchLeftGeo.rotateZ(0.58);
  oakBranchLeftGeo.translate(-0.85, 4.6, 0.2);

  const oakBranchRightGeo = new THREE.CylinderGeometry(0.14, 0.26, 2.7, 8);
  oakBranchRightGeo.rotateZ(-0.54);
  oakBranchRightGeo.rotateX(0.25);
  oakBranchRightGeo.translate(0.82, 4.5, -0.3);

  const oakCrownMainGeo = new THREE.DodecahedronGeometry(1.85, 1);
  oakCrownMainGeo.scale(1.25, 0.88, 1.15);
  oakCrownMainGeo.translate(0, 6.2, 0);

  const oakCrownLeftGeo = new THREE.DodecahedronGeometry(1.38, 1);
  oakCrownLeftGeo.translate(-1.45, 5.4, 0.35);

  const oakCrownRightGeo = new THREE.DodecahedronGeometry(1.32, 1);
  oakCrownRightGeo.translate(1.42, 5.3, -0.45);

  const oakTrunks = new THREE.InstancedMesh(oakTrunkGeo, trunkMat, oakCount);
  const oakBranchL = new THREE.InstancedMesh(oakBranchLeftGeo, trunkMat, oakCount);
  const oakBranchR = new THREE.InstancedMesh(oakBranchRightGeo, trunkMat, oakCount);
  const oakCrownMain = new THREE.InstancedMesh(oakCrownMainGeo, oakFoliageMat, oakCount);
  const oakCrownL = new THREE.InstancedMesh(oakCrownLeftGeo, oakFoliageMat, oakCount);
  const oakCrownR = new THREE.InstancedMesh(oakCrownRightGeo, oakFoliageMat, oakCount);

  for (let i = 0; i < oakCount; i++) {
    const ring = i < 14 ? 27.5 : 37.5;
    const angle = (i / 14) * Math.PI * 2 + 0.14;
    const tx = Math.cos(angle) * (ring + (i % 3) * 1.8);
    const tz = Math.sin(angle) * (ring + (i % 4) * 1.8);
    const finalX = Math.abs(tx) < 6.0 && tz < -18 ? tx + (tx >= 0 ? 7.0 : -7.0) : tx;
    const scale = 0.88 + ((i * 13) % 28) / 100;

    dummy.position.set(finalX, 0, tz);
    dummy.rotation.set(0, i * 1.35, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();

    oakTrunks.setMatrixAt(i, dummy.matrix);
    oakBranchL.setMatrixAt(i, dummy.matrix);
    oakBranchR.setMatrixAt(i, dummy.matrix);
    oakCrownMain.setMatrixAt(i, dummy.matrix);
    oakCrownL.setMatrixAt(i, dummy.matrix);
    oakCrownR.setMatrixAt(i, dummy.matrix);

    // Keep each oak's crowns in one autumn hue, with brighter outer facets.
    const oakHue = 0.07 + (i % 3) * 0.12;
    colorScratch.setHSL(oakHue, 0.68, 0.34 + (i % 4) * 0.02, THREE.SRGBColorSpace);
    oakCrownMain.setColorAt(i, colorScratch);
    colorScratch.setHSL(oakHue + 0.01, 0.65, 0.4 + (i % 3) * 0.025, THREE.SRGBColorSpace);
    oakCrownL.setColorAt(i, colorScratch);
    colorScratch.setHSL(oakHue - 0.01, 0.7, 0.29 + (i % 3) * 0.025, THREE.SRGBColorSpace);
    oakCrownR.setColorAt(i, colorScratch);
  }
  for (const m of [oakTrunks, oakBranchL, oakBranchR, oakCrownMain, oakCrownL, oakCrownR]) {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    scene.add(m);
  }

  // 8. Craggy Perimeter Boulders (InstancedMesh: 40 instances)
  const rockCount = 40;
  const rockGeo = new THREE.DodecahedronGeometry(2.3, 1);
  rockGeo.translate(0, 1.0, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x536578,
    roughness: 0.86,
    metalness: 0.12,
    bumpMap: stoneBump,
    bumpScale: 0.06,
  });
  const rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  for (let i = 0; i < rockCount; i++) {
    const a = (i / rockCount) * Math.PI * 2;
    const dist = 48 + (i % 3) * 4;
    dummy.position.set(Math.cos(a) * dist, 0, Math.sin(a) * dist);
    dummy.rotation.set(i * 0.4, a, i * 0.2);
    dummy.scale.set(1.2 + (i % 4) * 0.3, 0.8 + (i % 5) * 0.45, 1.1 + (i % 3) * 0.3);
    dummy.updateMatrix();
    rockInstanced.setMatrixAt(i, dummy.matrix);
  }
  rockInstanced.instanceMatrix.needsUpdate = true;
  rockInstanced.computeBoundingSphere();
  scene.add(rockInstanced);

  // 9. 3D Background Horizon: Majestic 360° Jagged Gothic Mountain Range + Distant Hilltop Castle Keep
  const mountainCount = 32;
  const mountainGeo = new THREE.ConeGeometry(13.5, 28, 7);
  mountainGeo.translate(0, 13.5, 0);
  const mountainMat = new THREE.MeshStandardMaterial({
    color: 0x304b68,
    roughness: 0.9,
    metalness: 0.08,
    bumpMap: stoneBump,
    bumpScale: 0.08,
  });
  const snowPeakGeo = new THREE.ConeGeometry(5.6, 10.5, 7);
  snowPeakGeo.translate(0, 22.8, 0);
  const snowPeakMat = new THREE.MeshStandardMaterial({
    color: 0xb2d1dc,
    roughness: 0.65,
    metalness: 0.15,
  });

  const mountainInstanced = new THREE.InstancedMesh(mountainGeo, mountainMat, mountainCount);
  const snowPeakInstanced = new THREE.InstancedMesh(snowPeakGeo, snowPeakMat, mountainCount);

  for (let i = 0; i < mountainCount; i++) {
    const a = (i / mountainCount) * Math.PI * 2;
    const dist = 74 + (i % 3) * 6.5;
    const hScale = 0.72 + ((i * 7) % 6) * 0.14;
    const wScale = 0.85 + (i % 4) * 0.18;
    dummy.position.set(Math.cos(a) * dist, -1.0, Math.sin(a) * dist);
    dummy.rotation.set(0, a + i * 0.5, 0);
    dummy.scale.set(wScale, hScale, wScale);
    dummy.updateMatrix();
    mountainInstanced.setMatrixAt(i, dummy.matrix);
    snowPeakInstanced.setMatrixAt(i, dummy.matrix);
  }
  mountainInstanced.instanceMatrix.needsUpdate = true;
  snowPeakInstanced.instanceMatrix.needsUpdate = true;
  mountainInstanced.computeBoundingSphere();
  snowPeakInstanced.computeBoundingSphere();
  scene.add(mountainInstanced);
  scene.add(snowPeakInstanced);

  // Distant Hilltop Gothic Dracula/Werewolf Castle Silhouette at (25, 0, -54)
  const castleGroup = new THREE.Group();
  castleGroup.position.set(25, 0, -54);
  castleGroup.rotation.y = -0.35;
  const cragHill = new THREE.Mesh(new THREE.ConeGeometry(12, 11, 8), mountainMat);
  cragHill.position.y = 5.5;
  castleGroup.add(cragHill);

  const keepBody = new THREE.Mesh(new THREE.BoxGeometry(7.5, 9.5, 6.5), mountainMat);
  keepBody.position.y = 13.5;
  castleGroup.add(keepBody);

  for (const [tx, tz, th] of [
    [-3.8, -2.8, 13.5],
    [3.8, -2.8, 15.2],
    [-3.6, 2.8, 12.0],
    [3.6, 2.8, 11.5],
  ]) {
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.55, th, 8), mountainMat);
    turret.position.set(tx, 10 + th / 2, tz);
    castleGroup.add(turret);

    const turretRoof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 4.5, 8), snowPeakMat);
    turretRoof.position.set(tx, 10 + th + 2.2, tz);
    castleGroup.add(turretRoof);
  }
  const castleWindow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.4, 0.3), lampGlowMat);
  castleWindow.position.set(0, 14.5, 3.3);
  castleGroup.add(castleWindow);
  scene.add(castleGroup);

  // 10. Rising Fire Embers & Night Spores (Zero-GC Pooled InstancedMesh: 48 particles)
  const emberCount = 48;
  const emberGeo = new THREE.OctahedronGeometry(0.07, 0);
  const emberMat = new THREE.MeshBasicMaterial({
    color: 0xff7722,
  });
  const emberInstanced = new THREE.InstancedMesh(emberGeo, emberMat, emberCount);
  emberInstanced.frustumCulled = false;
  scene.add(emberInstanced);

  return {
    obstacles,
    buildingMap,
    outerFlame,
    innerFlame,
    bellMesh,
    emberInstanced,
    lampGlowMat,
  };
}

