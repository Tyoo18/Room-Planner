import * as THREE from "three";
import { addPart } from "./helpers";

// Menggabungkan banyak potongan motif menjadi 1 BufferGeometry (1 draw call, bebas lag)
function mergeFlatGeometries(entries) {
  const valid = [];
  let totalVerts = 0;

  for (const {
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
  } of entries) {
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

function buildRectPatternParts(W, D, patH, patY, pattern, hasBorder) {
  const parts = [];
  const borderW = hasBorder ? Math.min(0.055, W * 0.06, D * 0.06) : 0;

  // Bingkai tepi luar (jika carpetBorder aktif)
  if (hasBorder) {
    parts.push(
      {
        geo: new THREE.BoxGeometry(W, patH, borderW),
        x: 0,
        y: patY,
        z: -D / 2 + borderW / 2,
      },
      {
        geo: new THREE.BoxGeometry(W, patH, borderW),
        x: 0,
        y: patY,
        z: D / 2 - borderW / 2,
      },
      {
        geo: new THREE.BoxGeometry(
          borderW,
          patH,
          Math.max(0.02, D - borderW * 2),
        ),
        x: -W / 2 + borderW / 2,
        y: patY,
        z: 0,
      },
      {
        geo: new THREE.BoxGeometry(
          borderW,
          patH,
          Math.max(0.02, D - borderW * 2),
        ),
        x: W / 2 - borderW / 2,
        y: patY,
        z: 0,
      },
    );
  }

  const pad = hasBorder ? borderW * 1.45 : Math.min(0.04, W * 0.04, D * 0.04);
  const innerW = Math.max(0.08, W - pad * 2);
  const innerD = Math.max(0.08, D - pad * 2);

  if (pattern === "grid") {
    const lineT = 0.015;
    const cols = Math.max(2, Math.round(innerW / 0.28));
    const rows = Math.max(2, Math.round(innerD / 0.28));

    for (let c = 0; c <= cols; c++) {
      const lx = -innerW / 2 + (innerW / cols) * c;
      parts.push({
        geo: new THREE.BoxGeometry(lineT, patH, innerD + lineT),
        x: lx,
        y: patY,
        z: 0,
      });
    }
    for (let r = 0; r <= rows; r++) {
      const lz = -innerD / 2 + (innerD / rows) * r;
      parts.push({
        geo: new THREE.BoxGeometry(innerW + lineT, patH, lineT),
        x: 0,
        y: patY,
        z: lz,
      });
    }
  } else if (pattern === "checker") {
    const cols = Math.max(3, Math.round(innerW / 0.24));
    const rows = Math.max(3, Math.round(innerD / 0.24));
    const cellW = innerW / cols;
    const cellD = innerD / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) {
          const cx = -innerW / 2 + cellW * (c + 0.5);
          const cz = -innerD / 2 + cellD * (r + 0.5);
          parts.push({
            geo: new THREE.BoxGeometry(cellW, patH, cellD),
            x: cx,
            y: patY,
            z: cz,
          });
        }
      }
    }
  } else if (pattern === "stripes") {
    const alongX = W >= D;
    const stripeCount = 5;
    if (alongX) {
      const bandW = innerW / (stripeCount * 2 - 1);
      for (let i = 0; i < stripeCount; i++) {
        const sx = -innerW / 2 + bandW * (i * 2 + 0.5);
        parts.push({
          geo: new THREE.BoxGeometry(bandW, patH, innerD),
          x: sx,
          y: patY,
          z: 0,
        });
      }
    } else {
      const bandD = innerD / (stripeCount * 2 - 1);
      for (let i = 0; i < stripeCount; i++) {
        const sz = -innerD / 2 + bandD * (i * 2 + 0.5);
        parts.push({
          geo: new THREE.BoxGeometry(innerW, patH, bandD),
          x: 0,
          y: patY,
          z: sz,
        });
      }
    }
  } else if (pattern === "diamond") {
    const lineT = 0.014;
    const cols = Math.max(2, Math.round(innerW / 0.34));
    const rows = Math.max(2, Math.round(innerD / 0.34));
    const cellW = innerW / cols;
    const cellD = innerD / rows;
    const segLen = Math.hypot(cellW / 2, cellD / 2) + lineT * 0.4;
    const angle = Math.atan2(cellD / 2, cellW / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = -innerW / 2 + cellW * (c + 0.5);
        const cz = -innerD / 2 + cellD * (r + 0.5);
        const qx = cellW * 0.25;
        const qz = cellD * 0.25;

        parts.push(
          {
            geo: new THREE.BoxGeometry(segLen, patH, lineT),
            x: cx - qx,
            y: patY,
            z: cz - qz,
            ry: angle,
          },
          {
            geo: new THREE.BoxGeometry(segLen, patH, lineT),
            x: cx + qx,
            y: patY,
            z: cz - qz,
            ry: -angle,
          },
          {
            geo: new THREE.BoxGeometry(segLen, patH, lineT),
            x: cx + qx,
            y: patY,
            z: cz + qz,
            ry: angle,
          },
          {
            geo: new THREE.BoxGeometry(segLen, patH, lineT),
            x: cx - qx,
            y: patY,
            z: cz + qz,
            ry: -angle,
          },
        );
      }
    }
  }

  return parts;
}

