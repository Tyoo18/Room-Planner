import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

const sharedDarkTrimMat = new THREE.MeshStandardMaterial({
  color: "#18181B",
  roughness: 0.55,
  metalness: 0.25,
});

// Menggabungkan banyak geometri menjadi 1 BufferGeometry (1 draw call)
function mergeParts(entries) {
  const valid = [];
  let totalVerts = 0;

  for (const entry of entries) {
    const {
      geo,
      x = 0,
      y = 0,
      z = 0,
      rx = 0,
      ry = 0,
      rz = 0,
      sx = 1,
      sy = 1,
      sz = 1,
    } = entry;

    const nonIndexed = geo.index ? geo.toNonIndexed() : geo.clone();
    const pos = nonIndexed.attributes.position;
    if (!pos) continue;

    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rx, ry, rz),
    );
    matrix.compose(
      new THREE.Vector3(x, y, z),
      quat,
      new THREE.Vector3(sx, sy, sz),
    );
    nonIndexed.applyMatrix4(matrix);

    if (!nonIndexed.attributes.normal) {
      nonIndexed.computeVertexNormals();
    }

    valid.push(nonIndexed);
    totalVerts += pos.count;
    geo.dispose();
  }

  const merged = new THREE.BufferGeometry();
  if (totalVerts === 0) return merged;

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let offset = 0;

  for (const g of valid) {
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    positions.set(p, offset);
    normals.set(n, offset);
    offset += p.length;
    g.dispose();
  }

  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return merged;
}

