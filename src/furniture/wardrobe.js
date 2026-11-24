import * as THREE from "three";
import { addPart } from "./helpers";

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
    const bodyD = Math.max(0.15, D - 0.02);
    addPart(
      group,
      new THREE.BoxGeometry(W, H, bodyD),
      matPrimary,
      0,
      H / 2,
      -0.01,
    );

    const isGrid = item.wardrobeLayout === "grid";
    const cols = isGrid
      ? Math.max(1, Math.min(4, item.wardrobeCols || 2))
      : Math.max(1, Math.min(4, item.doorCount || 2));
    const rows = isGrid ? Math.max(2, Math.min(5, item.wardrobeRows || 3)) : 1;

    const doorGap = 0.008;
    const totalLeafW = (W - doorGap * (cols + 1)) / cols;
    const totalLeafH = (H - doorGap * (rows + 1)) / rows;
    const leafThick = 0.02;

    const handleMat = new THREE.MeshStandardMaterial({
      color: "#27272a",
      metalness: 0.6,
      roughness: 0.35,
    });

    for (let r = 0; r < rows; r++) {
      const cy = doorGap + totalLeafH / 2 + r * (totalLeafH + doorGap);
      for (let c = 0; c < cols; c++) {
        const cx =
          -W / 2 + doorGap + totalLeafW / 2 + c * (totalLeafW + doorGap);
        const zOffset =
          item.wardrobeDoorType === "sliding" && c % 2 === 1
            ? D / 2 - 0.004
            : D / 2 - leafThick / 2;

        addPart(
          group,
          new THREE.BoxGeometry(totalLeafW, totalLeafH, leafThick),
          matSecondary,
          cx,
          cy,
          zOffset,
        );

        const handleH = Math.min(0.13, totalLeafH * 0.36);
        const handleX =
          cols === 1
            ? cx + totalLeafW * 0.34
            : c % 2 === 0
              ? cx + totalLeafW * 0.34
              : cx - totalLeafW * 0.34;
        const handleY = isGrid ? cy : Math.min(1.05, H * 0.52);

        addPart(
          group,
          new THREE.BoxGeometry(0.012, handleH, 0.018),
          handleMat,
          handleX,
          handleY,
          zOffset + leafThick / 2 + 0.008,
          false,
        );
      }
    }

    if (item.wardrobeDoorType !== "sliding") {
      const swingDepth = Math.min(0.65, totalLeafW);
      for (let c = 0; c < cols; c++) {
        const cx =
          -W / 2 + doorGap + totalLeafW / 2 + c * (totalLeafW + doorGap);
        const zoneGeo = new THREE.EdgesGeometry(
          new THREE.PlaneGeometry(totalLeafW, swingDepth),
        );
        const zoneLine = new THREE.LineSegments(
          zoneGeo,
          new THREE.LineBasicMaterial({
            color: "#f59e0b",
            transparent: true,
            opacity: 0.75,
          }),
        );
        zoneLine.rotation.x = -Math.PI / 2;
        zoneLine.position.set(cx, 0.004, D / 2 + swingDepth / 2);
        group.add(zoneLine);
      }
    }
  },
};
