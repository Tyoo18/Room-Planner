import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

// Cache material statis di luar buildMesh agar tidak re-compile shader saat resize
const sharedPillowMat = new THREE.MeshStandardMaterial({
  color: "#F8FAFC",
  roughness: 0.9,
});

function placePart(group, geo, mat, x, y, z, rx = 0, castShadow = true) {
  const mesh = addPart(group, geo, mat, x, y, z, castShadow);
  if (rx !== 0) mesh.rotation.x = rx;
  return mesh;
}

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

    // Buat material selimut sedikit lebih gelap/hangat dari warna kasur utama untuk kontras lapisan
    const duvetMat = matPrimary.clone();
    duvetMat.color.offsetHSL(0, 0.03, -0.08);
    duvetMat.roughness = 0.92;

    let baseH = 0;
    let matW = W;
    let matD = D;
    let matZ = 0;

    if (isFloor) {
      // Alas palet kayu tipis (tatami/low platform) agar kasur lantai tetap punya pijakan
      const palletH = Math.min(0.045, H * 0.22);
      baseH = palletH;
      const slatCount = Math.max(5, Math.round(D / 0.18));
      const slatD = (D / slatCount) * 0.72;
      const slatGeo = createRoundedBoxGeometry(
        W,
        palletH,
        slatD,
        0.008,
        0.004,
        0.004,
      );

      for (let i = 0; i < slatCount; i++) {
        const sz = -D / 2 + (D / slatCount) * (i + 0.5);
        placePart(group, slatGeo, matSecondary, 0, palletH / 2, sz, 0, false);
      }

      matW = Math.max(0.2, W - 0.05);
      matD = Math.max(0.2, D - 0.05);
    } else {
      // Rangka berkolong (kaki + side rails + headboard berbilah)
      baseH = Math.min(0.22, H * 0.45);
      const legH = Math.min(0.11, baseH * 0.52);
      const lipOverlap = 0.025; // Bibir rangka naik sedikit menutup tepi bawah kasur
      const railH = Math.max(0.05, baseH - legH + lipOverlap);
      const railY = legH + railH / 2;
      const postSize = 0.052;
      const railThick = 0.032;

      const hbH = Math.max(0.88, H + 0.44);

      // 2 Tiang Belakang (menyatu dengan headboard)
      const backPostGeo = createRoundedBoxGeometry(
        postSize,
        hbH,
        postSize,
        0.01,
        0.005,
        0.005,
      );
      const postX = W / 2 - postSize / 2;
      const backZ = -D / 2 + postSize / 2;
      placePart(group, backPostGeo, matSecondary, -postX, hbH / 2, backZ);
      placePart(group, backPostGeo, matSecondary, postX, hbH / 2, backZ);

      // 2 Kaki Depan
      const frontH = baseH + lipOverlap;
      const frontPostGeo = createRoundedBoxGeometry(
        postSize,
        frontH,
        postSize,
        0.01,
        0.005,
        0.005,
      );
      const frontZ = D / 2 - postSize / 2;
      placePart(group, frontPostGeo, matSecondary, -postX, frontH / 2, frontZ);
      placePart(group, frontPostGeo, matSecondary, postX, frontH / 2, frontZ);

      // Side Rails (Kiri & Kanan)
      const sideRailD = Math.max(0.1, D - postSize * 2);
      const sideRailGeo = createRoundedBoxGeometry(
        railThick,
        railH,
        sideRailD,
        0.008,
        0.004,
        0.004,
      );
      placePart(group, sideRailGeo, matSecondary, -postX, railY, 0);
      placePart(group, sideRailGeo, matSecondary, postX, railY, 0);

      // Front & Back Rails
      const innerW = Math.max(0.1, W - postSize * 2);
      const endRailGeo = createRoundedBoxGeometry(
        innerW,
        railH,
        railThick,
        0.008,
        0.004,
        0.004,
      );
      placePart(group, endRailGeo, matSecondary, 0, railY, frontZ);
      placePart(group, endRailGeo, matSecondary, 0, railY, backZ);

      // Headboard: Top Rail, Bottom Rail, dan Bilah Vertikal (Slats)
      const topRailH = 0.06;
      const topRailY = hbH - 0.035;
      const hbRailGeo = createRoundedBoxGeometry(
        innerW,
        topRailH,
        0.042,
        0.008,
        0.004,
        0.004,
      );
      placePart(group, hbRailGeo, matSecondary, 0, topRailY, backZ);

      const botHbY = baseH + 0.08;
      placePart(group, hbRailGeo, matSecondary, 0, botHbY, backZ);

      const slatAreaH = Math.max(0.1, topRailY - botHbY - topRailH * 0.6);
      const slatY = (topRailY + botHbY) / 2;
      const slatCount = Math.max(4, Math.round(innerW / 0.13));
      const slatStep = innerW / (slatCount + 1);
      const slatGeo = createRoundedBoxGeometry(
        0.028,
        slatAreaH,
        0.016,
        0.004,
        0.002,
        0.002,
      );

      for (let i = 1; i <= slatCount; i++) {
        const sx = -innerW / 2 + slatStep * i;
        placePart(group, slatGeo, matSecondary, sx, slatY, backZ, 0, false);
      }

      // Kasur masuk sedikit ke dalam bingkai kayu
      matW = Math.max(0.2, W - railThick * 2 - 0.01);
      matD = Math.max(0.2, D - postSize - railThick - 0.01);
      matZ = (postSize - railThick) / 2;
    }

    // 1. Kasur Utama
    const mattressH = Math.max(0.1, H - baseH);
    const mattressGeo = createRoundedBoxGeometry(
      matW,
      mattressH,
      matD,
      0.055,
      0.02,
      0.02,
    );
    placePart(group, mattressGeo, matPrimary, 0, baseH + mattressH / 2, matZ);

    // 2. Selimut (Duvet) menutupi 58% bagian bawah kasur + sedikit menjuntai di samping
    const duvetD = matD * 0.58;
    const duvetW = matW + 0.022;
    const duvetH = Math.min(mattressH * 0.65, 0.14);
    const duvetY = baseH + mattressH - duvetH / 2 + 0.012;
    const duvetZ = matZ + matD / 2 - duvetD / 2 + 0.008;
    const duvetGeo = createRoundedBoxGeometry(
      duvetW,
      duvetH,
      duvetD,
      0.045,
      0.018,
      0.018,
    );
    placePart(group, duvetGeo, duvetMat, 0, duvetY, duvetZ, 0, false);

    // Lipatan atas selimut (Folded Cuff) untuk memecah bidang datar
    const cuffD = Math.min(0.16, duvetD * 0.25);
    const cuffH = 0.022;
    const cuffY = baseH + mattressH + 0.012 + cuffH / 2 - 0.004;
    const cuffZ = duvetZ - duvetD / 2 + cuffD / 2 + 0.01;
    const cuffGeo = createRoundedBoxGeometry(
      duvetW + 0.004,
      cuffH,
      cuffD,
      0.02,
      0.008,
      0.008,
    );
    placePart(group, cuffGeo, sharedPillowMat, 0, cuffY, cuffZ, 0, false);

    // 3. Bantal Miring Menyandar (Tidak tiduran rata 0 derajat)
    const pillowCount = W >= 1.1 ? 2 : 1;
    const pillowW = Math.min(0.56, (matW - 0.14) / pillowCount);
    const pillowD = Math.min(0.36, matD * 0.22);
    const pillowH = 0.095;
    const tiltAngle = 0.34; // ~19.5 derajat menyandar ke headboard
    const pillowY = baseH + mattressH + pillowH * 0.45;
    const pillowZ = matZ - matD / 2 + pillowD * 0.55 + 0.03;

    const pillowGeo = createRoundedBoxGeometry(
      pillowW,
      pillowH,
      pillowD,
      0.06,
      0.026,
      0.026,
    );

    if (pillowCount === 1) {
      placePart(
        group,
        pillowGeo,
        sharedPillowMat,
        0,
        pillowY,
        pillowZ,
        tiltAngle,
      );
    } else {
      const gap = pillowW * 0.54;
      // Berbagi referensi pillowGeo yang sama (tanpa .clone()) untuk hemat memori
      placePart(
        group,
        pillowGeo,
        sharedPillowMat,
        -gap,
        pillowY,
        pillowZ,
        tiltAngle,
      );
      placePart(
        group,
        pillowGeo,
        sharedPillowMat,
        gap,
        pillowY,
        pillowZ,
        tiltAngle,
      );
    }
  },
};
