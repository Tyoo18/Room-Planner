import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

const sharedFootMat = new THREE.MeshStandardMaterial({
  color: "#18181B",
  roughness: 0.65,
});

function evalBeanbagPoint(t, angle, W, H, D) {
  const profileR = [
    [0.0, 0.0],
    [0.41, 0.0],
    [0.47, 0.06],
    [0.5, 0.2],
    [0.48, 0.36],
    [0.42, 0.52],
    [0.32, 0.68],
    [0.18, 0.84],
    [0.06, 0.96],
    [0.0, 1.0],
  ];

  const scaledIdx = t * (profileR.length - 1);
  const idx0 = Math.floor(scaledIdx);
  const idx1 = Math.min(profileR.length - 1, idx0 + 1);
  const frac = scaledIdx - idx0;

  const r = profileR[idx0][0] * (1 - frac) + profileR[idx1][0] * frac;
  let vy = profileR[idx0][1] * (1 - frac) + profileR[idx1][1] * frac;

  let vx = Math.sin(angle) * r;
  let vz = Math.cos(angle) * r;

  vz -= Math.pow(vy, 1.65) * 0.22;

  if (vz > 0.05 && vy > 0.22 && vy < 0.72) {
    const seatFactor = Math.sin(((vy - 0.22) / 0.5) * Math.PI) * (vz / 0.5);
    vy -= seatFactor * 0.11;
    vz -= seatFactor * 0.09;
  }

  return new THREE.Vector3(vx * W, vy * H, vz * D);
}

