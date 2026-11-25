import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

const sharedHandleMat = new THREE.MeshStandardMaterial({
  color: "#27272A",
  metalness: 0.65,
  roughness: 0.32,
});

const sharedChromeMat = new THREE.MeshStandardMaterial({
  color: "#E4E4E7",
  metalness: 0.85,
  roughness: 0.22,
});

const sharedDarkSlotMat = new THREE.MeshStandardMaterial({
  color: "#18181B",
  roughness: 0.75,
});

const sharedSwingZoneMat = new THREE.LineBasicMaterial({
  color: "#f59e0b",
  transparent: true,
  opacity: 0.75,
});

function buildWoodWardrobe(
  group,
  item,
  { matPrimary, matSecondary },
  { W, D, H },
) {
  const isSliding = item.wardrobeDoorType === "sliding";
  const isGrid = item.wardrobeLayout === "grid";

  matPrimary.metalness = 0.05;
  matPrimary.roughness = 0.65;
  if (matSecondary) {
    matSecondary.metalness = 0.05;
    matSecondary.roughness = 0.62;
  }

  // 1. Plinth / Kaki Dasar Recessed
  const plinthH = Math.min(0.075, H * 0.06);
  const plinthInset = 0.024;
  const plinthW = Math.max(0.15, W - plinthInset * 2);
  const plinthD = Math.max(0.12, D - plinthInset * 1.5);
  addPart(
    group,
    createRoundedBoxGeometry(plinthW, plinthH, plinthD, 0.006, 0.003, 0.003),
    matPrimary,
    0,
    plinthH / 2,
    -plinthInset * 0.25,
  );

  // 2. Carcass / Rangka Luar Lemari
  const bodyH = Math.max(0.2, H - plinthH);
  const wallThick = 0.022;
  const topCapH = 0.024;
  const backThick = 0.014;
  const doorRecess = 0.026;

  addPart(
    group,
    createRoundedBoxGeometry(
      W + 0.008,
      topCapH,
      D + 0.006,
      0.008,
      0.004,
      0.004,
    ),
    matPrimary,
    0,
    H - topCapH / 2,
    0.002,
  );

  addPart(
    group,
    createRoundedBoxGeometry(W, wallThick, D, 0.006, 0.003, 0.003),
    matPrimary,
    0,
    plinthH + wallThick / 2,
    0,
  );

  const sideH = Math.max(0.1, bodyH - topCapH - wallThick);
  const sideY = plinthH + wallThick + sideH / 2;
  const sideGeo = createRoundedBoxGeometry(
    wallThick,
    sideH,
    D,
    0.006,
    0.003,
    0.003,
  );
  addPart(group, sideGeo, matPrimary, -W / 2 + wallThick / 2, sideY, 0);
  addPart(group, sideGeo, matPrimary, W / 2 - wallThick / 2, sideY, 0);

  const innerW = Math.max(0.1, W - wallThick * 2);
  addPart(
    group,
    new THREE.BoxGeometry(innerW, sideH, backThick),
    matPrimary,
    0,
    sideY,
    -D / 2 + backThick / 2 + 0.004,
    false,
  );

  // 3. Sekat Dalam & Daun Pintu
  const cols = isGrid
    ? Math.max(1, Math.min(4, item.wardrobeCols || 2))
    : Math.max(1, Math.min(4, item.doorCount || 2));
  const rows = isGrid ? Math.max(2, Math.min(5, item.wardrobeRows || 3)) : 1;

  const doorGap = 0.006;
  const leafThick = 0.018;
  const shelfD = Math.max(0.08, D - doorRecess - backThick - 0.008);
  const shelfZ = -D / 2 + backThick + shelfD / 2 + 0.004;

  if (cols > 1) {
    const dividerGeo = new THREE.BoxGeometry(0.014, sideH, shelfD);
    const colSpan = innerW / cols;
    for (let c = 1; c < cols; c++) {
      const dx = -innerW / 2 + colSpan * c;
      addPart(group, dividerGeo, matPrimary, dx, sideY, shelfZ, false);
    }
  }

  if (rows > 1) {
    const shelfGeo = new THREE.BoxGeometry(innerW, 0.014, shelfD);
    const rowSpan = sideH / rows;
    for (let r = 1; r < rows; r++) {
      const sy = plinthH + wallThick + rowSpan * r;
      addPart(group, shelfGeo, matPrimary, 0, sy, shelfZ, false);
    }
  }

  const totalLeafW = isSliding
    ? (innerW + 0.016) / cols
    : (innerW - doorGap * (cols + 1)) / cols;
  const totalLeafH = (sideH - doorGap * (rows + 1)) / rows;

  const handleH = Math.min(0.14, totalLeafH * 0.34);
  const handleBarGeo = createRoundedBoxGeometry(
    0.01,
    handleH,
    0.01,
    0.003,
    0.002,
    0.002,
  );
  const standoffGeo = new THREE.BoxGeometry(0.008, 0.008, 0.014);

  for (let r = 0; r < rows; r++) {
    const cy =
      plinthH +
      wallThick +
      doorGap +
      totalLeafH / 2 +
      r * (totalLeafH + doorGap);

    for (let c = 0; c < cols; c++) {
      const cx = isSliding
        ? -innerW / 2 +
          totalLeafW / 2 +
          c * ((innerW - totalLeafW) / Math.max(1, cols - 1))
        : -innerW / 2 + doorGap + totalLeafW / 2 + c * (totalLeafW + doorGap);

      const zFront = isSliding
        ? c % 2 === 1
          ? D / 2 - leafThick / 2 - 0.003
          : D / 2 - leafThick * 1.65 - 0.005
        : D / 2 - leafThick / 2 - 0.005;

      addPart(
        group,
        createRoundedBoxGeometry(
          totalLeafW,
          totalLeafH,
          leafThick,
          0.005,
          0.003,
          0.003,
        ),
        matSecondary,
        cx,
        cy,
        zFront,
      );

      const handleX =
        cols === 1
          ? cx + totalLeafW * 0.36
          : c % 2 === 0
            ? cx + totalLeafW * 0.36
            : cx - totalLeafW * 0.36;
      const handleY = isGrid
        ? cy
        : Math.min(plinthH + 1.02, plinthH + sideH * 0.52);
      const doorSurfaceZ = zFront + leafThick / 2;

      addPart(
        group,
        handleBarGeo,
        sharedHandleMat,
        handleX,
        handleY,
        doorSurfaceZ + 0.016,
        false,
      );
      addPart(
        group,
        standoffGeo,
        sharedHandleMat,
        handleX,
        handleY + handleH * 0.32,
        doorSurfaceZ + 0.007,
        false,
      );
      addPart(
        group,
        standoffGeo,
        sharedHandleMat,
        handleX,
        handleY - handleH * 0.32,
        doorSurfaceZ + 0.007,
        false,
      );
    }
  }

  if (!isSliding) {
    const swingDepth = Math.min(0.65, totalLeafW);
    for (let c = 0; c < cols; c++) {
      const cx =
        -innerW / 2 + doorGap + totalLeafW / 2 + c * (totalLeafW + doorGap);
      const zoneGeo = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(totalLeafW, swingDepth),
      );
      const zoneLine = new THREE.LineSegments(zoneGeo, sharedSwingZoneMat);
      zoneLine.rotation.x = -Math.PI / 2;
      zoneLine.position.set(cx, 0.004, D / 2 + swingDepth / 2);
      group.add(zoneLine);
    }
  }
}

