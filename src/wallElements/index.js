import * as THREE from "three";

export function getWallWidthCm(wallId, frontWidthCm, sideLengthCm) {
  return wallId === "left" || wallId === "right" ? sideLengthCm : frontWidthCm;
}

export function createDefaultWallElement(type, variant = {}) {
  const id = `we_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  if (type === "outlet") {
    const outletStyle = variant.outletStyle || "double";
    return {
      id,
      type: "outlet",
      wall: "back",
      locked: false,
      offsetCm: 50,
      elevationCm: 30,
      width: outletStyle === "single" ? 9 : 15,
      height: 9,
      outletStyle,
      color1: "#F8FAFC",
      color2: "#334155",
    };
  }

  const windowStyle = variant.windowStyle || "double";
  const isVent = windowStyle === "vent";
  return {
    id,
    type: "window",
    wall: "back",
    locked: false,
    offsetCm: 60,
    elevationCm: isVent ? 205 : 95,
    width: isVent ? 100 : windowStyle === "single" ? 70 : 120,
    height: isVent ? 40 : 115,
    windowStyle,
    color1: "#FFFFFF",
    color2: "#BAE6FD",
  };
}

export function getWallElementLabel(el, t) {
  if (el.type === "outlet") {
    const sub =
      el.outletStyle === "single"
        ? t.outletSingle
        : el.outletStyle === "switch"
          ? t.outletSwitch
          : t.outletDouble;
    return `${t.catOutlet} (${sub})`;
  }
  const sub =
    el.windowStyle === "single"
      ? t.windowSingle
      : el.windowStyle === "vent"
        ? t.windowVent
        : t.windowDouble;
  return `${t.catWindow} (${sub})`;
}

export function clampWallElement(el, frontWidthCm, sideLengthCm, roomHeightCm) {
  const wallW = getWallWidthCm(el.wall, frontWidthCm, sideLengthCm);
  const w = Math.min(el.width, Math.max(8, wallW - 4));
  const h = Math.min(el.height, Math.max(8, roomHeightCm - 4));
  const maxOffset = Math.max(0, wallW - w);
  const maxElev = Math.max(0, roomHeightCm - h);

  return {
    ...el,
    width: w,
    height: h,
    offsetCm: Math.round(Math.max(0, Math.min(maxOffset, el.offsetCm))),
    elevationCm: Math.round(Math.max(0, Math.min(maxElev, el.elevationCm))),
  };
}

export function getDoorRectOnFrontWall(door, frontWidthCm, roomHeightCm) {
  const dW = Math.min(door.width, frontWidthCm - 10);
  const dH = Math.min(door.height, roomHeightCm - 5);
  const maxOffset = Math.max(0, frontWidthCm - dW);
  const offset = Math.min(door.offset, maxOffset);
  // Konversi ke jarak dari sisi kiri saat menghadap tembok depan dari dalam
  const leftCm = frontWidthCm - offset - dW;
  return { leftCm, rightCm: leftCm + dW, bottomCm: 0, topCm: dH };
}

export function checkWallElementConflicts(
  el,
  allElements,
  frontWidthCm,
  sideLengthCm,
  roomHeightCm,
  door,
) {
  let hasOverlap = false;
  let hasDoorBlock = false;

  const aL = el.offsetCm;
  const aR = el.offsetCm + el.width;
  const aB = el.elevationCm;
  const aT = el.elevationCm + el.height;

  for (const other of allElements) {
    if (other.id === el.id || other.wall !== el.wall) continue;
    const bL = other.offsetCm;
    const bR = other.offsetCm + other.width;
    const bB = other.elevationCm;
    const bT = other.elevationCm + other.height;

    if (aL < bR && aR > bL && aB < bT && aT > bB) {
      hasOverlap = true;
      break;
    }
  }

  if (el.wall === "front") {
    const dRect = getDoorRectOnFrontWall(door, frontWidthCm, roomHeightCm);
    if (
      aL < dRect.rightCm &&
      aR > dRect.leftCm &&
      aB < dRect.topCm &&
      aT > dRect.bottomCm
    ) {
      hasDoorBlock = true;
    }
  }

  return { hasOverlap, hasDoorBlock };
}

export function buildWallElementGroup(
  el,
  wallWidthCm,
  { isSelected = false, hasConflict = false } = {},
) {
  const group = new THREE.Group();
  group.userData.wallElementId = el.id;

  const wallW = wallWidthCm / 100;
  const w = el.width / 100;
  const h = el.height / 100;
  const localX = -wallW / 2 + el.offsetCm / 100 + w / 2;
  const localY = el.elevationCm / 100 + h / 2;

  const matPrimary = new THREE.MeshStandardMaterial({
    color: el.color1 || "#ffffff",
    roughness: 0.55,
    metalness: 0.08,
  });

  const matSecondary = new THREE.MeshStandardMaterial({
    color: el.color2 || "#bae6fd",
    roughness: el.type === "window" ? 0.15 : 0.7,
    metalness: el.type === "window" ? 0.1 : 0.3,
  });

  if (el.type === "window") {
    const frameD = 0.026;
    const barT = Math.min(0.04, w * 0.12, h * 0.12);

    // Kusen luar 4 sisi
    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(w, barT, frameD),
      matPrimary,
    );
    topBar.position.set(0, h / 2 - barT / 2, frameD / 2);
    const botBar = new THREE.Mesh(
      new THREE.BoxGeometry(w, barT, frameD + 0.01),
      matPrimary,
    );
    botBar.position.set(0, -h / 2 + barT / 2, (frameD + 0.01) / 2);
    const leftBar = new THREE.Mesh(
      new THREE.BoxGeometry(barT, h - barT * 2, frameD),
      matPrimary,
    );
    leftBar.position.set(-w / 2 + barT / 2, 0, frameD / 2);
    const rightBar = new THREE.Mesh(
      new THREE.BoxGeometry(barT, h - barT * 2, frameD),
      matPrimary,
    );
    rightBar.position.set(w / 2 - barT / 2, 0, frameD / 2);
    group.add(topBar, botBar, leftBar, rightBar);

    // Kaca jendela
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(
        Math.max(0.05, w - barT * 1.6),
        Math.max(0.05, h - barT * 1.6),
      ),
      matSecondary,
    );
    glass.position.set(0, 0, frameD * 0.45);
    group.add(glass);

    // Tiang tengah untuk jendela 2 daun
    if ((el.windowStyle || "double") === "double") {
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(barT * 0.85, h - barT * 2, frameD * 0.9),
        matPrimary,
      );
      mullion.position.set(0, 0, frameD * 0.48);
      group.add(mullion);
    }
  } else {
    // Stopkontak / Saklar
    const plateD = 0.012;
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, plateD),
      matPrimary,
    );
    plate.position.set(0, 0, plateD / 2);
    group.add(plate);

    const style = el.outletStyle || "double";
    const slotCount = style === "single" ? 1 : 2;
    const slotW = Math.min(0.042, (w - 0.02) / slotCount);
    const slotH = Math.min(0.042, h * 0.56);

    for (let i = 0; i < slotCount; i++) {
      const sx = slotCount === 1 ? 0 : i === 0 ? -w * 0.23 : w * 0.23;
      const isSwitchPart = style === "switch" && i === 0;
      const socket = new THREE.Mesh(
        new THREE.BoxGeometry(
          isSwitchPart ? slotW * 0.65 : slotW,
          isSwitchPart ? slotH * 1.15 : slotH,
          0.005,
        ),
        matSecondary,
      );
      socket.position.set(sx, 0, plateD + 0.002);
      group.add(socket);
    }
  }

  if (isSelected || hasConflict) {
    const outlineColor = hasConflict
      ? "#ef4444"
      : el.locked
        ? "#f59e0b"
        : "#2563eb";
    const pad = 0.018;
    const edges = new THREE.EdgesGeometry(
      new THREE.PlaneGeometry(w + pad * 2, h + pad * 2),
    );
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: outlineColor }),
    );
    line.position.set(0, 0, 0.032);
    group.add(line);
  }

  group.position.set(localX, localY, 0);
  return group;
}
