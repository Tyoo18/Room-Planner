import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

const sharedHandleMat = new THREE.MeshStandardMaterial({
  color: "#27272A",
  metalness: 0.65,
  roughness: 0.32,
});

const sharedSwingZoneMat = new THREE.LineBasicMaterial({
  color: "#f59e0b",
  transparent: true,
  opacity: 0.75,
});

export const wardrobeModule = {
  type: "wardrobe",
  zone: "storage",

  getCatalogConfig(t) {
    return {
      type: "wardrobe",
      title: t.catWardrobe,
      variants: [
        { label: t.wardrobeSwing, patch: { wardrobeDoorType: "swing" } },
        { label: t.wardrobeSliding, patch: { wardrobeDoorType: "sliding" } },
      ],
    };
  },

  getItemLabel(item, t) {
    if (item.wardrobeLayout === "grid") {
      const cols = item.wardrobeCols || 2;
      const rows = item.wardrobeRows || 3;
      return `${t.catWardrobe} Grid ${cols}×${rows} (${cols * rows}P)`;
    }
    return `${t.catWardrobe} ${item.doorCount}P`;
  },

  getColorLabels(_item, t) {
    return {
      color1: t.colorWardrobeBody,
      color2: t.colorWardrobeDoor,
    };
  },

  createDefault(id, variant = {}) {
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
  },

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D, H }) {
    const isSliding = item.wardrobeDoorType === "sliding";
    const isGrid = item.wardrobeLayout === "grid";

    // 1. Plinth / Kaki Dasar Recessed (menciptakan bayangan bawah)
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

    // 2. Carcass / Rangka Luar Lemari (Side Panels, Top Crown, Bottom Base, Back Panel)
    const bodyH = Math.max(0.2, H - plinthH);
    const bodyCenterY = plinthH + bodyH / 2;
    const wallThick = 0.022;
    const topCapH = 0.024;
    const backThick = 0.014;
    const doorRecess = 0.026; // Ruang masuk untuk pintu agar terbingkai carcass

    // Papan Atas (Top Cap sedikit menjorok 4mm untuk siluet tegas)
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

    // Papan Bawah Carcass (di atas plinth)
    addPart(
      group,
      createRoundedBoxGeometry(W, wallThick, D, 0.006, 0.003, 0.003),
      matPrimary,
      0,
      plinthH + wallThick / 2,
      0,
    );

    // Dinding Samping Kiri & Kanan
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

    // Panel Belakang (sedikit masuk ke dalam)
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

    // 3. Sekat Dalam & Daun Pintu (Inset di dalam Carcass)
    const cols = isGrid
      ? Math.max(1, Math.min(4, item.wardrobeCols || 2))
      : Math.max(1, Math.min(4, item.doorCount || 2));
    const rows = isGrid ? Math.max(2, Math.min(5, item.wardrobeRows || 3)) : 1;

    const doorGap = 0.006;
    const leafThick = 0.018;
    const shelfD = Math.max(0.08, D - doorRecess - backThick - 0.008);
    const shelfZ = -D / 2 + backThick + shelfD / 2 + 0.004;

    // Sekat vertikal tipis di balik celah antar pintu (menutup celah agar tidak bolong)
    if (cols > 1) {
      const dividerGeo = new THREE.BoxGeometry(0.014, sideH, shelfD);
      const colSpan = innerW / cols;
      for (let c = 1; c < cols; c++) {
        const dx = -innerW / 2 + colSpan * c;
        addPart(group, dividerGeo, matPrimary, dx, sideY, shelfZ, false);
      }
    }

    // Sekat horizontal untuk mode Grid
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

        // Daun pintu dengan micro-bevel agar tepian menangkap cahaya
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

        // Handle dengan 2 kaki standoff
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

    // 4. Indikator Area Bukaan Pintu Swing di Lantai
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
  },
};
