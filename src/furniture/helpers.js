import * as THREE from "three";

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
  const rotW = w * cos + d * sin;
  const rotD = w * sin + d * cos;

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