export const sofaModule = {
  type: "sofa",
  zone: "workSeating",

  getCatalogConfig(t) {
    return {
      type: "sofa",
      title: t.catSofa || "Sofa & Santai",
      variants: [
        {
          label: t.sofaMinimal || "Sofa Minimalis",
          patch: { sofaStyle: "sofa" },
        },
        {
          label: t.sofaBeanbag || "Beanbag",
          patch: { sofaStyle: "beanbag" },
        },
      ],
    };
  },

  getItemLabel(item, t) {
    return item.sofaStyle === "beanbag"
      ? t.sofaBeanbag || "Beanbag"
      : t.sofaMinimal || "Sofa Minimalis";
  },

  getColorLabels(item, t) {
    return {
      color1: t.colorSofaMain || "Warna Utama Kain",
      color2:
        item.sofaStyle === "beanbag"
          ? t.colorBeanbagAccent || "Warna Jahitan & Lis"
          : t.colorSofaAccent || "Warna Bantal & Kaki",
    };
  },

  createDefault(id, variant = {}) {
    const isBeanbag = variant.sofaStyle === "beanbag";
    return {
      id,
      type: "sofa",
      locked: false,
      x: 0,
      z: 0,
      rotation: 0,
      width: isBeanbag ? 85 : 150,
      depth: isBeanbag ? 85 : 78,
      height: isBeanbag ? 72 : 76,
      sofaStyle: isBeanbag ? "beanbag" : "sofa",
      color1: isBeanbag ? "#64748B" : "#78716C",
      color2: isBeanbag ? "#CBD5E1" : "#E7E5E4",
    };
  },

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D, H: dimH }) {
    const H = dimH || (item.height || 76) / 100;

    if (item.sofaStyle === "beanbag") {
      const radialSegs = 40;
      const heightSteps = 24;
      const latheProfile = [];
      for (let s = 0; s <= heightSteps; s++) {
        const p = evalBeanbagPoint(s / heightSteps, 0, 1, 1, 1);
        latheProfile.push(new THREE.Vector2(Math.max(0, p.z), p.y));
      }

      const bodyGeo = new THREE.LatheGeometry(latheProfile, radialSegs);
      const pos = bodyGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const pz = pos.getZ(i);
        const angle = Math.atan2(px, pz);
        const deformed = evalBeanbagPoint(py, angle, W, H, D);
        pos.setXYZ(i, deformed.x, deformed.y, deformed.z);
      }
      bodyGeo.computeVertexNormals();
      addPart(group, bodyGeo, matPrimary, 0, 0, 0);

      const basePiping = new THREE.TorusGeometry(0.455, 0.011, 10, 40);
      basePiping.rotateX(Math.PI / 2);
      basePiping.scale(W, 1, D);
      addPart(group, basePiping, matSecondary, 0, H * 0.045, 0);

      const panelCount = 6;
      for (let p = 0; p < panelCount; p++) {
        const angle = (p / panelCount) * Math.PI * 2 + Math.PI / 6;
        const seamPts = [];
        for (let step = 2; step <= 18; step++) {
          const tVal = step / 19;
          const pt = evalBeanbagPoint(tVal, angle, W * 1.006, H, D * 1.006);
          seamPts.push(pt);
        }
        const curve = new THREE.CatmullRomCurve3(seamPts);
        const seamGeo = new THREE.TubeGeometry(curve, 18, 0.0045, 6, false);
        addPart(group, seamGeo, matSecondary, 0, 0, 0, false);
      }

      const apexZ = -0.22 * D;
      addPart(
        group,
        new THREE.CylinderGeometry(0.032, 0.036, 0.012, 16),
        matSecondary,
        0,
        H * 0.995,
        apexZ,
        false,
      );

      const handleGeo = new THREE.TorusGeometry(0.042, 0.008, 8, 16, Math.PI);
      addPart(
        group,
        handleGeo,
        matSecondary,
        0,
        H * 0.985,
        apexZ - 0.035,
        false,
      );
      return;
    }

    // --- SOFA MINIMALIS (TAILORED & PLUSH) ---
    const legH = Math.min(0.11, H * 0.15);
    const armW = Math.min(0.14, W * 0.14);
    const backFrameD = Math.min(0.13, D * 0.19);
    const seatH = Math.max(0.18, (H - legH) * 0.44);
    const armH = Math.max(seatH + 0.08, (H - legH) * 0.66);
    const backH = Math.max(seatH + 0.18, H - legH);

    // 1. 4 Kaki Tapered Miring (Splayed Legs) + Sepatu Karet
    const legGeo = new THREE.CylinderGeometry(0.022, 0.014, legH, 14);
    const padGeo = new THREE.CylinderGeometry(0.015, 0.016, 0.008, 12);
    const lx = Math.max(0.05, W / 2 - 0.065);
    const lz = Math.max(0.05, D / 2 - 0.065);
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([sx, sz]) => {
      const legMesh = addPart(
        group,
        legGeo,
        matSecondary,
        sx * lx,
        legH / 2,
        sz * lz,
      );
      legMesh.rotation.z = -sx * 0.08;
      legMesh.rotation.x = sz * 0.08;
      addPart(
        group,
        padGeo,
        sharedFootMat,
        sx * (lx + 0.004),
        0.004,
        sz * (lz + 0.004),
        false,
      );
    });

    // 2. Base Plinth Rail (Rangka Bawah Sofa)
    const baseThick = Math.max(0.06, seatH * 0.44);
    const baseD = Math.max(0.2, D - 0.02);
    addPart(
      group,
      createRoundedBoxGeometry(W - 0.01, baseThick, baseD, 0.025, 0.008, 0.008),
      matPrimary,
      0,
      legH + baseThick / 2,
      -0.005,
    );

    // 3. Sandaran Belakang Struktural (Miring sedikit ke belakang)
    const innerW = Math.max(0.2, W - armW * 2);
    const backFrameMesh = addPart(
      group,
      createRoundedBoxGeometry(
        innerW + 0.01,
        backH,
        backFrameD,
        0.03,
        0.01,
        0.01,
      ),
      matPrimary,
      0,
      legH + backH / 2,
      -D / 2 + backFrameD / 2 + 0.012,
    );
    backFrameMesh.rotation.x = -0.07;

    // 4. Armrests Kiri & Kanan (Rounded Top Profile)
    const armGeo = createRoundedBoxGeometry(
      armW,
      armH,
      D - 0.01,
      0.045,
      0.014,
      0.014,
    );
    addPart(group, armGeo, matPrimary, -W / 2 + armW / 2, legH + armH / 2, 0);
    addPart(group, armGeo, matPrimary, W / 2 - armW / 2, legH + armH / 2, 0);

    // 5. Bantalan Dudukan Empuk (1, 2, atau 3 segmen sesuai lebar)
    const cushionCount = W >= 1.9 ? 3 : W >= 1.05 ? 2 : 1;
    const cushionGap = 0.014;
    const cushW = (innerW - cushionGap * (cushionCount - 1)) / cushionCount;
    const cushD = Math.max(0.18, D - backFrameD + 0.015);
    const cushH = Math.max(0.07, seatH - baseThick + 0.012);
    const cushY = legH + baseThick + cushH / 2 - 0.004;
    const cushZ = backFrameD / 2 + 0.012;

    const seatCushGeo = createRoundedBoxGeometry(
      cushW,
      cushH,
      cushD,
      0.055,
      0.02,
      0.02,
    );

    for (let i = 0; i < cushionCount; i++) {
      const cx = -innerW / 2 + cushW / 2 + i * (cushW + cushionGap);
      addPart(group, seatCushGeo, matPrimary, cx, cushY, cushZ);
    }

    // 6. Bantalan Punggung Empuk (Back Cushions)
    const backCushH = Math.max(0.16, (backH - seatH) * 0.94);
    const backCushD = 0.115;
    const backCushY = legH + seatH + backCushH * 0.48;
    const backCushZ = -D / 2 + backFrameD + backCushD * 0.45 + 0.012;
    const backCushGeo = createRoundedBoxGeometry(
      cushW,
      backCushH,
      backCushD,
      0.055,
      0.02,
      0.02,
    );

    for (let i = 0; i < cushionCount; i++) {
      const cx = -innerW / 2 + cushW / 2 + i * (cushW + cushionGap);
      const bcMesh = addPart(
        group,
        backCushGeo,
        matPrimary,
        cx,
        backCushY,
        backCushZ,
      );
      bcMesh.rotation.x = -0.14;
    }

    // 7. Bantal Sudut (Throw Pillows) dengan sudut santai
    if (innerW >= 0.72) {
      const pillowW = Math.min(0.32, innerW * 0.26);
      const pillowH = Math.min(0.28, (backH - seatH) * 0.76);
      const pillowD = 0.095;
      const pillowGeo = createRoundedBoxGeometry(
        pillowW,
        pillowH,
        pillowD,
        0.055,
        0.022,
        0.022,
      );

      [-1, 1].forEach((dir) => {
        const px = dir * (innerW / 2 - pillowW * 0.48);
        const py = legH + seatH + pillowH * 0.45;
        const pz = backCushZ + backCushD * 0.55 + 0.02;
        const pMesh = addPart(group, pillowGeo, matSecondary, px, py, pz);
        pMesh.rotation.x = -0.22;
        pMesh.rotation.y = -dir * 0.28;
        pMesh.rotation.z = dir * 0.12;
      });
    }
  },
};