function buildRoundPatternParts(W, D, topY, pattern, hasBorder) {
  const parts = [];
  const flatRx = -Math.PI / 2;

  if (hasBorder) {
    const outerRing = new THREE.RingGeometry(0.455, 0.5, 48);
    parts.push({
      geo: outerRing,
      x: 0,
      y: topY,
      z: 0,
      rx: flatRx,
      sx: W,
      sy: D,
      sz: 1,
    });
  }

  if (pattern === "stripes") {
    [
      [0.34, 0.38],
      [0.21, 0.25],
      [0.08, 0.12],
    ].forEach(([rIn, rOut]) => {
      parts.push({
        geo: new THREE.RingGeometry(rIn, rOut, 48),
        x: 0,
        y: topY,
        z: 0,
        rx: flatRx,
        sx: W,
        sy: D,
        sz: 1,
      });
    });
  } else if (pattern === "checker") {
    const segs = 12;
    const step = (Math.PI * 2) / segs;
    const rings = [
      [0.31, 0.42, 0],
      [0.19, 0.31, 1],
      [0.07, 0.19, 0],
    ];
    rings.forEach(([rIn, rOut, offset]) => {
      for (let i = 0; i < segs; i++) {
        if ((i + offset) % 2 === 0) {
          parts.push({
            geo: new THREE.RingGeometry(rIn, rOut, 4, 1, i * step, step),
            x: 0,
            y: topY,
            z: 0,
            rx: flatRx,
            sx: W,
            sy: D,
            sz: 1,
          });
        }
      }
    });
  } else if (pattern === "grid") {
    parts.push({
      geo: new THREE.RingGeometry(0.39, 0.415, 48),
      x: 0,
      y: topY,
      z: 0,
      rx: flatRx,
      sx: W,
      sy: D,
      sz: 1,
    });
    const spokeCount = 4;
    for (let i = 0; i < spokeCount; i++) {
      const ang = (i / spokeCount) * Math.PI;
      parts.push({
        geo: new THREE.PlaneGeometry(0.8, 0.015),
        x: 0,
        y: topY,
        z: 0,
        rx: flatRx,
        rz: ang,
        sx: W,
        sy: D,
        sz: 1,
      });
    }
  } else if (pattern === "diamond") {
    [0, Math.PI / 4].forEach((rot) => {
      parts.push({
        geo: new THREE.RingGeometry(0.34, 0.375, 4),
        x: 0,
        y: topY,
        z: 0,
        rx: flatRx,
        rz: rot,
        sx: W,
        sy: D,
        sz: 1,
      });
    });
  }

  return parts;
}

export const carpetModule = {
  type: "carpet",
  zone: "floorDecor",
  ignoreCollision: true,

  getCatalogConfig(t) {
    return {
      type: "carpet",
      title: t.catCarpet,
      variants: [
        {
          label: t.carpetRect,
          patch: { carpetShape: "rect", carpetPattern: "grid" },
        },
        {
          label: t.carpetRound,
          patch: { carpetShape: "round", carpetPattern: "stripes" },
        },
      ],
    };
  },

  getItemLabel(item, t) {
    return `${t.catCarpet} (${item.carpetShape === "round" ? t.carpetRound : t.carpetRect})`;
  },

  getColorLabels(item, t) {
    const hasMotif =
      item.carpetBorder ||
      (item.carpetPattern && item.carpetPattern !== "plain");
    return {
      color1: t.colorCarpetBase,
      color2: hasMotif ? t.colorCarpetBorder : null,
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
      carpetPattern:
        variant.carpetPattern || (carpetShape === "round" ? "stripes" : "grid"),
      color1: "#E2D9C8",
      color2: "#948979",
    };
  },

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D }) {
    // Tetap di bawah garis ayunan pintu (0.005) & selection outline (0.006)
    const baseH = 0.0022;
    const patH = 0.0008;
    const hasBorder = Boolean(item.carpetBorder);
    const pattern = item.carpetPattern || (hasBorder ? "border" : "plain");
    const patMat = matSecondary || matPrimary;

    if (item.carpetShape === "round") {
      const baseGeo = new THREE.CylinderGeometry(0.5, 0.5, baseH, 48);
      baseGeo.scale(W, 1, D);
      addPart(group, baseGeo, matPrimary, 0, baseH / 2, 0, false);

      const parts = buildRoundPatternParts(
        W,
        D,
        baseH + 0.0003,
        pattern,
        hasBorder,
      );
      if (parts.length > 0) {
        addPart(group, mergeFlatGeometries(parts), patMat, 0, 0, 0, false);
      }
      return;
    }

    // Karpet Persegi Panjang
    addPart(
      group,
      new THREE.BoxGeometry(W, baseH, D),
      matPrimary,
      0,
      baseH / 2,
      0,
      false,
    );

    const parts = buildRectPatternParts(
      W,
      D,
      patH,
      baseH + patH / 2,
      pattern,
      hasBorder,
    );
    if (parts.length > 0) {
      addPart(group, mergeFlatGeometries(parts), patMat, 0, 0, 0, false);
    }
  },
};
