import * as THREE from "three";
import { addPart } from "./helpers";

export const carpetModule = {
  type: "carpet",
  zone: "floorDecor",
  ignoreCollision: true, // Boleh overlap dengan furnitur lain

  getCatalogConfig(t) {
    return {
      type: "carpet",
      title: t.catCarpet,
      variants: [
        { label: t.carpetRect, patch: { carpetShape: "rect" } },
        { label: t.carpetRound, patch: { carpetShape: "round" } },
      ],
    };
  },

  getItemLabel(item, t) {
    return `${t.catCarpet} (${item.carpetShape === "round" ? t.carpetRound : t.carpetRect})`;
  },

  getColorLabels(item, t) {
    return {
      color1: t.colorCarpetBase,
      color2: item.carpetBorder ? t.colorCarpetBorder : null,
    };
  },

  createDefault(id, variant = {}) {
    const carpetShape = variant.carpetShape || "rect";
    return {
      id,
      type: "carpet",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width: carpetShape === "round" ? 160 : 200,
      depth: carpetShape === "round" ? 160 : 140,
      height: 1,
      carpetShape,
      carpetBorder: true,
      color1: "#E2D9C8",
      color2: "#948979",
    };
  },

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D }) {
    const thick = 0.0025; // Di bawah garis ayunan pintu (0.005) & outline (0.006)
    const hasBorder = Boolean(item.carpetBorder);
    const borderSize = Math.min(0.1, W * 0.08, D * 0.08);

    if (item.carpetShape === "round") {
      if (hasBorder) {
        const outerGeo = new THREE.CylinderGeometry(0.5, 0.5, thick * 0.7, 48);
        outerGeo.scale(W, 1, D);
        addPart(group, outerGeo, matSecondary, 0, thick * 0.35, 0, false);

        const innerGeo = new THREE.CylinderGeometry(0.5, 0.5, thick, 48);
        innerGeo.scale(
          Math.max(0.1, W - borderSize * 2),
          1,
          Math.max(0.1, D - borderSize * 2),
        );
        addPart(group, innerGeo, matPrimary, 0, thick * 0.5, 0, false);
      } else {
        const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, thick, 48);
        cylGeo.scale(W, 1, D);
        addPart(group, cylGeo, matPrimary, 0, thick * 0.5, 0, false);
      }
    } else if (hasBorder) {
      addPart(
        group,
        new THREE.BoxGeometry(W, thick * 0.7, D),
        matSecondary,
        0,
        thick * 0.35,
        0,
        false,
      );
      addPart(
        group,
        new THREE.BoxGeometry(
          Math.max(0.1, W - borderSize * 2),
          thick,
          Math.max(0.1, D - borderSize * 2),
        ),
        matPrimary,
        0,
        thick * 0.5,
        0,
        false,
      );
    } else {
      addPart(
        group,
        new THREE.BoxGeometry(W, thick, D),
        matPrimary,
        0,
        thick * 0.5,
        0,
        false,
      );
    }
  },
};
