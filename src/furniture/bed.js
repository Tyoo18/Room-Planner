import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

export const bedModule = {
  type: "bed",
  zone: "sleep",

  getCatalogConfig(t) {
    return {
      type: "bed",
      title: t.catBed,
      variants: [
        { label: t.bedFrame, patch: { bedStyle: "frame" } },
        { label: t.bedFloor, patch: { bedStyle: "floor" } },
      ],
    };
  },

  getItemLabel(item, t) {
    return `${t.catBed} (${item.bedStyle === "floor" ? t.bedFloor : t.bedFrame})`;
  },

  getColorLabels(item, t) {
    return {
      color1: t.colorMattress,
      color2: item.bedStyle === "floor" ? null : t.colorBedFrame,
    };
  },

  createDefault(id, variant = {}) {
    const bedStyle = variant.bedStyle || "frame";
    return {
      id,
      type: "bed",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width: 160,
      depth: 200,
      height: bedStyle === "floor" ? 24 : 50,
      bedStyle,
      color1: "#F1F5F9",
      color2: "#78553A",
    };
  },

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D, H }) {
    const isFloor = item.bedStyle === "floor";
    const baseH = isFloor ? 0 : Math.min(0.22, H * 0.45);
    const mattressH = Math.max(0.1, H - baseH);

    if (!isFloor) {
      addPart(
        group,
        createRoundedBoxGeometry(W, baseH, D, 0.025, 0.008, 0.008),
        matSecondary,
        0,
        baseH / 2,
        0,
      );
      const hbH = Math.max(0.85, H + 0.42);
      const hbThick = 0.06;
      addPart(
        group,
        createRoundedBoxGeometry(W, hbH, hbThick, 0.025, 0.008, 0.008),
        matSecondary,
        0,
        hbH / 2,
        -D / 2 + hbThick / 2,
      );
    }

    const matW = isFloor ? W : Math.max(0.2, W - 0.04);
    const matD = isFloor ? D : Math.max(0.2, D - 0.08);
    const matZ = isFloor ? 0 : 0.02;
    const mattressGeo = createRoundedBoxGeometry(
      matW,
      mattressH,
      matD,
      0.065,
      0.022,
      0.022,
    );
    addPart(group, mattressGeo, matPrimary, 0, baseH + mattressH / 2, matZ);

    const pillowMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.88,
    });
    const pillowCount = W >= 1.1 ? 2 : 1;
    const pillowW = Math.min(0.56, (matW - 0.16) / pillowCount);
    const pillowD = Math.min(0.36, matD * 0.22);
    const pillowH = 0.08;
    const pillowY = baseH + mattressH + pillowH / 2 - 0.008;
    const pillowZ = -matD / 2 + pillowD / 2 + 0.09 + matZ;
    const pillowGeo = createRoundedBoxGeometry(
      pillowW,
      pillowH,
      pillowD,
      0.055,
      0.024,
      0.024,
    );

    if (pillowCount === 1) {
      addPart(group, pillowGeo, pillowMat, 0, pillowY, pillowZ);
    } else {
      const gap = pillowW * 0.58;
      addPart(group, pillowGeo, pillowMat, -gap, pillowY, pillowZ);
      addPart(group, pillowGeo.clone(), pillowMat, gap, pillowY, pillowZ);
    }
  },
};