function buildLockerWardrobe(
  group,
  item,
  { matPrimary, matSecondary },
  { W, D, H },
) {
  const isSliding = item.wardrobeDoorType === "sliding";
  const isGrid = item.wardrobeLayout === "grid";

  // Powder-coated steel finish
  matPrimary.metalness = 0.28;
  matPrimary.roughness = 0.38;
  const doorMat = matSecondary || matPrimary;
  doorMat.metalness = 0.32;
  doorMat.roughness = 0.34;

  // 1. 4 Kaki Besi Ramping + Sepatu Karet
  const legH = Math.min(0.14, Math.max(0.055, H * 0.11));
  const legSize = 0.022;
  const footH = 0.008;
  const legShaftH = Math.max(0.03, legH - footH);
  const legInset = 0.016;

  const legGeo = new THREE.BoxGeometry(legSize, legShaftH, legSize);
  const footGeo = new THREE.BoxGeometry(
    legSize + 0.002,
    footH,
    legSize + 0.002,
  );
  const lx = Math.max(0.03, W / 2 - legInset - legSize / 2);
  const lz = Math.max(0.03, D / 2 - legInset - legSize / 2);

  [
    [-lx, -lz],
    [lx, -lz],
    [-lx, lz],
    [lx, lz],
  ].forEach(([px, pz]) => {
    addPart(group, footGeo, sharedDarkSlotMat, px, footH / 2, pz, false);
    addPart(group, legGeo, matPrimary, px, footH + legShaftH / 2, pz, true);
  });

  // 2. Bodi Plat Besi (Top Lid Overhang + Base Skirt + Side Walls + Back)
  const topLidH = 0.016;
  const baseRailH = 0.022;
  const wallThick = 0.014;
  const backThick = 0.01;
  const cabinetH = Math.max(0.18, H - legH);
  const sideH = Math.max(0.1, cabinetH - topLidH - baseRailH);
  const sideY = legH + baseRailH + sideH / 2;

  // Tutup atas plat besi ber-bevel tipis dengan overhang 4mm (ciri khas loker)
  addPart(
    group,
    createRoundedBoxGeometry(
      W + 0.008,
      topLidH,
      D + 0.008,
      0.005,
      0.0025,
      0.0025,
    ),
    matPrimary,
    0,
    H - topLidH / 2,
    0.002,
  );

  // Rangka bawah loker
  addPart(
    group,
    createRoundedBoxGeometry(W, baseRailH, D, 0.004, 0.002, 0.002),
    matPrimary,
    0,
    legH + baseRailH / 2,
    0,
  );

  // Dinding samping kiri & kanan
  const sideGeo = new THREE.BoxGeometry(wallThick, sideH, D);
  addPart(group, sideGeo, matPrimary, -W / 2 + wallThick / 2, sideY, 0);
  addPart(group, sideGeo, matPrimary, W / 2 - wallThick / 2, sideY, 0);

  // Panel belakang
  const innerW = Math.max(0.08, W - wallThick * 2);
  addPart(
    group,
    new THREE.BoxGeometry(innerW, sideH, backThick),
    matPrimary,
    0,
    sideY,
    -D / 2 + backThick / 2 + 0.002,
    false,
  );

  // 3. Sekat Kompartemen & Pintu Loker
  const cols = isGrid
    ? Math.max(1, Math.min(4, item.wardrobeCols || 2))
    : Math.max(1, Math.min(4, item.doorCount || 1));
  const rows = isGrid ? Math.max(2, Math.min(5, item.wardrobeRows || 3)) : 1;

  const doorGap = 0.005;
  const leafThick = 0.014;
  const shelfD = Math.max(0.06, D - 0.032);
  const shelfZ = -D / 2 + backThick + shelfD / 2 + 0.002;

  if (cols > 1) {
    const vDivGeo = new THREE.BoxGeometry(0.012, sideH, shelfD);
    const colSpan = innerW / cols;
    for (let c = 1; c < cols; c++) {
      addPart(
        group,
        vDivGeo,
        matPrimary,
        -innerW / 2 + colSpan * c,
        sideY,
        shelfZ,
        false,
      );
    }
  }

  if (rows > 1) {
    const hDivGeo = new THREE.BoxGeometry(innerW, 0.012, shelfD);
    const rowSpan = sideH / rows;
    for (let r = 1; r < rows; r++) {
      addPart(
        group,
        hDivGeo,
        matPrimary,
        0,
        legH + baseRailH + rowSpan * r,
        shelfZ,
        false,
      );
    }
  }

  const totalLeafW = isSliding
    ? (innerW + 0.014) / cols
    : (innerW - doorGap * (cols + 1)) / cols;
  const totalLeafH = (sideH - doorGap * (rows + 1)) / rows;

  const handleH = Math.min(0.13, Math.max(0.045, totalLeafH * 0.28));
  const handleBarGeo = createRoundedBoxGeometry(
    0.0085,
    handleH,
    0.0085,
    0.003,
    0.002,
    0.002,
  );
  const standoffGeo = new THREE.BoxGeometry(0.007, 0.007, 0.013);

  const louverW = Math.min(0.15, Math.max(0.05, totalLeafW * 0.44));
  const louverGeo = createRoundedBoxGeometry(
    louverW,
    0.006,
    0.006,
    0.002,
    0.001,
    0.001,
  );

  const tagW = Math.min(0.052, totalLeafW * 0.24);
  const tagH = 0.022;
  const tagFrameGeo = new THREE.BoxGeometry(tagW, tagH, 0.0025);
  const tagCardGeo = new THREE.BoxGeometry(tagW * 0.78, tagH * 0.64, 0.003);

  const lockBezelGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.004, 14);
  lockBezelGeo.rotateX(Math.PI / 2);
  const lockCoreGeo = new THREE.BoxGeometry(0.0025, 0.008, 0.005);

  for (let r = 0; r < rows; r++) {
    const cy =
      legH + baseRailH + doorGap + totalLeafH / 2 + r * (totalLeafH + doorGap);

    for (let c = 0; c < cols; c++) {
      const cx = isSliding
        ? -innerW / 2 +
          totalLeafW / 2 +
          c * ((innerW - totalLeafW) / Math.max(1, cols - 1))
        : -innerW / 2 + doorGap + totalLeafW / 2 + c * (totalLeafW + doorGap);

      const zFront = isSliding
        ? c % 2 === 1
          ? D / 2 - leafThick / 2 - 0.003
          : D / 2 - leafThick * 1.65 - 0.005
        : D / 2 - leafThick / 2 - 0.004;

      const doorSurfaceZ = zFront + leafThick / 2;

      // Daun pintu plat besi ber-bevel halus
      addPart(
        group,
        createRoundedBoxGeometry(
          totalLeafW,
          totalLeafH,
          leafThick,
          0.003,
          0.002,
          0.002,
        ),
        doorMat,
        cx,
        cy,
        zFront,
      );

      // Bingkai kartu nama di bagian atas pintu
      if (totalLeafH >= 0.22 && totalLeafW >= 0.16) {
        const tagY = cy + totalLeafH / 2 - Math.min(0.042, totalLeafH * 0.14);
        addPart(
          group,
          tagFrameGeo,
          sharedChromeMat,
          cx,
          tagY,
          doorSurfaceZ + 0.0012,
          false,
        );
        addPart(
          group,
          tagCardGeo,
          sharedDarkSlotMat,
          cx,
          tagY,
          doorSurfaceZ + 0.0016,
          false,
        );
      }

      // 3 Garis Kisi Ventilasi Timbul (Embossed Louvers)
      if (totalLeafH >= 0.24 && totalLeafW >= 0.14) {
        const louverBaseY =
          totalLeafH > 0.85 ? cy - totalLeafH * 0.26 : cy - totalLeafH * 0.12;
        for (let lv = 0; lv < 3; lv++) {
          const ly = louverBaseY + (lv - 1) * 0.016;
          const lvMesh = addPart(
            group,
            louverGeo,
            doorMat,
            cx,
            ly,
            doorSurfaceZ + 0.0022,
            false,
          );
          lvMesh.rotation.x = 0.28;
        }
      }

      // Handle Vertikal & Kunci Silinder Krom
      const isRightSide = cols === 1 ? true : c % 2 === 0;
      const handleX = isRightSide
        ? cx + totalLeafW * 0.35
        : cx - totalLeafW * 0.35;
      const handleY = isGrid
        ? cy + totalLeafH * 0.04
        : Math.min(legH + 0.96, cy + totalLeafH * 0.08);

      addPart(
        group,
        handleBarGeo,
        doorMat,
        handleX,
        handleY,
        doorSurfaceZ + 0.015,
        false,
      );
      addPart(
        group,
        standoffGeo,
        doorMat,
        handleX,
        handleY + handleH * 0.32,
        doorSurfaceZ + 0.0065,
        false,
      );
      addPart(
        group,
        standoffGeo,
        doorMat,
        handleX,
        handleY - handleH * 0.32,
        doorSurfaceZ + 0.0065,
        false,
      );

      // Lubang kunci tepat di bawah handle
      const lockY = handleY - handleH / 2 - 0.024;
      addPart(
        group,
        lockBezelGeo,
        sharedChromeMat,
        handleX,
        lockY,
        doorSurfaceZ + 0.002,
        false,
      );
      addPart(
        group,
        lockCoreGeo,
        sharedDarkSlotMat,
        handleX,
        lockY,
        doorSurfaceZ + 0.0026,
        false,
      );
    }
  }

  if (!isSliding) {
    const swingDepth = Math.min(0.65, totalLeafW);
    for (let c = 0; c < cols; c++) {
      const cx =
        -innerW / 2 + doorGap + totalLeafW / 2 + c * (totalLeafW + doorGap);
      const zoneGeo = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(totalLeafW, swingDepth),
      );
      const zoneLine = new THREE.LineSegments(zoneGeo, sharedSwingZoneMat);
      zoneLine.rotation.x = -Math.PI / 2;
      zoneLine.position.set(cx, 0.004, D / 2 + swingDepth / 2);
      group.add(zoneLine);
    }
  }
}

