import * as THREE from "three";
import { addPart } from "./helpers";

export const dividerModule = {
  type: "divider",
  zone: "floorDecor",

  getCatalogConfig(t) {
    return {
      type: "divider",
      title: t.catDivider || "Partisi",
      variants: [
        {
          label: t.dividerSolid || "Panel Polos",
          patch: { dividerStyle: "solid" },
        },
        {
          label: t.dividerSlat || "Kisi-Kisi",
          patch: { dividerStyle: "slat" },
        },
      ],
    };
  },

  getItemLabel(item, t) {
    const sub =
      item.dividerStyle === "slat"
        ? t.dividerSlat || "Kisi-Kisi"
        : t.dividerSolid || "Panel Polos";
    return `${t.catDivider || "Partisi"} (${sub})`;
  },

  getColorLabels(item, t) {
    return {
      color1: t.colorDividerPanel || "Warna Panel / Bilah",
      color2: t.colorDividerFrame || "Warna Rangka & Kaki",
    };
  },

  createDefault(id, variant = {}) {
    return {
      id,
      type: "divider",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width: 120,
      depth: 8,
      height: 180,
      dividerStyle: variant.dividerStyle || "solid",
      hasFeet: true,
      color1: "#D6C7B2",
      color2: "#27272A",
    };
  },

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D }) {
    const H = (item.height || 180) / 100;
    const hasFeet = item.hasFeet !== false;
    const footH = hasFeet ? 0.025 : 0;

    // Sepatu / kaki penyangga melintang di bawah agar stabil secara visual
    if (hasFeet && W >= 0.35) {
      const footDepth = Math.max(D + 0.16, 0.24);
      const footWidth = 0.045;
      const offsetX = Math.max(0.1, W / 2 - 0.14);

      addPart(
        group,
        new THREE.BoxGeometry(footWidth, footH, footDepth),
        matSecondary,
        -offsetX,
        footH / 2,
        0,
      );
      addPart(
        group,
        new THREE.BoxGeometry(footWidth, footH, footDepth),
        matSecondary,
        offsetX,
        footH / 2,
        0,
      );
    }

    const bodyH = Math.max(0.2, H - footH);
    const bodyCenterY = footH + bodyH / 2;
    const frameT = Math.min(0.035, W * 0.08, bodyH * 0.08);
    const innerW = Math.max(0.05, W - frameT * 2);
    const innerH = Math.max(0.05, bodyH - frameT * 2);

    // Rangka luar 4 sisi (Kiri, Kanan, Atas, Bawah)
    addPart(
      group,
      new THREE.BoxGeometry(frameT, bodyH, D),
      matSecondary,
      -W / 2 + frameT / 2,
      bodyCenterY,
      0,
    );
    addPart(
      group,
      new THREE.BoxGeometry(frameT, bodyH, D),
      matSecondary,
      W / 2 - frameT / 2,
      bodyCenterY,
      0,
    );
    addPart(
      group,
      new THREE.BoxGeometry(innerW, frameT, D),
      matSecondary,
      0,
      footH + bodyH - frameT / 2,
      0,
    );
    addPart(
      group,
      new THREE.BoxGeometry(innerW, frameT, D),
      matSecondary,
      0,
      footH + frameT / 2,
      0,
    );

    if (item.dividerStyle === "slat") {
      // Bilah kisi-kisi vertikal
      const slatW = Math.min(0.035, innerW * 0.12);
      const gapTarget = 0.055;
      const count = Math.max(2, Math.floor(innerW / (slatW + gapTarget)));
      const step = innerW / count;
      const slatDepth = Math.max(0.012, D * 0.72);

      for (let i = 0; i < count; i++) {
        const sx = -innerW / 2 + step * (i + 0.5);
        addPart(
          group,
          new THREE.BoxGeometry(slatW, innerH, slatDepth),
          matPrimary,
          sx,
          bodyCenterY,
          0,
        );
      }
    } else {
      // Panel polos penuh
      const panelDepth = Math.max(0.012, D * 0.65);
      addPart(
        group,
        new THREE.BoxGeometry(innerW, innerH, panelDepth),
        matPrimary,
        0,
        bodyCenterY,
        0,
      );
    }
  },
};
