import * as THREE from "three";

export function createDefaultFurniture(type, variant = {}) {
  const id = `furn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  if (type === "bed") {
    const bedStyle = variant.bedStyle || "frame";
    return {
      id,
      type: "bed",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width: 160,
      depth: 200,
      height: bedStyle === "floor" ? 24 : 50,
      bedStyle,
      color1: "#F1F5F9",
      color2: "#78553A",
    };
  }

  if (type === "desk") {
    const deskShape = variant.deskShape || "rect";
    return {
      id,
      type: "desk",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width: deskShape === "round" ? 100 : deskShape === "l-shape" ? 150 : 120,
      depth: deskShape === "round" ? 100 : deskShape === "l-shape" ? 120 : 60,
      height: 75,
      deskShape,
      lCorner: "left",
      mainDepth: 60,
      sideWidth: 45,
      color1: "#D6B892",
      color2: "#27272A",
    };
  }

  if (type === "wardrobe") {
    const wardrobeDoorType = variant.wardrobeDoorType || "swing";
    return {
      id,
      type: "wardrobe",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width: 100,
      depth: 50,
      height: 180,
      wardrobeLayout: "vertical",
      doorCount: 2,
      wardrobeCols: 2,
      wardrobeRows: 3,
      wardrobeDoorType,
      color1: "#E2E8F0",
      color2: "#94A3B8",
    };
  }

  const chairStyle = variant.chairStyle || "standard";
  return {
    id,
    type: "chair",
    locked: false,
    x: 0,
    z: 0,
    rotation: 0,
    width: chairStyle === "office" ? 58 : chairStyle === "stool" ? 40 : 46,
    depth: chairStyle === "office" ? 58 : chairStyle === "stool" ? 40 : 48,
    height: chairStyle === "stool" ? 45 : 85,
    chairStyle,
    color1: chairStyle === "office" ? "#334155" : "#85583F",
    color2: "#18181B",
  };
}

export function getLDeskDimensionsM(item) {
  const w = item.width / 100;
  const d = item.depth / 100;
  const legacyArm = item.armDepth || 55;
  const mainDepthM = Math.min(
    (item.mainDepth || legacyArm) / 100,
    Math.max(0.2, d - 0.15),
  );
  const sideWidthM = Math.min(
    (item.sideWidth || legacyArm) / 100,
    Math.max(0.2, w - 0.15),
  );
  return { w, d, mainDepthM, sideWidthM };
}

export function getFurnitureLocalBoxes(item) {
  const w = item.width / 100;
  const d = item.depth / 100;

  if (item.type === "desk" && item.deskShape === "l-shape") {
    const { mainDepthM, sideWidthM } = getLDeskDimensionsM(item);
    const wingDepth = Math.max(0.05, d - mainDepthM);
    const wingCenterX =
      item.lCorner === "right"
        ? w / 2 - sideWidthM / 2
        : -w / 2 + sideWidthM / 2;

    return [
      { cx: 0, cz: -d / 2 + mainDepthM / 2, w, d: mainDepthM },
      { cx: wingCenterX, cz: mainDepthM / 2, w: sideWidthM, d: wingDepth },
    ];
  }

  return [{ cx: 0, cz: 0, w, d }];
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

function getWorldOrientedBoxes(item) {
  const rad = ((item.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ix = item.x / 100;
  const iz = item.z / 100;

  return getFurnitureLocalBoxes(item).map((box) => {
    const wx = ix + (box.cx * cos + box.cz * sin);
    const wz = iz + (-box.cx * sin + box.cz * cos);
    return {
      cx: wx,
      cz: wz,
      halfW: box.w / 2,
      halfD: box.d / 2,
      cos,
      sin,
    };
  });
}

function testOBBOverlap(a, b) {
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

export function checkFurnitureConflicts(
  item,
  allFurnitures,
  roomWidthCm,
  roomLengthCm,
  door,
) {
  const boxesA = getWorldOrientedBoxes(item);
  let hasOverlap = false;

  for (const other of allFurnitures) {
    if (other.id === item.id) continue;
    const boxesB = getWorldOrientedBoxes(other);
    for (const bA of boxesA) {
      for (const bB of boxesB) {
        if (testOBBOverlap(bA, bB)) {
          hasOverlap = true;
          break;
        }
      }
      if (hasOverlap) break;
    }
    if (hasOverlap) break;
  }

  let hasDoorBlock = false;
  if (door.swing === "inward") {
    const W = roomWidthCm / 100;
    const L = roomLengthCm / 100;
    const dW = Math.min(door.width / 100, W - 0.1);
    const maxOffsetM = Math.max(0, W - dW);
    const offsetM = Math.min(door.offset / 100, maxOffsetM);

    const doorLocalRight = W / 2 - offsetM;
    const doorLocalLeft = doorLocalRight - dW;
    const frameThick = 0.035;
    const hingeLocalX =
      door.hinge === "left"
        ? doorLocalRight - frameThick
        : doorLocalLeft + frameThick;
    const hingeWorldX = -hingeLocalX;
    const hingeWorldZ = L / 2 - 0.02;
    const swingRadius = Math.max(0.2, dW - frameThick * 2);

    for (const box of boxesA) {
      const relX = hingeWorldX - box.cx;
      const relZ = hingeWorldZ - box.cz;
      const localX = relX * box.cos - relZ * box.sin;
      const localZ = relX * box.sin + relZ * box.cos;

      const clampedX = Math.max(-box.halfW, Math.min(box.halfW, localX));
      const clampedZ = Math.max(-box.halfD, Math.min(box.halfD, localZ));

      const distX = localX - clampedX;
      const distZ = localZ - clampedZ;
      const distSq = distX * distX + distZ * distZ;

      if (distSq < (swingRadius - 0.02) * (swingRadius - 0.02)) {
        hasDoorBlock = true;
        break;
      }
    }
  }

  return { hasOverlap, hasDoorBlock };
}

/**
 * Helper membuat Box dengan pojok membulat & tepi bevel halus (dimensi akhir presisi W x H x D, centered di 0,0,0)
 */
function createRoundedBoxGeometry(
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

function addPart(group, geo, mat, x, y, z, castShadow = true) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function buildFurnitureGroup(
  item,
  { isSelected = false, hasConflict = false } = {},
) {
  const group = new THREE.Group();
  group.userData.furnitureId = item.id;

  const W = item.width / 100;
  const D = item.depth / 100;
  const H = item.height / 100;

  const matPrimary = new THREE.MeshStandardMaterial({
    color: item.color1 || "#e2e8f0",
    roughness: 0.78,
    metalness: 0.04,
  });

  const matSecondary = new THREE.MeshStandardMaterial({
    color: item.color2 || "#334155",
    roughness: 0.72,
    metalness: 0.08,
  });

  if (item.type === "bed") {
    const isFloor = item.bedStyle === "floor";
    const baseH = isFloor ? 0 : Math.min(0.22, H * 0.45);
    const mattressH = Math.max(0.1, H - baseH);

    if (!isFloor) {
      addPart(
        group,
        createRoundedBoxGeometry(W, baseH, D, 0.025, 0.008, 0.008),
        matSecondary,
        0,
        baseH / 2,
        0,
      );
      const hbH = Math.max(0.85, H + 0.42);
      const hbThick = 0.06;
      addPart(
        group,
        createRoundedBoxGeometry(W, hbH, hbThick, 0.025, 0.008, 0.008),
        matSecondary,
        0,
        hbH / 2,
        -D / 2 + hbThick / 2,
      );
    }

    // Kasur dengan sudut membulat lembut
    const matW = isFloor ? W : Math.max(0.2, W - 0.04);
    const matD = isFloor ? D : Math.max(0.2, D - 0.08);
    const matZ = isFloor ? 0 : 0.02;
    const mattressGeo = createRoundedBoxGeometry(
      matW,
      mattressH,
      matD,
      0.065,
      0.022,
      0.022,
    );
    addPart(group, mattressGeo, matPrimary, 0, baseH + mattressH / 2, matZ);

    // Bantal rounded empuk
    const pillowMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.88,
    });
    const pillowCount = W >= 1.1 ? 2 : 1;
    const pillowW = Math.min(0.56, (matW - 0.16) / pillowCount);
    const pillowD = Math.min(0.36, matD * 0.22);
    const pillowH = 0.08;
    const pillowY = baseH + mattressH + pillowH / 2 - 0.008;
    const pillowZ = -matD / 2 + pillowD / 2 + 0.09 + matZ;
    const pillowGeo = createRoundedBoxGeometry(
      pillowW,
      pillowH,
      pillowD,
      0.055,
      0.024,
      0.024,
    );

    if (pillowCount === 1) {
      addPart(group, pillowGeo, pillowMat, 0, pillowY, pillowZ);
    } else {
      const gap = pillowW * 0.58;
      addPart(group, pillowGeo, pillowMat, -gap, pillowY, pillowZ);
      addPart(group, pillowGeo.clone(), pillowMat, gap, pillowY, pillowZ);
    }
  } else if (item.type === "desk") {
    const topThick = 0.035;
    const legH = Math.max(0.1, H - topThick);
    const legThick = 0.04;

    if (item.deskShape === "round") {
      const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, topThick, 36);
      cylGeo.scale(W, 1, D);
      addPart(group, cylGeo, matPrimary, 0, legH + topThick / 2, 0);

      addPart(
        group,
        new THREE.CylinderGeometry(0.035, 0.04, legH, 16),
        matSecondary,
        0,
        legH / 2,
        0,
      );
      const baseSpanW = Math.min(0.55, W * 0.65);
      const baseSpanD = Math.min(0.55, D * 0.65);
      addPart(
        group,
        new THREE.BoxGeometry(baseSpanW, 0.025, 0.06),
        matSecondary,
        0,
        0.0125,
        0,
      );
      addPart(
        group,
        new THREE.BoxGeometry(0.06, 0.025, baseSpanD),
        matSecondary,
        0,
        0.0125,
        0,
      );
    } else if (item.deskShape === "l-shape") {
      const boxes = getFurnitureLocalBoxes(item);
      boxes.forEach((b) => {
        addPart(
          group,
          new THREE.BoxGeometry(b.w, topThick, b.d),
          matPrimary,
          b.cx,
          legH + topThick / 2,
          b.cz,
        );
      });

      const { mainDepthM, sideWidthM } = getLDeskDimensionsM(item);
      const legCoords =
        item.lCorner === "right"
          ? [
              [-W / 2 + legThick, -D / 2 + legThick],
              [-W / 2 + legThick, -D / 2 + mainDepthM - legThick],
              [W / 2 - legThick, -D / 2 + legThick],
              [W / 2 - sideWidthM + legThick, D / 2 - legThick],
              [W / 2 - legThick, D / 2 - legThick],
            ]
          : [
              [-W / 2 + legThick, -D / 2 + legThick],
              [W / 2 - legThick, -D / 2 + legThick],
              [W / 2 - legThick, -D / 2 + mainDepthM - legThick],
              [-W / 2 + legThick, D / 2 - legThick],
              [-W / 2 + sideWidthM - legThick, D / 2 - legThick],
            ];

      legCoords.forEach(([lx, lz]) => {
        addPart(
          group,
          new THREE.BoxGeometry(legThick, legH, legThick),
          matSecondary,
          lx,
          legH / 2,
          lz,
        );
      });
    } else {
      addPart(
        group,
        new THREE.BoxGeometry(W, topThick, D),
        matPrimary,
        0,
        legH + topThick / 2,
        0,
      );
      const offX = Math.max(0.02, W / 2 - legThick);
      const offZ = Math.max(0.02, D / 2 - legThick);
      [
        [-offX, -offZ],
        [offX, -offZ],
        [-offX, offZ],
        [offX, offZ],
      ].forEach(([lx, lz]) => {
        addPart(
          group,
          new THREE.BoxGeometry(legThick, legH, legThick),
          matSecondary,
          lx,
          legH / 2,
          lz,
        );
      });
    }
  } else if (item.type === "wardrobe") {
    const bodyD = Math.max(0.15, D - 0.02);
    addPart(
      group,
      new THREE.BoxGeometry(W, H, bodyD),
      matPrimary,
      0,
      H / 2,
      -0.01,
    );

    const isGrid = item.wardrobeLayout === "grid";
    const cols = isGrid
      ? Math.max(1, Math.min(4, item.wardrobeCols || 2))
      : Math.max(1, Math.min(4, item.doorCount || 2));
    const rows = isGrid ? Math.max(2, Math.min(5, item.wardrobeRows || 3)) : 1;

    const doorGap = 0.008;
    const totalLeafW = (W - doorGap * (cols + 1)) / cols;
    const totalLeafH = (H - doorGap * (rows + 1)) / rows;
    const leafThick = 0.02;

    const handleMat = new THREE.MeshStandardMaterial({
      color: "#27272a",
      metalness: 0.6,
      roughness: 0.35,
    });

    for (let r = 0; r < rows; r++) {
      const cy = doorGap + totalLeafH / 2 + r * (totalLeafH + doorGap);
      for (let c = 0; c < cols; c++) {
        const cx =
          -W / 2 + doorGap + totalLeafW / 2 + c * (totalLeafW + doorGap);
        const zOffset =
          item.wardrobeDoorType === "sliding" && c % 2 === 1
            ? D / 2 - 0.004
            : D / 2 - leafThick / 2;

        addPart(
          group,
          new THREE.BoxGeometry(totalLeafW, totalLeafH, leafThick),
          matSecondary,
          cx,
          cy,
          zOffset,
        );

        const handleH = Math.min(0.13, totalLeafH * 0.36);
        const handleX =
          cols === 1
            ? cx + totalLeafW * 0.34
            : c % 2 === 0
              ? cx + totalLeafW * 0.34
              : cx - totalLeafW * 0.34;
        const handleY = isGrid ? cy : Math.min(1.05, H * 0.52);

        addPart(
          group,
          new THREE.BoxGeometry(0.012, handleH, 0.018),
          handleMat,
          handleX,
          handleY,
          zOffset + leafThick / 2 + 0.008,
          false,
        );
      }
    }

    if (item.wardrobeDoorType !== "sliding") {
      const swingDepth = Math.min(0.65, totalLeafW);
      for (let c = 0; c < cols; c++) {
        const cx =
          -W / 2 + doorGap + totalLeafW / 2 + c * (totalLeafW + doorGap);
        const zoneGeo = new THREE.EdgesGeometry(
          new THREE.PlaneGeometry(totalLeafW, swingDepth),
        );
        const zoneLine = new THREE.LineSegments(
          zoneGeo,
          new THREE.LineBasicMaterial({
            color: "#f59e0b",
            transparent: true,
            opacity: 0.75,
          }),
        );
        zoneLine.rotation.x = -Math.PI / 2;
        zoneLine.position.set(cx, 0.004, D / 2 + swingDepth / 2);
        group.add(zoneLine);
      }
    }
  } else if (item.type === "chair") {
    const style = item.chairStyle || "standard";
    const seatH = style === "stool" ? H : Math.min(0.46, H * 0.54);
    const seatThick = 0.045;

    if (style === "stool") {
      const cylSeat = new THREE.CylinderGeometry(0.5, 0.5, seatThick, 24);
      cylSeat.scale(W, 1, D);
      addPart(group, cylSeat, matPrimary, 0, seatH - seatThick / 2, 0);

      const legH = seatH - seatThick;
      const rX = W * 0.32;
      const rZ = D * 0.32;
      [
        [-rX, -rZ],
        [rX, -rZ],
        [-rX, rZ],
        [rX, rZ],
      ].forEach(([lx, lz]) => {
        addPart(
          group,
          new THREE.CylinderGeometry(0.015, 0.013, legH, 10),
          matSecondary,
          lx,
          legH / 2,
          lz,
        );
      });
    } else if (style === "office") {
      addPart(
        group,
        new THREE.BoxGeometry(W, seatThick, D),
        matPrimary,
        0,
        seatH,
        0,
      );
      const backH = Math.max(0.2, H - seatH);
      addPart(
        group,
        new THREE.BoxGeometry(W * 0.88, backH, 0.045),
        matPrimary,
        0,
        seatH + backH / 2,
        -D / 2 + 0.025,
      );

      const stemH = Math.max(0.1, seatH - seatThick / 2);
      addPart(
        group,
        new THREE.CylinderGeometry(0.025, 0.03, stemH, 12),
        matSecondary,
        0,
        stemH / 2,
        0,
      );
      addPart(
        group,
        new THREE.BoxGeometry(W * 0.9, 0.03, 0.045),
        matSecondary,
        0,
        0.015,
        0,
      );
      addPart(
        group,
        new THREE.BoxGeometry(0.045, 0.03, D * 0.9),
        matSecondary,
        0,
        0.015,
        0,
      );
    } else {
      addPart(
        group,
        new THREE.BoxGeometry(W, seatThick, D),
        matPrimary,
        0,
        seatH,
        0,
      );
      const backH = Math.max(0.2, H - seatH);
      addPart(
        group,
        new THREE.BoxGeometry(W, backH, 0.035),
        matPrimary,
        0,
        seatH + backH / 2,
        -D / 2 + 0.018,
      );

      const legH = Math.max(0.1, seatH - seatThick / 2);
      const offX = W / 2 - 0.022;
      const offZ = D / 2 - 0.022;
      [
        [-offX, -offZ],
        [offX, -offZ],
        [-offX, offZ],
        [offX, offZ],
      ].forEach(([lx, lz]) => {
        addPart(
          group,
          new THREE.BoxGeometry(0.032, legH, 0.032),
          matSecondary,
          lx,
          legH / 2,
          lz,
        );
      });
    }
  }

  if (isSelected || hasConflict) {
    const boxes = getFurnitureLocalBoxes(item);
    const outlineColor = hasConflict
      ? "#ef4444"
      : item.locked
        ? "#f59e0b"
        : "#2563eb";
    boxes.forEach((b) => {
      const pad = 0.025;
      const rectGeo = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(b.w + pad * 2, b.d + pad * 2),
      );
      const line = new THREE.LineSegments(
        rectGeo,
        new THREE.LineBasicMaterial({ color: outlineColor }),
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(b.cx, 0.006, b.cz);
      group.add(line);
    });
  }

  group.position.set(item.x / 100, 0, item.z / 100);
  group.rotation.y = ((item.rotation || 0) * Math.PI) / 180;

  return group;
}
