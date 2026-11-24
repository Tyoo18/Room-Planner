import * as THREE from "three";
import { addPart } from "./helpers";

export const chairModule = {
  type: "chair",
  zone: "work",

  getCatalogConfig(t) {
    return {
      type: "chair",
      title: t.catChair,
      variants: [
        { label: t.chairStandard, patch: { chairStyle: "standard" } },
        { label: t.chairOffice, patch: { chairStyle: "office" } },
        { label: t.chairStool, patch: { chairStyle: "stool" } },
      ],
    };
  },

  getItemLabel(item, t) {
    if (item.chairStyle === "office") return t.chairOffice;
    if (item.chairStyle === "stool") return t.chairStool;
    return `${t.catChair} ${t.chairStandard}`;
  },

  getColorLabels(_item, t) {
    return {
      color1: t.colorSeat,
      color2: t.colorChairLegs,
    };
  },

  createDefault(id, variant = {}) {
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
  },

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D, H }) {
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
  },
};
