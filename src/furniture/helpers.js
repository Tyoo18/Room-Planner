import * as THREE from "three";

export function isEllipticalFurniture(item) {
  if (!item) return false;
  if (item.type === "sofa" && item.sofaStyle === "beanbag") return true;
  if (item.type === "carpet" && item.carpetShape === "round") return true;
  if (item.type === "desk" && item.deskShape === "round") return true;
  if (item.type === "chair" && item.chairStyle === "stool") return true;
  return false;
}

export function createRoundedBoxGeometry(
  width,
  height,
  depth,
  cornerRadius = 0.05,
  bevelSize = 0.02,
  bevelThickness = 0.02,
) {
  const bSize = Math.min(bevelSize, width * 0.18, depth * 0.18);
  const bThick = Math.min(bevelThickness, height * 0.25);
  const hw = Math.max(0.01, width / 2 - bSize);
  const hd = Math.max(0.01, depth / 2 - bSize);
  const r = Math.max(0.004, Math.min(cornerRadius - bSize, hw * 0.9, hd * 0.9));

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.absarc(hw - r, -hd + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hd - r);
  shape.absarc(hw - r, hd - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-hw + r, hd);
  shape.absarc(-hw + r, hd - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hd + r);
  shape.absarc(-hw + r, -hd + r, r, Math.PI, Math.PI * 1.5, false);

  const extrudeDepth = Math.max(0.01, height - bThick * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: bSize,
    bevelThickness: bThick,
    curveSegments: 6,
  });

  geo.center();
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function addPart(group, geo, mat, x, y, z, castShadow = true) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function getFurnitureWorldAABB(item) {
  const rad = ((item.rotation || 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const w = item.width / 100;
  const d = item.depth / 100;

  // Untuk objek bulat/oval, gunakan proyeksi elips sejati agar tidak melar saat diputar
  const rotW = isEllipticalFurniture(item)
    ? Math.hypot(w * cos, d * sin)
    : w * cos + d * sin;
  const rotD = isEllipticalFurniture(item)
    ? Math.hypot(w * sin, d * cos)
    : w * sin + d * cos;

  const cx = item.x / 100;
  const cz = item.z / 100;

  return {
    minX: cx - rotW / 2,
    maxX: cx + rotW / 2,
    minZ: cz - rotD / 2,
    maxZ: cz + rotD / 2,
    rotW,
    rotD,
  };
}

export function clampFurnitureToRoom(item, roomWidthCm, roomLengthCm) {
  const roomW = roomWidthCm / 100;
  const roomL = roomLengthCm / 100;
  const { rotW, rotD } = getFurnitureWorldAABB(item);

  const maxX = Math.max(0, roomW / 2 - rotW / 2);
  const maxZ = Math.max(0, roomL / 2 - rotD / 2);

  const nextX = Math.round(Math.max(-maxX, Math.min(maxX, item.x / 100)) * 100);
  const nextZ = Math.round(Math.max(-maxZ, Math.min(maxZ, item.z / 100)) * 100);

  return { ...item, x: nextX, z: nextZ };
}

export function snapFurniturePosition(
  candidateItem,
  allFurnitures,
  roomWidthCm,
  roomLengthCm,
  thresholdCm = 8,
) {
  const aabb = getFurnitureWorldAABB(candidateItem);
  const minX = aabb.minX * 100;
  const maxX = aabb.maxX * 100;
  const minZ = aabb.minZ * 100;
  const maxZ = aabb.maxZ * 100;
  const halfW = (maxX - minX) / 2;
  const halfD = (maxZ - minZ) / 2;

  const xTargets = [-roomWidthCm / 2 + halfW, roomWidthCm / 2 - halfW];
  const zTargets = [-roomLengthCm / 2 + halfD, roomLengthCm / 2 - halfD];

  allFurnitures.forEach((other) => {
    if (other.id === candidateItem.id) return;
    const o = getFurnitureWorldAABB(other);
    const oMinX = o.minX * 100;
    const oMaxX = o.maxX * 100;
    const oMinZ = o.minZ * 100;
    const oMaxZ = o.maxZ * 100;

    if (maxZ + 35 >= oMinZ && minZ - 35 <= oMaxZ) {
      xTargets.push(oMaxX + halfW);
      xTargets.push(oMinX - halfW);
      xTargets.push(oMinX + halfW);
      xTargets.push(oMaxX - halfW);
    }

    if (maxX + 35 >= oMinX && minX - 35 <= oMaxX) {
      zTargets.push(oMaxZ + halfD);
      zTargets.push(oMinZ - halfD);
      zTargets.push(oMinZ + halfD);
      zTargets.push(oMaxZ - halfD);
    }
  });

  let snappedX = candidateItem.x;
  let bestDistX = thresholdCm;
  for (const tx of xTargets) {
    const dist = Math.abs(candidateItem.x - tx);
    if (dist <= bestDistX) {
      bestDistX = dist;
      snappedX = Math.round(tx);
    }
  }

  let snappedZ = candidateItem.z;
  let bestDistZ = thresholdCm;
  for (const tz of zTargets) {
    const dist = Math.abs(candidateItem.z - tz);
    if (dist <= bestDistZ) {
      bestDistZ = dist;
      snappedZ = Math.round(tz);
    }
  }

  return clampFurnitureToRoom(
    { ...candidateItem, x: snappedX, z: snappedZ },
    roomWidthCm,
    roomLengthCm,
  );
}

export function getWallDistancesCm(item, roomWidthCm, roomLengthCm) {
  const roomW = roomWidthCm / 100;
  const roomL = roomLengthCm / 100;
  const { minX, maxX, minZ, maxZ } = getFurnitureWorldAABB(item);

  return {
    left: Math.max(0, Math.round((minX - -roomW / 2) * 100)),
    right: Math.max(0, Math.round((roomW / 2 - maxX) * 100)),
    back: Math.max(0, Math.round((minZ - -roomL / 2) * 100)),
    front: Math.max(0, Math.round((roomL / 2 - maxZ) * 100)),
  };
}

export function testOBBOverlap(a, b) {
  const axes = [
    { x: a.cos, z: -a.sin },
    { x: a.sin, z: a.cos },
    { x: b.cos, z: -b.sin },
    { x: b.sin, z: b.cos },
  ];

  const dx = b.cx - a.cx;
  const dz = b.cz - a.cz;
  const margin = 0.005;

  for (const axis of axes) {
    const dist = Math.abs(dx * axis.x + dz * axis.z);
    const projA =
      a.halfW * Math.abs(a.cos * axis.x - a.sin * axis.z) +
      a.halfD * Math.abs(a.sin * axis.x + a.cos * axis.z);
    const projB =
      b.halfW * Math.abs(b.cos * axis.x - b.sin * axis.z) +
      b.halfD * Math.abs(b.sin * axis.x + b.cos * axis.z);

    if (dist >= projA + projB - margin) {
      return false;
    }
  }
  return true;
}

function isPointInEllipse(wx, wz, ell, margin = 0.005) {
  const rx = wx - ell.cx;
  const rz = wz - ell.cz;
  const lx = rx * ell.cos - rz * ell.sin;
  const lz = rx * ell.sin + rz * ell.cos;
  const a = Math.max(0.01, ell.halfW - margin);
  const b = Math.max(0.01, ell.halfD - margin);
  return (lx * lx) / (a * a) + (lz * lz) / (b * b) < 1;
}

function isPointInOBB(wx, wz, box, margin = 0.005) {
  const rx = wx - box.cx;
  const rz = wz - box.cz;
  const lx = rx * box.cos - rz * box.sin;
  const lz = rx * box.sin + rz * box.cos;
  return Math.abs(lx) < box.halfW - margin && Math.abs(lz) < box.halfD - margin;
}

export function testEllipseOBBOverlap(ell, box) {
  const margin = 0.005;
  if (isPointInOBB(ell.cx, ell.cz, box, margin)) return true;
  if (isPointInEllipse(box.cx, box.cz, ell, margin)) return true;

  // Cek 24 titik keliling elips terhadap kotak OBB
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const phi = (i / steps) * Math.PI * 2;
    const lx = ell.halfW * Math.cos(phi);
    const lz = ell.halfD * Math.sin(phi);
    const wx = ell.cx + (lx * ell.cos + lz * ell.sin);
    const wz = ell.cz + (-lx * ell.sin + lz * ell.cos);
    if (isPointInOBB(wx, wz, box, margin)) return true;
  }

  // Cek 4 sudut & 4 titik tengah sisi OBB terhadap elips
  const boxSamples = [
    [-box.halfW, -box.halfD],
    [box.halfW, -box.halfD],
    [box.halfW, box.halfD],
    [-box.halfW, box.halfD],
    [0, -box.halfD],
    [0, box.halfD],
    [-box.halfW, 0],
    [box.halfW, 0],
  ];
  for (const [bx, bz] of boxSamples) {
    const wx = box.cx + (bx * box.cos + bz * box.sin);
    const wz = box.cz + (-bx * box.sin + bz * box.cos);
    if (isPointInEllipse(wx, wz, ell, margin)) return true;
  }

  return false;
}

export function testEllipseEllipseOverlap(ellA, ellB) {
  const margin = 0.005;
  if (isPointInEllipse(ellA.cx, ellA.cz, ellB, margin)) return true;
  if (isPointInEllipse(ellB.cx, ellB.cz, ellA, margin)) return true;

  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const phi = (i / steps) * Math.PI * 2;
    const lxA = ellA.halfW * Math.cos(phi);
    const lzA = ellA.halfD * Math.sin(phi);
    const wxA = ellA.cx + (lxA * ellA.cos + lzA * ellA.sin);
    const wzA = ellA.cz + (-lxA * ellA.sin + lzA * ellA.cos);
    if (isPointInEllipse(wxA, wzA, ellB, margin)) return true;

    const lxB = ellB.halfW * Math.cos(phi);
    const lzB = ellB.halfD * Math.sin(phi);
    const wxB = ellB.cx + (lxB * ellB.cos + lzB * ellB.sin);
    const wzB = ellB.cz + (-lxB * ellB.sin + lzB * ellB.cos);
    if (isPointInEllipse(wxB, wzB, ellA, margin)) return true;
  }

  return false;
}
