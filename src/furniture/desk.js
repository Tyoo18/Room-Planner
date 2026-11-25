import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

const sharedDetailMat = new THREE.MeshStandardMaterial({
  color: "#18181B",
  roughness: 0.58,
  metalness: 0.25,
});

const sharedChromeMat = new THREE.MeshStandardMaterial({
  color: "#E4E4E7",
  roughness: 0.24,
  metalness: 0.82,
});

// Menggabungkan banyak geometri menjadi 1 BufferGeometry (1 draw call per material)
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

function createLTopGeometry(W, D, mainDepthM, sideWidthM, lCorner, topThick) {
  const bSize = 0.006;
  const bThick = Math.min(0.005, topThick * 0.2);
  const extrudeDepth = Math.max(0.008, topThick - bThick * 2);

  const shape = new THREE.Shape();
  if (lCorner === "right") {
    shape.moveTo(-W / 2 + bSize, D / 2 - bSize);
    shape.lineTo(-W / 2 + bSize, D / 2 - mainDepthM + bSize);
    shape.lineTo(W / 2 - sideWidthM + bSize, D / 2 - mainDepthM + bSize);
    shape.lineTo(W / 2 - sideWidthM + bSize, -D / 2 + bSize);
    shape.lineTo(W / 2 - bSize, -D / 2 + bSize);
    shape.lineTo(W / 2 - bSize, D / 2 - bSize);
  } else {
    shape.moveTo(-W / 2 + bSize, D / 2 - bSize);
    shape.lineTo(-W / 2 + bSize, -D / 2 + bSize);
    shape.lineTo(-W / 2 + sideWidthM - bSize, -D / 2 + bSize);
    shape.lineTo(-W / 2 + sideWidthM - bSize, D / 2 - mainDepthM + bSize);
    shape.lineTo(W / 2 - bSize, D / 2 - mainDepthM + bSize);
    shape.lineTo(W / 2 - bSize, D / 2 - bSize);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: bSize,
    bevelThickness: bThick,
  });

  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bThick, 0);
  geo.computeVertexNormals();
  return geo;
}

function addLegWithFoot(group, legGeo, footGeo, matLeg, x, z, legH, footH) {
  addPart(group, footGeo, sharedDetailMat, x, footH / 2, z, false);
  addPart(group, legGeo, matLeg, x, footH + legH / 2, z, true);
}

