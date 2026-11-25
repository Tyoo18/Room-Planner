import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

const sharedCapMat = new THREE.MeshStandardMaterial({
  color: "#18181B",
  roughness: 0.5,
  metalness: 0.3,
});

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
      ],
    };
  },

  getItemLabel(item, t) {
    if (item.shelfStyle === "console") {
      return `${t.shelfConsole} (${item.shelfTiers || 2}T)`;
    }
    return `${t.shelfCube} ${item.shelfCols || 4}×${item.shelfRows || 2}`;
  },

  getColorLabels(item, t) {
    const isConsole = item.shelfStyle === "console";
    return {
      color1: isConsole ? t.colorShelfBoard : t.colorShelfFrame,
      color2: isConsole ? t.colorShelfLegs : t.colorShelfInner,
    };
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

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D, H }) {
    const style = item.shelfStyle || "cube";

    if (style === "console") {
      const tiers = Math.max(2, Math.min(3, item.shelfTiers || 2));
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

        // Sepatu kaki + Tiang vertikal depan & belakang
        addPart(group, footGeo, sharedCapMat, lx, footH / 2, -spanZ / 2, false);
        addPart(group, footGeo, sharedCapMat, lx, footH / 2, spanZ / 2, false);
        addPart(group, rodGeo, matSecondary, lx, footH + rodH / 2, -spanZ / 2);
        addPart(group, rodGeo, matSecondary, lx, footH + rodH / 2, spanZ / 2);

        // Palang melintang + kerah penyangga di bawah tiap ambalan
        shelfYs.forEach((py) => {
          const underY = py - plankT / 2 - 0.006;
          addPart(group, braceGeo, matSecondary, lx, underY, 0, false);
          addPart(group, collarGeo, matSecondary, lx, underY, -spanZ / 2, false);
          addPart(group, collarGeo, matSecondary, lx, underY, spanZ / 2, false);
        });
      }

      // Palang pengikat memanjang (longitudinal tie-bars) di bawah papan atas & bawah
      if (legPairs >= 2) {
        const tieGeo = new THREE.CylinderGeometry(0.0065, 0.0065, spanX, 10);
        tieGeo.rotateZ(Math.PI / 2);
        const tieTargets =
          shelfYs.length > 1 ? [shelfYs[0], shelfYs[shelfYs.length - 1]] : [shelfYs[0]];
        tieTargets.forEach((py) => {
          const tieY = py - plankT / 2 - 0.007;
          addPart(group, tieGeo, matSecondary, 0, tieY, -spanZ * 0.28, false);
          addPart(group, tieGeo, matSecondary, 0, tieY, spanZ * 0.28, false);
        });
      }
    } else {
      // --- CUBE / MODULAR SHELF ---
      const cols = Math.max(1, Math.min(5, item.shelfCols || 4));
      const rows = Math.max(1, Math.min(5, item.shelfRows || 2));

      // Plinth bawah recessed agar unit tidak terlihat menempel rata ke lantai
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
      // Sekat dalam dimundurkan 10mm dari tepi depan & belakang agar tercipta step bayangan
      const innerD = Math.max(0.04, D - 0.02);

      // Dinding Kiri & Kanan
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

      // Papan Atas & Bawah Bingkai Luar
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

      // Sekat Vertikal Dalam (Recessed)
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

      // Sekat Horizontal Dalam (Recessed)
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
    }
  },
};