function buildWireShelf(
  group,
  item,
  { matPrimary, matSecondary },
  { W, D, H },
) {
  const tiers = Math.max(2, Math.min(5, item.shelfTiers || 3));
  const legPairs = Math.max(2, Math.min(3, item.shelfLegPairs || 2));

  // Finish logam chrome / powder-coated wire
  matPrimary.metalness = 0.72;
  matPrimary.roughness = 0.26;
  const poleMat = matSecondary || matPrimary;
  poleMat.metalness = 0.78;
  poleMat.roughness = 0.22;

  const poleR = 0.011;
  const footH = 0.024;
  const topCapH = 0.008;
  const poleInsetX = poleR + 0.004;
  const poleInsetZ = poleR + 0.004;
  const spanX = Math.max(0.1, W - poleInsetX * 2);
  const spanZ = Math.max(0.08, D - poleInsetZ * 2);

  const poleParts = [];
  const trimParts = [];
  const wireParts = [];

  // 1. Tiang Vertikal Beruas + Sepatu Karet Bawah + Tutup Atas
  const poleCoords = [];
  for (let p = 0; p < legPairs; p++) {
    const ratio = legPairs === 1 ? 0.5 : p / (legPairs - 1);
    const lx = -spanX / 2 + ratio * spanX;
    poleCoords.push([lx, -spanZ / 2], [lx, spanZ / 2]);
  }

  const grooveCount = Math.max(3, Math.floor((H - 0.1) / 0.085));
  for (const [px, pz] of poleCoords) {
    // Tiang utama
    poleParts.push({
      geo: new THREE.CylinderGeometry(
        poleR,
        poleR,
        Math.max(0.1, H - footH - topCapH),
        12,
      ),
      x: px,
      y: footH + (H - footH - topCapH) / 2,
      z: pz,
    });

    // Cincin ruas khas rak kawat chrome
    for (let g = 1; g <= grooveCount; g++) {
      const gy = footH + ((H - footH - topCapH) / (grooveCount + 1)) * g;
      poleParts.push({
        geo: new THREE.CylinderGeometry(poleR * 1.12, poleR * 1.12, 0.003, 12),
        x: px,
        y: gy,
        z: pz,
      });
    }

    // Sepatu kaki hitam & tutup tiang atas
    trimParts.push(
      {
        geo: new THREE.CylinderGeometry(poleR * 1.18, poleR * 1.28, footH, 12),
        x: px,
        y: footH / 2,
        z: pz,
      },
      {
        geo: new THREE.CylinderGeometry(
          poleR * 1.05,
          poleR * 1.15,
          topCapH,
          12,
        ),
        x: px,
        y: H - topCapH / 2,
        z: pz,
      },
    );
  }

  // 2. Keranjang Kawat Bertingkat (Wire Baskets + Klip Penyangga)
  const levelStep = (H - 0.12) / Math.max(1, tiers - 1);
  const basketH = Math.min(0.068, Math.max(0.036, levelStep * 0.26));
  const bottomY = Math.min(0.075, H * 0.12);
  const topY = H - basketH - 0.025;

  const basketW = Math.max(0.12, W - 0.004);
  const basketD = Math.max(0.1, D - 0.004);
  const rimThick = 0.0048;
  const wireThick = 0.0026;

  for (let tIdx = 0; tIdx < tiers; tIdx++) {
    const ratio = tiers === 1 ? 0 : tIdx / (tiers - 1);
    const by = bottomY + ratio * (topY - bottomY);
    const rimTopY = by + basketH;

    // Klip plastik hitam di setiap tiang yang menahan keranjang
    for (const [px, pz] of poleCoords) {
      trimParts.push({
        geo: new THREE.CylinderGeometry(
          poleR * 1.38,
          poleR * 1.32,
          basketH * 0.68,
          12,
        ),
        x: px,
        y: by + basketH * 0.42,
        z: pz,
      });
    }

    // Bingkai Kawat Tebal Atas & Bawah (4 sisi)
    [by, rimTopY].forEach((ry) => {
      wireParts.push(
        {
          geo: new THREE.BoxGeometry(basketW, rimThick, rimThick),
          x: 0,
          y: ry,
          z: -basketD / 2,
        },
        {
          geo: new THREE.BoxGeometry(basketW, rimThick, rimThick),
          x: 0,
          y: ry,
          z: basketD / 2,
        },
        {
          geo: new THREE.BoxGeometry(rimThick, rimThick, basketD),
          x: -basketW / 2,
          y: ry,
          z: 0,
        },
        {
          geo: new THREE.BoxGeometry(rimThick, rimThick, basketD),
          x: basketW / 2,
          y: ry,
          z: 0,
        },
      );
    });

    // Sabuk kawat tengah di dinding keranjang
    const midY = by + basketH * 0.5;
    wireParts.push(
      {
        geo: new THREE.BoxGeometry(basketW, wireThick, wireThick),
        x: 0,
        y: midY,
        z: -basketD / 2,
      },
      {
        geo: new THREE.BoxGeometry(basketW, wireThick, wireThick),
        x: 0,
        y: midY,
        z: basketD / 2,
      },
      {
        geo: new THREE.BoxGeometry(wireThick, wireThick, basketD),
        x: -basketW / 2,
        y: midY,
        z: 0,
      },
      {
        geo: new THREE.BoxGeometry(wireThick, wireThick, basketD),
        x: basketW / 2,
        y: midY,
        z: 0,
      },
    );

    // Jeruji Dinding Vertikal Depan-Belakang & Kiri-Kanan
    const colsX = Math.max(6, Math.round(basketW / 0.042));
    for (let cx = 0; cx <= colsX; cx++) {
      const wx = -basketW / 2 + (basketW / colsX) * cx;
      wireParts.push(
        {
          geo: new THREE.BoxGeometry(wireThick, basketH, wireThick),
          x: wx,
          y: midY,
          z: -basketD / 2,
        },
        {
          geo: new THREE.BoxGeometry(wireThick, basketH, wireThick),
          x: wx,
          y: midY,
          z: basketD / 2,
        },
        // Kawat alas melintang (front-to-back)
        {
          geo: new THREE.BoxGeometry(wireThick, wireThick, basketD),
          x: wx,
          y: by,
          z: 0,
        },
      );
    }

    const colsZ = Math.max(4, Math.round(basketD / 0.042));
    for (let cz = 0; cz <= colsZ; cz++) {
      const wz = -basketD / 2 + (basketD / colsZ) * cz;
      wireParts.push(
        {
          geo: new THREE.BoxGeometry(wireThick, basketH, wireThick),
          x: -basketW / 2,
          y: midY,
          z: wz,
        },
        {
          geo: new THREE.BoxGeometry(wireThick, basketH, wireThick),
          x: basketW / 2,
          y: midY,
          z: wz,
        },
        // Kawat alas memanjang (left-to-right)
        {
          geo: new THREE.BoxGeometry(basketW, wireThick, wireThick),
          x: 0,
          y: by,
          z: wz,
        },
      );
    }
  }

  addPart(group, mergeParts(poleParts), poleMat, 0, 0, 0, true);
  addPart(group, mergeParts(trimParts), sharedDarkTrimMat, 0, 0, 0, false);
  addPart(group, mergeParts(wireParts), matPrimary, 0, 0, 0, true);
}