export const wardrobeModule = {
  type: "wardrobe",
  zone: "storage",

  getCatalogConfig(t) {
    return {
      type: "wardrobe",
      title: t.catWardrobe,
      variants: [
        {
          label: t.wardrobeSwing,
          patch: { wardrobeStyle: "wood", wardrobeDoorType: "swing" },
        },
        {
          label: t.wardrobeSliding,
          patch: { wardrobeStyle: "wood", wardrobeDoorType: "sliding" },
        },
        {
          label: t.wardrobeLocker || "Loker Besi",
          patch: {
            wardrobeStyle: "locker",
            wardrobeDoorType: "swing",
            wardrobeLayout: "vertical",
            doorCount: 1,
            width: 50,
            depth: 45,
            height: 175,
            color1: "#4D6B53",
            color2: "#5F7F66",
          },
        },
      ],
    };
  },

  getItemLabel(item, t) {
    const baseName =
      item.wardrobeStyle === "locker"
        ? t.wardrobeLocker || "Loker"
        : t.catWardrobe;

    if (item.wardrobeLayout === "grid") {
      const cols = item.wardrobeCols || 2;
      const rows = item.wardrobeRows || 3;
      return `${baseName} Grid ${cols}×${rows} (${cols * rows}P)`;
    }
    return `${baseName} ${item.doorCount || 1}P`;
  },

  getColorLabels(item, t) {
    if (item.wardrobeStyle === "locker") {
      return {
        color1: t.colorLockerBody || "Warna Bodi Loker",
        color2: t.colorLockerDoor || "Warna Pintu Loker",
      };
    }
    return {
      color1: t.colorWardrobeBody,
      color2: t.colorWardrobeDoor,
    };
  },

  createDefault(id, variant = {}) {
    const isLocker = variant.wardrobeStyle === "locker";
    const wardrobeDoorType = variant.wardrobeDoorType || "swing";
    return {
      id,
      type: "wardrobe",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width: variant.width || (isLocker ? 50 : 100),
      depth: variant.depth || (isLocker ? 45 : 50),
      height: variant.height || (isLocker ? 175 : 180),
      wardrobeStyle: isLocker ? "locker" : "wood",
      wardrobeLayout: variant.wardrobeLayout || "vertical",
      doorCount: variant.doorCount || (isLocker ? 1 : 2),
      wardrobeCols: variant.wardrobeCols || 2,
      wardrobeRows: variant.wardrobeRows || 3,
      wardrobeDoorType,
      color1: variant.color1 || (isLocker ? "#4D6B53" : "#E2E8F0"),
      color2: variant.color2 || (isLocker ? "#5F7F66" : "#94A3B8"),
    };
  },

  buildMesh(group, item, mats, dims) {
    if (item.wardrobeStyle === "locker") {
      buildLockerWardrobe(group, item, mats, dims);
    } else {
      buildWoodWardrobe(group, item, mats, dims);
    }
  },
};
