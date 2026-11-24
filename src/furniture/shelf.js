import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

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
      const plankT = 0.026;
      const bottomY = Math.min(0.09, H * 0.16);
      const topY = H - plankT / 2;

      const plankGeo = createRoundedBoxGeometry(
        W,
        plankT,
        D,
        0.01,
        0.004,
        0.004,
      );
      const shelfYs = [];
      for (let i = 0; i < tiers; i++) {
        const ratio = tiers === 1 ? 1 : i / (tiers - 1);
        const py = bottomY + ratio * (topY - bottomY);
        shelfYs.push(py);
        addPart(
          group,
          i === 0 ? plankGeo : plankGeo.clone(),
          matPrimary,
          0,
          py,
          0,
        );
      }

      const overhangX = Math.min(0.11, W * 0.085);
      const insetZ = Math.min(0.018, D * 0.08);
      const spanX = Math.max(0.1, W - overhangX * 2);
      const spanZ = Math.max(0.06, D - insetZ * 2);
      const rodRadius = 0.0105;
      const rodH = Math.max(0.1, H - 0.003);

      const rodGeo = new THREE.CylinderGeometry(rodRadius, rodRadius, rodH, 12);
      const braceGeo = new THREE.CylinderGeometry(0.007, 0.007, spanZ, 10);
      braceGeo.rotateX(Math.PI / 2);

      for (let p = 0; p < legPairs; p++) {
        const tRatio = legPairs === 1 ? 0.5 : p / (legPairs - 1);
        const lx = -spanX / 2 + tRatio * spanX;

        addPart(group, rodGeo.clone(), matSecondary, lx, rodH / 2, -spanZ / 2);
        addPart(group, rodGeo.clone(), matSecondary, lx, rodH / 2, spanZ / 2);

        shelfYs.forEach((py) => {
          addPart(
            group,
            braceGeo.clone(),
            matSecondary,
            lx,
            py - plankT / 2 - 0.006,
            0,
            false,
          );
        });
      }
    } else {
      const cols = Math.max(1, Math.min(5, item.shelfCols || 4));
      const rows = Math.max(1, Math.min(5, item.shelfRows || 2));
      const outerT = Math.min(0.036, W * 0.08, H * 0.08);
      const innerT = Math.min(0.018, outerT * 0.58);

      const innerW = Math.max(0.05, W - outerT * 2);
      const innerH = Math.max(0.05, H - outerT * 2);
      const innerD = Math.max(0.05, D - 0.004);

      const sideGeo = createRoundedBoxGeometry(
        outerT,
        H,
        D,
        0.008,
        0.003,
        0.003,
      );
      addPart(group, sideGeo, matPrimary, -W / 2 + outerT / 2, H / 2, 0);
      addPart(group, sideGeo.clone(), matPrimary, W / 2 - outerT / 2, H / 2, 0);

      const capGeo = createRoundedBoxGeometry(
        innerW,
        outerT,
        D,
        0.006,
        0.003,
        0.003,
      );
      addPart(group, capGeo, matPrimary, 0, H - outerT / 2, 0);
      addPart(group, capGeo.clone(), matPrimary, 0, outerT / 2, 0);

      if (cols > 1) {
        const cellW = (innerW - innerT * (cols - 1)) / cols;
        const vDivGeo = new THREE.BoxGeometry(innerT, innerH, innerD);
        for (let c = 1; c < cols; c++) {
          const vx = -innerW / 2 + c * cellW + (c - 0.5) * innerT;
          addPart(group, vDivGeo.clone(), matSecondary, vx, H / 2, 0);
        }
      }

      if (rows > 1) {
        const cellH = (innerH - innerT * (rows - 1)) / rows;
        const hDivGeo = new THREE.BoxGeometry(innerW, innerT, innerD);
        for (let r = 1; r < rows; r++) {
          const hy = outerT + r * cellH + (r - 0.5) * innerT;
          addPart(group, hDivGeo.clone(), matSecondary, 0, hy, 0);
        }
      }
    }
  },
};