function buildLadderBookcase(
  group,
  item,
  { matPrimary, matSecondary },
  { W, D, H },
) {
  const cols = Math.max(1, Math.min(3, item.shelfCols || 2));
  const rows = Math.max(3, Math.min(6, item.shelfRows || 5));
  const hasDrawers = item.hasBottomDrawers !== false;

  matPrimary.metalness = 0.06;
  matPrimary.roughness = 0.58;
  const drawerMat = matSecondary || matPrimary;
  drawerMat.metalness = 0.05;
  drawerMat.roughness = 0.52;

  const postW = 0.026;
  const postD = 0.032;
  const plankT = 0.022;
  const rungH = 0.018;
  const bottomY = 0.065;
  const topY = H - plankT / 2;

  const frameParts = [];
  const drawerParts = [];

  // 1. Tiang Tangga Vertikal (cols + 1 pasangan depan-belakang)
  const baySpan = (W - postW) / cols;
  const frontZ = D / 2 - postD / 2;
  const backZ = -D / 2 + postD / 2;
  const rungLen = Math.max(0.06, D - postD * 2);

  const postXs = [];
  for (let c = 0; c <= cols; c++) {
    const px = -W / 2 + postW / 2 + baySpan * c;
    postXs.push(px);

    frameParts.push(
      {
        geo: new THREE.BoxGeometry(postW, H, postD),
        x: px,
        y: H / 2,
        z: frontZ,
      },
      {
        geo: new THREE.BoxGeometry(postW, H, postD),
        x: px,
        y: H / 2,
        z: backZ,
      },
    );
  }

  // 2. Ambalan Bertingkat + Anak Tangga Samping + X-Brace Belakang
  const shelfYs = [];
  for (let r = 0; r < rows; r++) {
    const ratio = rows === 1 ? 0 : r / (rows - 1);
    const sy = bottomY + ratio * (topY - bottomY);
    shelfYs.push(sy);

    // Anak tangga penghubung tiang depan-belakang di setiap level
    for (const px of postXs) {
      frameParts.push({
        geo: new THREE.BoxGeometry(postW * 0.82, rungH, rungLen),
        x: px,
        y: sy - plankT / 2 - rungH / 2 + 0.002,
        z: 0,
      });
    }

    // Papan ambalan per kolom (bay)
    const plankW = Math.max(0.08, baySpan - postW);
    for (let c = 0; c < cols; c++) {
      const bayCenterX = -W / 2 + postW / 2 + baySpan * (c + 0.5);
      frameParts.push({
        geo: createRoundedBoxGeometry(
          plankW,
          plankT,
          D - 0.006,
          0.004,
          0.002,
          0.002,
        ),
        x: bayCenterX,
        y: sy,
        z: 0,
      });
    }
  }

  // X-Brace penguat tipis di bagian belakang
  if (shelfYs.length >= 3) {
    const braceBotY = shelfYs[1];
    const braceTopY = shelfYs[shelfYs.length - 2];
    const braceH = braceTopY - braceBotY;
    const bayW = Math.max(0.1, baySpan - postW);
    const diagLen = Math.hypot(bayW, braceH);
    const diagAngle = Math.atan2(braceH, bayW);
    const braceZ = -D / 2 + 0.006;

    for (let c = 0; c < cols; c++) {
      if (cols === 3 && c === 1) continue; // Kolom tengah dibiarkan terbuka seperti referensi
      const bayCenterX = -W / 2 + postW / 2 + baySpan * (c + 0.5);
      const midY = (braceBotY + braceTopY) / 2;
      frameParts.push(
        {
          geo: new THREE.BoxGeometry(diagLen, 0.01, 0.006),
          x: bayCenterX,
          y: midY,
          z: braceZ,
          rz: diagAngle,
        },
        {
          geo: new THREE.BoxGeometry(diagLen, 0.01, 0.006),
          x: bayCenterX,
          y: midY,
          z: braceZ,
          rz: -diagAngle,
        },
      );
    }
  }

  // 3. Unit Laci Kayu di Baris Paling Bawah (2 Laci Bertumpuk per Kolom)
  if (hasDrawers && shelfYs.length >= 2) {
    const boxBotY = shelfYs[0] + plankT / 2;
    const boxTopY = shelfYs[1] - plankT / 2;
    const boxH = boxTopY - boxBotY;

    if (boxH >= 0.14) {
      const boxCenterY = (boxBotY + boxTopY) / 2;
      const boxW = Math.max(0.08, baySpan - postW - 0.004);
      const boxD = Math.max(0.08, D - 0.024);
      const faceThick = 0.018;
      const drawerGap = 0.005;
      const singleDrawerH = (boxH - drawerGap * 3) / 2;

      for (let c = 0; c < cols; c++) {
        // Jika 3 kolom, laci ditaruh di kolom kiri & kanan (kolom tengah rak terbuka ala referensi)
        if (cols === 3 && c === 1) continue;

        const bayCenterX = -W / 2 + postW / 2 + baySpan * (c + 0.5);

        // Bodi kotak laci dalam
        frameParts.push({
          geo: new THREE.BoxGeometry(boxW, boxH, boxD),
          x: bayCenterX,
          y: boxCenterY,
          z: -faceThick / 2,
        });

        // 2 Muka Laci Kayu Ber-bevel + Coakan Pull Slot
        for (let dIdx = 0; dIdx < 2; dIdx++) {
          const dy =
            boxBotY +
            drawerGap +
            singleDrawerH / 2 +
            dIdx * (singleDrawerH + drawerGap);
          drawerParts.push({
            geo: createRoundedBoxGeometry(
              boxW - 0.004,
              singleDrawerH,
              faceThick,
              0.004,
              0.0025,
              0.0025,
            ),
            x: bayCenterX,
            y: dy,
            z: D / 2 - faceThick / 2 - 0.002,
          });
        }
      }
    }
  }

  addPart(group, mergeParts(frameParts), matPrimary, 0, 0, 0, true);
  if (drawerParts.length > 0) {
    addPart(group, mergeParts(drawerParts), drawerMat, 0, 0, 0, true);
  }
}

