import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

const sharedDetailMat = new THREE.MeshStandardMaterial({
  color: "#18181B",
  roughness: 0.55,
  metalness: 0.25,
});

function createLTopGeometry(W, D, mainDepthM, sideWidthM, lCorner, topThick) {
  const bSize = 0.006;
  const bThick = Math.min(0.005, topThick * 0.2);
  const extrudeDepth = Math.max(0.008, topThick - bThick * 2);

  // Koordinat shape (x, y) di mana setelah rotateX(-PI/2), Z_world = -y
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
      // Daun Meja Bulat / Oval dengan profil bevel atas-bawah
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

      // Flange bawah meja + Tiang tengah
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

      // Kaki silang dengan bevel + sepatu glide
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

      // Daun Meja L-Shape Menyatu (Seamless Bevel)
      const lTopGeo = createLTopGeometry(
        W,
        D,
        mainDepthM,
        sideWidthM,
        item.lCorner,
        topThick,
      );
      addPart(group, lTopGeo, matPrimary, 0, footH + legH, 0);

      // Koordinat 6 sudut rangka kaki
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

      // Apron Frame Bawah Meja (Memanjang di sisi utama & sayap)
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

      // Palang Bawah (Stretchers) di ujung sayap & ujung meja utama
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

      // Grommet Kabel di sudut dalam belakang
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
      // Daun Meja Persegi Panjang dengan Bevel
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

      // Apron Frame 4 Sisi di bawah daun meja
      const spanW = Math.max(0.08, offX * 2);
      const spanD = Math.max(0.08, offZ * 2);
      const fbApronGeo = new THREE.BoxGeometry(spanW, apronH, apronThick);
      const lrApronGeo = new THREE.BoxGeometry(apronThick, apronH, spanD);
      addPart(group, fbApronGeo, matSecondary, 0, apronY, -offZ, false);
      addPart(group, fbApronGeo, matSecondary, 0, apronY, offZ, false);
      addPart(group, lrApronGeo, matSecondary, -offX, apronY, 0, false);
      addPart(group, lrApronGeo, matSecondary, offX, apronY, 0, false);

      // Palang Penghubung Samping (Side Stretchers) & Modesty/Cable Bar Belakang
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

      // Grommet Kabel di sudut kanan belakang
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
