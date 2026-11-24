import * as THREE from "three";
import { addPart } from "./helpers";

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

export const deskModule = {
  type: "desk",
  zone: "work",

  getCatalogConfig(t) {
    return {
      type: "desk",
      title: t.catDesk,
      variants: [
        { label: t.deskRect, patch: { deskShape: "rect" } },
        { label: t.deskL, patch: { deskShape: "l-shape" } },
        { label: t.deskRound, patch: { deskShape: "round" } },
      ],
    };
  },

  getItemLabel(item, t) {
    const shapeName =
      item.deskShape === "l-shape"
        ? t.deskL
        : item.deskShape === "round"
          ? t.deskRound
          : t.deskRect;
    return `${t.catDesk} ${shapeName}`;
  },

  getColorLabels(_item, t) {
    return {
      color1: t.colorTableTop,
      color2: t.colorTableLegs,
    };
  },

  getLocalBoxes(item) {
    if (item.deskShape !== "l-shape") return null;
    const { w, d, mainDepthM, sideWidthM } = getLDeskDimensionsM(item);
    const wingDepth = Math.max(0.05, d - mainDepthM);
    const wingCenterX =
      item.lCorner === "right"
        ? w / 2 - sideWidthM / 2
        : -w / 2 + sideWidthM / 2;

    return [
      { cx: 0, cz: -d / 2 + mainDepthM / 2, w, d: mainDepthM },
      { cx: wingCenterX, cz: mainDepthM / 2, w: sideWidthM, d: wingDepth },
    ];
  },

  createDefault(id, variant = {}) {
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
  },

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D, H }) {
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
      const boxes = this.getLocalBoxes(item);
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
  },
};