export const shelfModule = {
  type: "shelf",
  zone: "storage",

  getCatalogConfig(t) {
    return {
      type: "shelf",
      title: t.catShelf,
      variants: [
        { label: t.shelfCube, patch: { shelfStyle: "cube" } },
        { label: t.shelfConsole, patch: { shelfStyle: "console" } },
        {
          label: t.shelfWire || "Rak Kawat",
          patch: {
            shelfStyle: "wire",
            shelfTiers: 3,
            shelfLegPairs: 2,
            width: 90,
            depth: 36,
            height: 95,
            color1: "#D4D4D8",
            color2: "#71717A",
          },
        },
        {
          label: t.shelfBookcase || "Rak Buku Laci",
          patch: {
            shelfStyle: "bookcase",
            shelfCols: 2,
            shelfRows: 5,
            hasBottomDrawers: true,
            width: 140,
            depth: 36,
            height: 185,
            color1: "#94A3B8",
            color2: "#D6B892",
          },
        },
      ],
    };
  },

  getItemLabel(item, t) {
    const style = item.shelfStyle || "cube";
    if (style === "console") {
      return `${t.shelfConsole} (${item.shelfTiers || 2}T)`;
    }
    if (style === "wire") {
      return `${t.shelfWire || "Rak Kawat"} (${item.shelfTiers || 3}T)`;
    }
    if (style === "bookcase") {
      return `${t.shelfBookcase || "Rak Buku"} ${item.shelfCols || 2}×${item.shelfRows || 5}`;
    }
    return `${t.shelfCube} ${item.shelfCols || 4}×${item.shelfRows || 2}`;
  },

  getColorLabels(item, t) {
    const style = item.shelfStyle || "cube";
    if (style === "console") {
      return { color1: t.colorShelfBoard, color2: t.colorShelfLegs };
    }
    if (style === "wire") {
      return {
        color1: t.colorWireBasket || "Warna Keranjang",
        color2: t.colorWirePoles || "Warna Tiang",
      };
    }
    if (style === "bookcase") {
      return {
        color1: t.colorBookcaseFrame || "Warna Rangka & Rak",
        color2:
          item.hasBottomDrawers !== false
            ? t.colorBookcaseDrawer || "Warna Laci Bawah"
            : null,
      };
    }
    return { color1: t.colorShelfFrame, color2: t.colorShelfInner };
  },

  createDefault(id, variant = {}) {
    const shelfStyle = variant.shelfStyle || "cube";

    if (shelfStyle === "console") {
      return {
        id,
        type: "shelf",
        locked: false,
        x: 0,
        z: 0,
        rotation: 0,
        width: 160,
        depth: 38,
        height: 68,
        shelfStyle: "console",
        shelfTiers: 2,
        shelfLegPairs: 3,
        color1: "#C68B59",
        color2: "#64748B",
      };
    }

    if (shelfStyle === "wire") {
      return {
        id,
        type: "shelf",
        locked: false,
        x: 0,
        z: 0,
        rotation: 0,
        width: 90,
        depth: 36,
        height: 95,
        shelfStyle: "wire",
        shelfTiers: 3,
        shelfLegPairs: 2,
        color1: "#D4D4D8",
        color2: "#71717A",
      };
    }

    if (shelfStyle === "bookcase") {
      return {
        id,
        type: "shelf",
        locked: false,
        x: 0,
        z: 0,
        rotation: 0,
        width: 140,
        depth: 36,
        height: 185,
        shelfStyle: "bookcase",
        shelfCols: 2,
        shelfRows: 5,
        hasBottomDrawers: true,
        color1: "#94A3B8",
        color2: "#D6B892",
      };
    }

    return {
      id,
      type: "shelf",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width: 147,
      depth: 39,
      height: 77,
      shelfStyle: "cube",
      shelfCols: 4,
      shelfRows: 2,
      color1: "#F8FAFC",
      color2: "#F1F5F9",
    };
  },

  buildMesh(group, item, mats, dims) {
    const { matPrimary, matSecondary } = mats;
    const { W, D, H } = dims;
    const style = item.shelfStyle || "cube";

    if (style === "wire") {
      buildWireShelf(group, item, mats, dims);
      return;
    }

    if (style === "bookcase") {
      buildLadderBookcase(group, item, mats, dims);
      return;
    }

    if (style === "console") {
      const tiers = Math.max(2, Math.min(4, item.shelfTiers || 2));
      const legPairs = Math.max(2, Math.min(3, item.shelfLegPairs || 3));
      const plankT = 0.028;
      const footH = 0.012;
      const bottomY = Math.min(0.11, H * 0.18);
      const topY = H - plankT / 2 - 0.004;

      const plankGeo = createRoundedBoxGeometry(
        W,
        plankT,
        D,
        0.012,
        0.005,
        0.005,
      );
      const shelfYs = [];
      for (let i = 0; i < tiers; i++) {
        const ratio = tiers === 1 ? 1 : i / (tiers - 1);
        const py = bottomY + ratio * (topY - bottomY);
        shelfYs.push(py);
        addPart(group, plankGeo, matPrimary, 0, py, 0);
      }

      const overhangX = Math.min(0.11, W * 0.085);
      const insetZ = Math.min(0.02, D * 0.08);
      const spanX = Math.max(0.1, W - overhangX * 2);
      const spanZ = Math.max(0.06, D - insetZ * 2);
      const rodRadius = 0.011;
      const rodH = Math.max(0.1, H - footH);

      const rodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodH, 14);
      const footGeo = new THREE.CylinderGeometry(
        rodRadius * 1.25,
        rodRadius * 1.35,
        footH,
        14,
      );
      const collarGeo = new THREE.CylinderGeometry(
        rodRadius * 1.55,
        rodRadius * 1.55,
        0.012,
        14,
      );
      const braceGeo = new THREE.CylinderGeometry(0.0075, 0.0075, spanZ, 10);
      braceGeo.rotateX(Math.PI / 2);

      for (let p = 0; p < legPairs; p++) {
        const tRatio = legPairs === 1 ? 0.5 : p / (legPairs - 1);
        const lx = -spanX / 2 + tRatio * spanX;

        addPart(
          group,
          footGeo,
          sharedDarkTrimMat,
          lx,
          footH / 2,
          -spanZ / 2,
          false,
        );
        addPart(
          group,
          footGeo,
          sharedDarkTrimMat,
          lx,
          footH / 2,
          spanZ / 2,
          false,
        );
        addPart(group, rodGeo, matSecondary, lx, footH + rodH / 2, -spanZ / 2);
        addPart(group, rodGeo, matSecondary, lx, footH + rodH / 2, spanZ / 2);

        shelfYs.forEach((py) => {
          const underY = py - plankT / 2 - 0.006;
          addPart(group, braceGeo, matSecondary, lx, underY, 0, false);
          addPart(
            group,
            collarGeo,
            matSecondary,
            lx,
            underY,
            -spanZ / 2,
            false,
          );
          addPart(group, collarGeo, matSecondary, lx, underY, spanZ / 2, false);
        });
      }

      if (legPairs >= 2) {
        const tieGeo = new THREE.CylinderGeometry(0.0065, 0.0065, spanX, 10);
        tieGeo.rotateZ(Math.PI / 2);
        const tieTargets =
          shelfYs.length > 1
            ? [shelfYs[0], shelfYs[shelfYs.length - 1]]
            : [shelfYs[0]];
        tieTargets.forEach((py) => {
          const tieY = py - plankT / 2 - 0.007;
          addPart(group, tieGeo, matSecondary, 0, tieY, -spanZ * 0.28, false);
          addPart(group, tieGeo, matSecondary, 0, tieY, spanZ * 0.28, false);
        });
      }
      return;
    }

    // --- CUBE / MODULAR SHELF ---
    const cols = Math.max(1, Math.min(5, item.shelfCols || 4));
    const rows = Math.max(1, Math.min(5, item.shelfRows || 2));

    const plinthH = Math.min(0.045, H * 0.07);
    const plinthInset = 0.018;
    addPart(
      group,
      createRoundedBoxGeometry(
        Math.max(0.1, W - plinthInset * 2),
        plinthH,
        Math.max(0.08, D - plinthInset * 2),
        0.005,
        0.002,
        0.002,
      ),
      matPrimary,
      0,
      plinthH / 2,
      0,
    );

    const frameH = Math.max(0.15, H - plinthH);
    const frameCenterY = plinthH + frameH / 2;
    const outerT = Math.min(0.038, W * 0.08, frameH * 0.08);
    const innerT = Math.min(0.018, outerT * 0.55);

    const innerW = Math.max(0.05, W - outerT * 2);
    const innerH = Math.max(0.05, frameH - outerT * 2);
    const innerD = Math.max(0.04, D - 0.02);

    const sideGeo = createRoundedBoxGeometry(
      outerT,
      frameH,
      D,
      0.008,
      0.004,
      0.004,
    );
    addPart(group, sideGeo, matPrimary, -W / 2 + outerT / 2, frameCenterY, 0);
    addPart(group, sideGeo, matPrimary, W / 2 - outerT / 2, frameCenterY, 0);

    const capGeo = createRoundedBoxGeometry(
      innerW,
      outerT,
      D,
      0.006,
      0.003,
      0.003,
    );
    addPart(group, capGeo, matPrimary, 0, H - outerT / 2, 0);
    addPart(group, capGeo, matPrimary, 0, plinthH + outerT / 2, 0);

    if (cols > 1) {
      const cellW = (innerW - innerT * (cols - 1)) / cols;
      const vDivGeo = createRoundedBoxGeometry(
        innerT,
        innerH,
        innerD,
        0.003,
        0.0015,
        0.0015,
      );
      for (let c = 1; c < cols; c++) {
        const vx = -innerW / 2 + c * cellW + (c - 0.5) * innerT;
        addPart(group, vDivGeo, matSecondary, vx, frameCenterY, 0);
      }
    }

    if (rows > 1) {
      const cellH = (innerH - innerT * (rows - 1)) / rows;
      const hDivGeo = createRoundedBoxGeometry(
        innerW,
        innerT,
        innerD,
        0.003,
        0.0015,
        0.0015,
      );
      for (let r = 1; r < rows; r++) {
        const hy = plinthH + outerT + r * cellH + (r - 0.5) * innerT;
        addPart(group, hDivGeo, matSecondary, 0, hy, 0);
      }
    }
  },
};
