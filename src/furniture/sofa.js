import * as THREE from "three";
import { addPart } from "./helpers";

function evalBeanbagPoint(t, angle, W, H, D) {
  // Profil teardrop dari bawah (t=0) ke puncak (t=1)
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

  // Condongkan sandaran ke belakang (-Z)
  vz -= Math.pow(vy, 1.65) * 0.22;

  // Lekukan dudukan empuk di bagian depan (+Z)
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

  buildMesh(group, item, { matPrimary, matSecondary }, { W, D }) {
    const H = (item.height || 76) / 100;

    if (item.sofaStyle === "beanbag") {
      // 1. Badan Utama Teardrop Lounger
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

      // 2. Lis Piping Bawah (Welting Perimeter)
      const basePiping = new THREE.TorusGeometry(0.455, 0.011, 10, 40);
      basePiping.rotateX(Math.PI / 2);
      basePiping.scale(W, 1, D);
      addPart(group, basePiping, matSecondary, 0, H * 0.045, 0);

      // 3. 6 Garis Jahitan Vertikal Antar Panel Kain
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

      // 4. Kancing Puncak & Tali Pegangan (Carry Handle)
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

    // --- SOFA MINIMALIS ---
    const legH = Math.min(0.08, H * 0.12);
    const armW = Math.min(0.14, W * 0.14);
    const backD = Math.min(0.16, D * 0.24);
    const seatH = Math.max(0.16, (H - legH) * 0.42);
    const armH = Math.max(seatH + 0.1, (H - legH) * 0.68);
    const backH = Math.max(seatH + 0.18, H - legH);

    const legR = 0.022;
    const lx = Math.max(0.05, W / 2 - 0.06);
    const lz = Math.max(0.05, D / 2 - 0.06);
    [
      [-lx, -lz],
      [lx, -lz],
      [-lx, lz],
      [lx, lz],
    ].forEach(([px, pz]) => {
      addPart(
        group,
        new THREE.CylinderGeometry(legR, legR * 0.8, legH, 12),
        matSecondary,
        px,
        legH / 2,
        pz,
      );
    });

    const baseThick = seatH * 0.45;
    addPart(
      group,
      new THREE.BoxGeometry(W, baseThick, D),
      matPrimary,
      0,
      legH + baseThick / 2,
      0,
    );

    addPart(
      group,
      new THREE.BoxGeometry(armW, armH, D),
      matPrimary,
      -W / 2 + armW / 2,
      legH + armH / 2,
      0,
    );
    addPart(
      group,
      new THREE.BoxGeometry(armW, armH, D),
      matPrimary,
      W / 2 - armW / 2,
      legH + armH / 2,
      0,
    );

    const innerW = Math.max(0.2, W - armW * 2);
    addPart(
      group,
      new THREE.BoxGeometry(innerW, backH, backD),
      matPrimary,
      0,
      legH + backH / 2,
      -D / 2 + backD / 2,
    );

    const cushD = Math.max(0.15, D - backD - 0.01);
    const cushH = seatH - baseThick;
    const cushZ = backD / 2;
    const halfCushW = innerW / 2 - 0.006;

    [-1, 1].forEach((dir) => {
      addPart(
        group,
        new THREE.BoxGeometry(halfCushW, cushH, cushD),
        matPrimary,
        dir * (innerW / 4),
        legH + baseThick + cushH / 2,
        cushZ,
      );
    });

    const pillowW = Math.min(0.32, innerW * 0.28);
    const pillowH = Math.min(0.3, (backH - seatH) * 0.78);
    const pillowD = 0.09;
    if (innerW >= 0.7) {
      [-1, 1].forEach((dir) => {
        addPart(
          group,
          new THREE.BoxGeometry(pillowW, pillowH, pillowD),
          matSecondary,
          dir * (innerW / 2 - pillowW / 2 - 0.03),
          legH + seatH + pillowH / 2 - 0.02,
          -D / 2 + backD + pillowD / 2 + 0.01,
        );
      });
    }
  },
};