function buildStudioDesk(
  group,
  item,
  { matPrimary, matSecondary },
  { W, D, H },
) {
  const layout = item.pedestalLayout || "left"; // "left" | "right" | "both"
  const drawerCount = Math.max(3, Math.min(7, item.drawerCount || 5));
  const hasTopDrawers = item.hasTopDrawers !== false;
  const handleStyle = item.drawerHandleStyle || "cutout"; // "cutout" | "bar"

  const topThick = 0.03;
  const underTopY = Math.max(0.25, H - topThick);

  const secondaryParts = [];
  const darkParts = [];
  const chromeParts = [];

  // 1. Daun Meja Utama Ber-bevel + Tutup Jalur Kabel Belakang
  addPart(
    group,
    createRoundedBoxGeometry(W, topThick, D, 0.01, 0.004, 0.004),
    matPrimary,
    0,
    underTopY + topThick / 2,
    0,
    true,
  );

  if (D >= 0.5 && W >= 0.9) {
    const trayW = Math.min(0.55, W * 0.42);
    darkParts.push({
      geo: new THREE.BoxGeometry(trayW, 0.003, 0.045),
      x: 0,
      y: underTopY + topThick + 0.0005,
      z: -D / 2 + 0.065,
    });
  }

  // Hitung lebar kabinet laci agar ruang kaki tengah tetap proporsional
  const hasLeftPed = layout === "left" || layout === "both";
  const hasRightPed = layout === "right" || layout === "both";
  const maxPedW =
    layout === "both"
      ? Math.max(0.22, (W - 0.34) / 2)
      : Math.max(0.26, W - 0.42);
  const pedW = Math.min(0.4, maxPedW);
  const pedD = Math.max(0.25, D - 0.016);
  const casterH = 0.028;
  const bodyH = Math.max(0.2, underTopY - casterH);
  const bodyCenterY = casterH + bodyH / 2;

  const buildDrawerPull = (cx, cy, frontZ, faceW, faceH) => {
    if (handleStyle === "bar") {
      const barW = Math.min(0.14, faceW * 0.42);
      chromeParts.push(
        {
          geo: createRoundedBoxGeometry(
            barW,
            0.008,
            0.008,
            0.003,
            0.002,
            0.002,
          ),
          x: cx,
          y: cy,
          z: frontZ + 0.015,
        },
        {
          geo: new THREE.BoxGeometry(0.007, 0.007, 0.013),
          x: cx - barW * 0.36,
          y: cy,
          z: frontZ + 0.0065,
        },
        {
          geo: new THREE.BoxGeometry(0.007, 0.007, 0.013),
          x: cx + barW * 0.36,
          y: cy,
          z: frontZ + 0.0065,
        },
      );
    } else {
      // Coakan jari (Cutout pull) di bagian atas tengah laci ala IKEA Alex
      const slotW = Math.min(0.11, faceW * 0.34);
      const slotH = Math.min(0.018, faceH * 0.22);
      const slotY = cy + faceH / 2 - slotH / 2 - 0.004;
      darkParts.push({
        geo: createRoundedBoxGeometry(slotW, slotH, 0.005, 0.004, 0.001, 0.001),
        x: cx,
        y: slotY,
        z: frontZ + 0.001,
      });
    }
  };

  const buildPedestal = (centerX) => {
    const wallT = 0.018;
    const faceThick = 0.018;
    const carcassD = Math.max(0.2, pedD - faceThick);
    const carcassZ = -faceThick / 2;

    // 4 Roda Caster di bawah kabinet
    const wheelOffX = Math.max(0.04, pedW / 2 - 0.045);
    const wheelOffZ = Math.max(0.04, pedD / 2 - 0.055);
    [
      [-wheelOffX, -wheelOffZ],
      [wheelOffX, -wheelOffZ],
      [-wheelOffX, wheelOffZ],
      [wheelOffX, wheelOffZ],
    ].forEach(([wx, wz]) => {
      const wheelGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.016, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      darkParts.push(
        {
          geo: wheelGeo,
          x: centerX + wx,
          y: 0.013,
          z: wz,
        },
        {
          geo: new THREE.BoxGeometry(0.018, 0.006, 0.022),
          x: centerX + wx,
          y: casterH - 0.003,
          z: wz,
        },
      );
    });

    // Bodi Utama Kabinet (Carcass)
    secondaryParts.push({
      geo: createRoundedBoxGeometry(
        pedW,
        bodyH,
        carcassD,
        0.005,
        0.0025,
        0.0025,
      ),
      x: centerX,
      y: bodyCenterY,
      z: carcassZ,
    });

    // Susunan Muka Laci Vertikal dengan Celah Bayangan
    const innerH = Math.max(0.12, bodyH - wallT * 2);
    const drawerGap = 0.0045;
    const drawerW = Math.max(0.1, pedW - wallT * 1.4);
    const drawerH = (innerH - drawerGap * (drawerCount - 1)) / drawerCount;
    const frontZ = pedD / 2 - faceThick / 2;
    const frontSurfaceZ = pedD / 2;

    for (let i = 0; i < drawerCount; i++) {
      const dy = casterH + wallT + drawerH / 2 + i * (drawerH + drawerGap);
      secondaryParts.push({
        geo: createRoundedBoxGeometry(
          drawerW,
          drawerH,
          faceThick,
          0.003,
          0.002,
          0.002,
        ),
        x: centerX,
        y: dy,
        z: frontZ,
      });
      buildDrawerPull(centerX, dy, frontSurfaceZ, drawerW, drawerH);
    }
  };

  if (hasLeftPed) {
    buildPedestal(-W / 2 + pedW / 2 + 0.004);
  }
  if (hasRightPed) {
    buildPedestal(W / 2 - pedW / 2 - 0.004);
  }

  // 2. Rangka Kaki Besi Persegi Panjang di Sisi Terbuka (jika 1 kabinet)
  const legThick = 0.032;
  const footH = 0.01;
  const legInset = 0.024;
  const openSideX = hasLeftPed
    ? W / 2 - legInset - legThick / 2
    : -W / 2 + legInset + legThick / 2;
  const legFrontZ = pedD / 2 - legThick / 2;
  const legBackZ = -pedD / 2 + legThick / 2;
  const legSpanD = Math.max(0.12, legFrontZ - legBackZ);
  const legPostH = Math.max(0.12, underTopY - footH);

  if (layout !== "both") {
    // Sepatu kaki bawah
    darkParts.push(
      {
        geo: new THREE.BoxGeometry(legThick + 0.004, footH, legThick + 0.004),
        x: openSideX,
        y: footH / 2,
        z: legFrontZ,
      },
      {
        geo: new THREE.BoxGeometry(legThick + 0.004, footH, legThick + 0.004),
        x: openSideX,
        y: footH / 2,
        z: legBackZ,
      },
    );

    // Tiang vertikal depan & belakang
    secondaryParts.push(
      {
        geo: createRoundedBoxGeometry(
          legThick,
          legPostH,
          legThick,
          0.004,
          0.002,
          0.002,
        ),
        x: openSideX,
        y: footH + legPostH / 2,
        z: legFrontZ,
      },
      {
        geo: createRoundedBoxGeometry(
          legThick,
          legPostH,
          legThick,
          0.004,
          0.002,
          0.002,
        ),
        x: openSideX,
        y: footH + legPostH / 2,
        z: legBackZ,
      },
    );

    // Palang penghubung bawah (bottom runner) & atas
    const runnerY = footH + 0.055;
    secondaryParts.push(
      {
        geo: new THREE.BoxGeometry(legThick * 0.85, 0.024, legSpanD),
        x: openSideX,
        y: runnerY,
        z: 0,
      },
      {
        geo: new THREE.BoxGeometry(legThick * 0.9, 0.026, legSpanD),
        x: openSideX,
        y: underTopY - 0.013,
        z: 0,
      },
    );
  }

  // 3. Area Bentang Tengah (Open Knee Span): Laci Atas & Palang Penguat Belakang
  const spanLeftX = hasLeftPed
    ? -W / 2 + pedW + 0.004
    : openSideX + legThick / 2;
  const spanRightX = hasRightPed
    ? W / 2 - pedW - 0.004
    : openSideX - legThick / 2;
  const spanW = Math.max(0.1, spanRightX - spanLeftX);
  const spanCenterX = (spanLeftX + spanRightX) / 2;

  // Palang penguat belakang bawah (Rear Stretcher Bar)
  secondaryParts.push({
    geo: new THREE.BoxGeometry(spanW, 0.024, 0.022),
    x: spanCenterX,
    y: footH + 0.065,
    z: legBackZ,
  });

  // Laci Tipis di Bawah Daun Meja (Under-Desk Apron Drawers)
  if (hasTopDrawers && spanW >= 0.25) {
    const apronH = 0.088;
    const apronY = underTopY - apronH / 2;
    const faceThick = 0.018;
    const carcassD = Math.max(0.2, pedD - faceThick);

    // Bodi kotak laci bawah meja
    secondaryParts.push({
      geo: new THREE.BoxGeometry(spanW, apronH, carcassD),
      x: spanCenterX,
      y: apronY,
      z: -faceThick / 2,
    });

    const subCount = spanW >= 0.72 ? 2 : 1;
    const gap = 0.005;
    const subW = (spanW - gap * (subCount + 1)) / subCount;
    const subH = apronH - 0.012;
    const frontZ = pedD / 2 - faceThick / 2;
    const frontSurfaceZ = pedD / 2;

    for (let s = 0; s < subCount; s++) {
      const sx = spanLeftX + gap + subW / 2 + s * (subW + gap);
      secondaryParts.push({
        geo: createRoundedBoxGeometry(
          subW,
          subH,
          faceThick,
          0.003,
          0.002,
          0.002,
        ),
        x: sx,
        y: apronY,
        z: frontZ,
      });
      buildDrawerPull(sx, apronY, frontSurfaceZ, subW, subH);
    }
  } else {
    // Jika tanpa laci tengah, tetap pasang apron besi tipis penahan daun meja
    secondaryParts.push({
      geo: new THREE.BoxGeometry(spanW, 0.032, 0.022),
      x: spanCenterX,
      y: underTopY - 0.016,
      z: legBackZ,
    });
  }

  addPart(group, mergeParts(secondaryParts), matSecondary, 0, 0, 0, true);
  if (darkParts.length > 0) {
    addPart(group, mergeParts(darkParts), sharedDetailMat, 0, 0, 0, false);
  }
  if (chromeParts.length > 0) {
    addPart(group, mergeParts(chromeParts), sharedChromeMat, 0, 0, 0, false);
  }
}

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
        {
          label: t.deskStudio || "Meja Laci",
          patch: {
            deskShape: "studio",
            pedestalLayout: "left",
            drawerCount: 5,
            hasTopDrawers: true,
            drawerHandleStyle: "cutout",
            width: 150,
            depth: 65,
            height: 75,
            color1: "#D6B892",
            color2: "#334155",
          },
        },
      ],
    };
  },

  getItemLabel(item, t) {
    if (item.deskShape === "studio") {
      return `${t.deskStudio || "Meja Laci"} (${item.drawerCount || 5}L)`;
    }
    const shapeName =
      item.deskShape === "l-shape"
        ? t.deskL
        : item.deskShape === "round"
          ? t.deskRound
          : t.deskRect;
    return `${t.catDesk} ${shapeName}`;
  },

  getColorLabels(item, t) {
    if (item.deskShape === "studio") {
      return {
        color1: t.colorTableTop,
        color2: t.colorDeskCabinet || "Warna Kabinet & Kaki",
      };
    }
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
    const isStudio = deskShape === "studio";
    return {
      id,
      type: "desk",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width:
        variant.width ||
        (deskShape === "round"
          ? 100
          : deskShape === "l-shape" || isStudio
            ? 150
            : 120),
      depth:
        variant.depth ||
        (deskShape === "round"
          ? 100
          : deskShape === "l-shape"
            ? 120
            : isStudio
              ? 65
              : 60),
      height: variant.height || 75,
      deskShape,
      lCorner: "left",
      mainDepth: 60,
      sideWidth: 45,
      pedestalLayout: variant.pedestalLayout || "left",
      drawerCount: variant.drawerCount || 5,
      hasTopDrawers: variant.hasTopDrawers !== false,
      drawerHandleStyle: variant.drawerHandleStyle || "cutout",
      color1: variant.color1 || "#D6B892",
      color2: variant.color2 || (isStudio ? "#334155" : "#27272A"),
    };
  },

  buildMesh(group, item, mats, dims) {
    if (item.deskShape === "studio") {
      buildStudioDesk(group, item, mats, dims);
      return;
    }

    const { matPrimary, matSecondary } = mats;
    const { W, D, H } = dims;
    const topThick = 0.032;
    const footH = 0.012;
    const legH = Math.max(0.1, H - topThick - footH);
    const legThick = 0.036;
    const apronH = 0.036;
    const apronThick = 0.022;
    const apronY = footH + legH - apronH / 2;
    const stretcherY = footH + Math.min(0.14, legH * 0.22);

    const legGeo = createRoundedBoxGeometry(
      legThick,
      legH,
      legThick,
      0.006,
      0.003,
      0.003,
    );
    const footGeo = createRoundedBoxGeometry(
      legThick + 0.004,
      footH,
      legThick + 0.004,
      0.005,
      0.002,
      0.002,
    );

    if (item.deskShape === "round") {
      const topGroup = new THREE.Group();
      const bevelH = 0.005;
      const coreH = Math.max(0.01, topThick - bevelH * 2);
      const coreCyl = new THREE.CylinderGeometry(0.5, 0.5, coreH, 40);
      const topBev = new THREE.CylinderGeometry(0.493, 0.5, bevelH, 40);
      const botBev = new THREE.CylinderGeometry(0.5, 0.493, bevelH, 40);

      const coreMesh = new THREE.Mesh(coreCyl, matPrimary);
      coreMesh.position.y = footH + legH + topThick / 2;
      coreMesh.castShadow = true;
      coreMesh.receiveShadow = true;

      const topMesh = new THREE.Mesh(topBev, matPrimary);
      topMesh.position.y = footH + legH + topThick - bevelH / 2;

      const botMesh = new THREE.Mesh(botBev, matPrimary);
      botMesh.position.y = footH + legH + bevelH / 2;

      topGroup.add(coreMesh, topMesh, botMesh);
      topGroup.scale.set(W, 1, D);
      group.add(topGroup);

      const flangeGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.018, 24);
      addPart(
        group,
        flangeGeo,
        matSecondary,
        0,
        footH + legH - 0.009,
        0,
        false,
      );

      addPart(
        group,
        new THREE.CylinderGeometry(0.032, 0.042, legH, 20),
        matSecondary,
        0,
        footH + legH / 2,
        0,
      );

      const baseSpanW = Math.min(0.58, W * 0.66);
      const baseSpanD = Math.min(0.58, D * 0.66);
      const baseH = 0.024;
      addPart(
        group,
        createRoundedBoxGeometry(baseSpanW, baseH, 0.055, 0.01, 0.004, 0.004),
        matSecondary,
        0,
        footH + baseH / 2,
        0,
      );
      addPart(
        group,
        createRoundedBoxGeometry(0.055, baseH, baseSpanD, 0.01, 0.004, 0.004),
        matSecondary,
        0,
        footH + baseH / 2,
        0,
      );
    } else if (item.deskShape === "l-shape") {
      const { mainDepthM, sideWidthM } = getLDeskDimensionsM(item);
      const isRight = item.lCorner === "right";
      const inset = 0.022;

      const lTopGeo = createLTopGeometry(
        W,
        D,
        mainDepthM,
        sideWidthM,
        item.lCorner,
        topThick,
      );
      addPart(group, lTopGeo, matPrimary, 0, footH + legH, 0);

      const xOuterL = -W / 2 + inset + legThick / 2;
      const xOuterR = W / 2 - inset - legThick / 2;
      const zBack = -D / 2 + inset + legThick / 2;
      const zMainFront = -D / 2 + mainDepthM - inset - legThick / 2;
      const zWingFront = D / 2 - inset - legThick / 2;
      const xWingInner = isRight
        ? W / 2 - sideWidthM + inset + legThick / 2
        : -W / 2 + sideWidthM - inset - legThick / 2;

      const legCoords = isRight
        ? [
            [xOuterL, zBack],
            [xOuterL, zMainFront],
            [xOuterR, zBack],
            [xWingInner, zMainFront],
            [xWingInner, zWingFront],
            [xOuterR, zWingFront],
          ]
        : [
            [xOuterL, zBack],
            [xOuterR, zBack],
            [xOuterR, zMainFront],
            [xWingInner, zMainFront],
            [xOuterL, zWingFront],
            [xWingInner, zWingFront],
          ];

      legCoords.forEach(([lx, lz]) => {
        addLegWithFoot(
          group,
          legGeo,
          footGeo,
          matSecondary,
          lx,
          lz,
          legH,
          footH,
        );
      });

      const mainSpanW = Math.max(0.1, xOuterR - xOuterL);
      addPart(
        group,
        new THREE.BoxGeometry(mainSpanW, apronH, apronThick),
        matSecondary,
        0,
        apronY,
        zBack,
        false,
      );
      addPart(
        group,
        new THREE.BoxGeometry(mainSpanW, apronH, apronThick),
        matSecondary,
        0,
        apronY,
        zMainFront,
        false,
      );

      const wingSpanD = Math.max(0.1, zWingFront - zBack);
      const wingSideX = isRight ? xOuterR : xOuterL;
      const wingCenterZ = (zBack + zWingFront) / 2;
      addPart(
        group,
        new THREE.BoxGeometry(apronThick, apronH, wingSpanD),
        matSecondary,
        wingSideX,
        apronY,
        wingCenterZ,
        false,
      );
      addPart(
        group,
        new THREE.BoxGeometry(
          apronThick,
          apronH,
          Math.max(0.08, zWingFront - zMainFront),
        ),
        matSecondary,
        xWingInner,
        apronY,
        (zMainFront + zWingFront) / 2,
        false,
      );

      const mainEndX = isRight ? xOuterL : xOuterR;
      const mainEndDepth = Math.max(0.08, zMainFront - zBack);
      addPart(
        group,
        new THREE.BoxGeometry(0.022, 0.022, mainEndDepth),
        matSecondary,
        mainEndX,
        stretcherY,
        (zBack + zMainFront) / 2,
        false,
      );
      addPart(
        group,
        new THREE.BoxGeometry(
          Math.max(0.08, Math.abs(wingSideX - xWingInner)),
          0.022,
          0.022,
        ),
        matSecondary,
        (wingSideX + xWingInner) / 2,
        stretcherY,
        zWingFront,
        false,
      );

      const grommetX = isRight
        ? W / 2 - sideWidthM * 0.5
        : -W / 2 + sideWidthM * 0.5;
      addPart(
        group,
        new THREE.CylinderGeometry(0.024, 0.024, 0.004, 20),
        sharedDetailMat,
        grommetX,
        footH + legH + topThick + 0.001,
        -D / 2 + 0.075,
        false,
      );
    } else {
      addPart(
        group,
        createRoundedBoxGeometry(W, topThick, D, 0.012, 0.005, 0.005),
        matPrimary,
        0,
        footH + legH + topThick / 2,
        0,
      );

      const inset = 0.024;
      const offX = Math.max(0.03, W / 2 - inset - legThick / 2);
      const offZ = Math.max(0.03, D / 2 - inset - legThick / 2);

      [
        [-offX, -offZ],
        [offX, -offZ],
        [-offX, offZ],
        [offX, offZ],
      ].forEach(([lx, lz]) => {
        addLegWithFoot(
          group,
          legGeo,
          footGeo,
          matSecondary,
          lx,
          lz,
          legH,
          footH,
        );
      });

      const spanW = Math.max(0.08, offX * 2);
      const spanD = Math.max(0.08, offZ * 2);
      const fbApronGeo = new THREE.BoxGeometry(spanW, apronH, apronThick);
      const lrApronGeo = new THREE.BoxGeometry(apronThick, apronH, spanD);
      addPart(group, fbApronGeo, matSecondary, 0, apronY, -offZ, false);
      addPart(group, fbApronGeo, matSecondary, 0, apronY, offZ, false);
      addPart(group, lrApronGeo, matSecondary, -offX, apronY, 0, false);
      addPart(group, lrApronGeo, matSecondary, offX, apronY, 0, false);

      const sideStretcherGeo = new THREE.BoxGeometry(0.022, 0.022, spanD);
      addPart(
        group,
        sideStretcherGeo,
        matSecondary,
        -offX,
        stretcherY,
        0,
        false,
      );
      addPart(
        group,
        sideStretcherGeo,
        matSecondary,
        offX,
        stretcherY,
        0,
        false,
      );
      addPart(
        group,
        new THREE.BoxGeometry(spanW, 0.022, 0.022),
        matSecondary,
        0,
        stretcherY,
        -offZ,
        false,
      );

      if (W >= 0.8 && D >= 0.45) {
        addPart(
          group,
          new THREE.CylinderGeometry(0.024, 0.024, 0.004, 20),
          sharedDetailMat,
          W / 2 - 0.11,
          footH + legH + topThick + 0.001,
          -D / 2 + 0.075,
          false,
        );
      }
    }
  },
};
