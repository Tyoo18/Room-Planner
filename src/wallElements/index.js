import * as THREE from "three";
import { createRoundedBoxGeometry } from "../furniture/helpers";

const sharedDarkCavityMat = new THREE.MeshStandardMaterial({
  color: "#09090B",
  roughness: 0.85,
  metalness: 0.1,
});

const sharedMetalAccentMat = new THREE.MeshStandardMaterial({
  color: "#71717A",
  roughness: 0.3,
  metalness: 0.75,
});

const sharedLedMat = new THREE.MeshStandardMaterial({
  color: "#10B981",
  emissive: "#10B981",
  emissiveIntensity: 0.85,
  roughness: 0.2,
});

const sharedGlassSheenMat = new THREE.MeshBasicMaterial({
  color: "#FFFFFF",
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});

function addSubMesh(group, geo, mat, x, y, z, rx = 0, castShadow = false) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  if (rx !== 0) mesh.rotation.x = rx;
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function getWallWidthCm(wallId, frontWidthCm, sideLengthCm) {
  return wallId === "left" || wallId === "right" ? sideLengthCm : frontWidthCm;
}

export function createDefaultWallElement(type, variant = {}) {
  const id = `we_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  if (type === "ac") {
    return {
      id,
      type: "ac",
      wall: "back",
      locked: false,
      offsetCm: 60,
      elevationCm: 215,
      width: 85,
      height: 28,
      color1: "#F8FAFC",
      color2: "#1E293B",
    };
  }

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
  if (el.type === "ac") {
    return t.catAC || "AC Dinding";
  }
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
    roughness: el.type === "ac" ? 0.34 : 0.48,
    metalness: 0.08,
  });

  const matSecondary = new THREE.MeshStandardMaterial({
    color: el.color2 || "#bae6fd",
    roughness: el.type === "window" ? 0.08 : 0.68,
    metalness: el.type === "window" ? 0.14 : 0.32,
  });

  let outlineZ = 0.032;

  if (el.type === "ac") {
    const acD = 0.21;
    const mountD = 0.012;
    outlineZ = acD + 0.014;

    // 1. Pelat Mounting Belakang (menciptakan shadow gap tipis dari dinding)
    addSubMesh(
      group,
      new THREE.BoxGeometry(w * 0.94, h * 0.86, mountD),
      sharedDarkCavityMat,
      0,
      0,
      mountD / 2,
    );

    // 2. Chassis Utama Atas (bevel lembut ala unit indoor AC modern)
    const upperH = h * 0.78;
    const upperD = acD - mountD;
    addSubMesh(
      group,
      createRoundedBoxGeometry(w, upperH, upperD, 0.026, 0.011, 0.011),
      matPrimary,
      0,
      h / 2 - upperH / 2,
      mountD + upperD / 2,
      0,
      true,
    );

    // 3. Perut Bawah Meruncing (Tapered Underbelly)
    const lowerH = h * 0.36;
    const lowerD = upperD * 0.76;
    addSubMesh(
      group,
      createRoundedBoxGeometry(w * 0.985, lowerH, lowerD, 0.022, 0.009, 0.009),
      matPrimary,
      0,
      -h / 2 + lowerH / 2,
      mountD + lowerD / 2,
      0,
      true,
    );

    // 4. Kisi-kisi Hisap Udara di Sisi Atas (kelihatan jelas dari sudut isometrik)
    const intakeW = w * 0.88;
    const intakeD = upperD * 0.38;
    const topY = h / 2 + 0.0005;
    const topZ = mountD + upperD * 0.44;
    addSubMesh(
      group,
      new THREE.BoxGeometry(intakeW, 0.003, intakeD),
      sharedDarkCavityMat,
      0,
      topY,
      topZ,
    );
    const ribCount = Math.max(4, Math.round(intakeW / 0.12));
    const ribGeo = new THREE.BoxGeometry(0.006, 0.004, intakeD);
    for (let i = 1; i < ribCount; i++) {
      const rx = -intakeW / 2 + (intakeW / ribCount) * i;
      addSubMesh(group, ribGeo, matPrimary, rx, topY + 0.0005, topZ);
    }

    // 5. Garis Seam Cover Depan + Emblem Tengah
    addSubMesh(
      group,
      new THREE.BoxGeometry(w * 0.96, 0.004, 0.004),
      matSecondary,
      0,
      -h * 0.08,
      acD - 0.001,
    );
    addSubMesh(
      group,
      new THREE.BoxGeometry(0.036, 0.008, 0.004),
      sharedMetalAccentMat,
      0,
      0.01,
      acD + 0.0005,
    );

    // 6. Ceruk Outlet Udara Gelap + Bilah Louver Miring
    const ventW = w * 0.88;
    const ventH = h * 0.16;
    const ventY = -h * 0.34;
    const ventZ = mountD + lowerD - 0.002;
    addSubMesh(
      group,
      new THREE.BoxGeometry(ventW, ventH, 0.012),
      sharedDarkCavityMat,
      0,
      ventY,
      ventZ - 0.003,
    );
    addSubMesh(
      group,
      createRoundedBoxGeometry(ventW * 0.98, 0.006, 0.022, 0.002, 0.001, 0.001),
      matSecondary,
      0,
      ventY - ventH * 0.15,
      ventZ + 0.006,
      0.38,
    );

    // 7. Indikator Status LED Hijau + Strip Display Kanan
    addSubMesh(
      group,
      new THREE.BoxGeometry(0.028, 0.014, 0.003),
      sharedDarkCavityMat,
      w * 0.36,
      -h * 0.18,
      acD - 0.001,
    );
    addSubMesh(
      group,
      new THREE.BoxGeometry(0.007, 0.007, 0.004),
      sharedLedMat,
      w * 0.36,
      -h * 0.18,
      acD,
    );
  } else if (el.type === "window") {
    const style = el.windowStyle || "double";
    const frameD = 0.032;
    const sillD = 0.052;
    const barT = Math.min(0.042, w * 0.12, h * 0.12);
    outlineZ = sillD + 0.01;

    // 1. Kusen Luar Ber-bevel + Ambang Bawah (Window Sill) Menonjol
    addSubMesh(
      group,
      createRoundedBoxGeometry(w, barT, frameD, 0.005, 0.002, 0.002),
      matPrimary,
      0,
      h / 2 - barT / 2,
      frameD / 2,
      0,
      true,
    );
    // Ambang Jendela Bawah (Sill)
    addSubMesh(
      group,
      createRoundedBoxGeometry(
        w + 0.032,
        barT * 0.85,
        sillD,
        0.006,
        0.0025,
        0.0025,
      ),
      matPrimary,
      0,
      -h / 2 + barT * 0.425,
      sillD / 2,
      0,
      true,
    );
    const sideH = Math.max(0.04, h - barT * 1.85);
    const sideY = barT * 0.075;
    const sideGeo = createRoundedBoxGeometry(
      barT,
      sideH,
      frameD,
      0.005,
      0.002,
      0.002,
    );
    addSubMesh(
      group,
      sideGeo,
      matPrimary,
      -w / 2 + barT / 2,
      sideY,
      frameD / 2,
      0,
      true,
    );
    addSubMesh(
      group,
      sideGeo,
      matPrimary,
      w / 2 - barT / 2,
      sideY,
      frameD / 2,
      0,
      true,
    );

    const innerW = Math.max(0.05, w - barT * 2);
    const innerH = Math.max(0.05, h - barT * 1.85);

    // 2. Kaca Utama + Kilau Pantulan Diagonal
    addSubMesh(
      group,
      new THREE.PlaneGeometry(innerW + 0.008, innerH + 0.008),
      matSecondary,
      0,
      sideY,
      frameD * 0.36,
    );

    if (style === "vent") {
      // Kisi-kisi Louver Miring untuk Bovenlicht / Ventilasi
      const slatCount = Math.max(3, Math.round(innerH / 0.065));
      const slatGeo = createRoundedBoxGeometry(
        innerW,
        0.006,
        frameD * 0.72,
        0.002,
        0.001,
        0.001,
      );
      for (let i = 1; i <= slatCount; i++) {
        const sy = sideY - innerH / 2 + (innerH / (slatCount + 1)) * i;
        addSubMesh(group, slatGeo, matPrimary, 0, sy, frameD * 0.48, 0.48);
      }
    } else {
      // Kilau refleksi kaca tipis
      const sheenW = Math.min(0.045, innerW * 0.14);
      const sheenMesh = addSubMesh(
        group,
        new THREE.PlaneGeometry(sheenW, innerH * 0.72),
        sharedGlassSheenMat,
        -innerW * 0.18,
        sideY + innerH * 0.04,
        frameD * 0.39,
      );
      sheenMesh.rotation.z = -0.32;

      // Bingkai Daun Jendela Dalam (Recessed Sash Frame)
      const sashT = barT * 0.58;
      const sashD = 0.016;
      const sashZ = frameD * 0.54;

      if (style === "double") {
        const mullionW = barT * 0.78;
        addSubMesh(
          group,
          createRoundedBoxGeometry(
            mullionW,
            innerH,
            frameD * 0.88,
            0.004,
            0.002,
            0.002,
          ),
          matPrimary,
          0,
          sideY,
          frameD * 0.46,
        );

        const paneW = (innerW - mullionW) / 2;
        [-1, 1].forEach((dir) => {
          const px = dir * (mullionW / 2 + paneW / 2);
          addSubMesh(
            group,
            new THREE.BoxGeometry(paneW, sashT, sashD),
            matPrimary,
            px,
            sideY + innerH / 2 - sashT / 2,
            sashZ,
          );
          addSubMesh(
            group,
            new THREE.BoxGeometry(paneW, sashT, sashD),
            matPrimary,
            px,
            sideY - innerH / 2 + sashT / 2,
            sashZ,
          );
          addSubMesh(
            group,
            new THREE.BoxGeometry(sashT, innerH - sashT * 2, sashD),
            matPrimary,
            px - paneW / 2 + sashT / 2,
            sideY,
            sashZ,
          );
          addSubMesh(
            group,
            new THREE.BoxGeometry(sashT, innerH - sashT * 2, sashD),
            matPrimary,
            px + paneW / 2 - sashT / 2,
            sideY,
            sashZ,
          );
        });

        // Gerendel / Handle kecil di tengah
        addSubMesh(
          group,
          new THREE.BoxGeometry(0.008, 0.036, 0.012),
          sharedMetalAccentMat,
          mullionW * 0.25,
          sideY,
          frameD * 0.92,
        );
      } else {
        // Single Casement Sash
        addSubMesh(
          group,
          new THREE.BoxGeometry(innerW, sashT, sashD),
          matPrimary,
          0,
          sideY + innerH / 2 - sashT / 2,
          sashZ,
        );
        addSubMesh(
          group,
          new THREE.BoxGeometry(innerW, sashT, sashD),
          matPrimary,
          0,
          sideY - innerH / 2 + sashT / 2,
          sashZ,
        );
        addSubMesh(
          group,
          new THREE.BoxGeometry(sashT, innerH - sashT * 2, sashD),
          matPrimary,
          -innerW / 2 + sashT / 2,
          sideY,
          sashZ,
        );
        addSubMesh(
          group,
          new THREE.BoxGeometry(sashT, innerH - sashT * 2, sashD),
          matPrimary,
          innerW / 2 - sashT / 2,
          sideY,
          sashZ,
        );
        addSubMesh(
          group,
          new THREE.BoxGeometry(0.008, 0.036, 0.012),
          sharedMetalAccentMat,
          innerW / 2 - sashT * 0.5,
          sideY,
          sashZ + sashD * 0.65,
        );
      }
    }
  } else {
    // --- STOP KONTAK & SAKLAR ---
    const plateD = 0.011;
    outlineZ = plateD + 0.012;

    // 1. Pelat Luar Ber-bevel
    addSubMesh(
      group,
      createRoundedBoxGeometry(w, h, plateD, 0.008, 0.0025, 0.0025),
      matPrimary,
      0,
      0,
      plateD / 2,
    );

    // 2. Inner Trim Frame
    addSubMesh(
      group,
      createRoundedBoxGeometry(
        Math.max(0.04, w - 0.014),
        Math.max(0.04, h - 0.014),
        0.0025,
        0.006,
        0.001,
        0.001,
      ),
      matPrimary,
      0,
      0,
      plateD + 0.001,
    );

    const style = el.outletStyle || "double";
    const slotCount = style === "single" ? 1 : 2;
    const slotSize = Math.min(0.044, (w - 0.022) / slotCount, h * 0.62);

    for (let i = 0; i < slotCount; i++) {
      const sx = slotCount === 1 ? 0 : i === 0 ? -w * 0.22 : w * 0.22;
      const isSwitchPart = style === "switch" && i === 0;

      if (isSwitchPart) {
        // Saklar Rocker Miring (Mechanical Paddle)
        const swW = slotSize * 0.76;
        const swH = slotSize * 1.12;
        addSubMesh(
          group,
          new THREE.BoxGeometry(swW + 0.004, swH + 0.004, 0.002),
          sharedDarkCavityMat,
          sx,
          0,
          plateD + 0.0022,
        );
        addSubMesh(
          group,
          createRoundedBoxGeometry(swW, swH, 0.004, 0.003, 0.001, 0.001),
          matPrimary,
          sx,
          0,
          plateD + 0.004,
          0.14,
        );
        addSubMesh(
          group,
          new THREE.BoxGeometry(0.003, swH * 0.28, 0.0015),
          matSecondary,
          sx,
          swH * 0.22,
          plateD + 0.0058,
          0.14,
        );
      } else {
        // Stop Kontak Cekung Bertingkat + 2 Lubang Pin
        const wellR = slotSize * 0.48;
        const rimGeo = new THREE.CylinderGeometry(wellR, wellR, 0.0022, 20);
        rimGeo.rotateX(Math.PI / 2);
        addSubMesh(group, rimGeo, matSecondary, sx, 0, plateD + 0.0024);

        const innerFaceGeo = new THREE.CylinderGeometry(
          wellR * 0.84,
          wellR * 0.84,
          0.002,
          20,
        );
        innerFaceGeo.rotateX(Math.PI / 2);
        addSubMesh(group, innerFaceGeo, matPrimary, sx, 0, plateD + 0.0031);

        const pinGeo = new THREE.CylinderGeometry(0.0026, 0.0026, 0.002, 10);
        pinGeo.rotateX(Math.PI / 2);
        const pinOffset = wellR * 0.38;
        addSubMesh(
          group,
          pinGeo,
          sharedDarkCavityMat,
          sx - pinOffset,
          0,
          plateD + 0.0038,
        );
        addSubMesh(
          group,
          pinGeo,
          sharedDarkCavityMat,
          sx + pinOffset,
          0,
          plateD + 0.0038,
        );
      }
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
    line.position.set(0, 0, outlineZ);
    group.add(line);
  }

  group.position.set(localX, localY, 0);
  return group;
}
