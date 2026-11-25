import * as THREE from "three";
import { createRoundedBoxGeometry, addPart } from "./helpers";

const sharedCasterMat = new THREE.MeshStandardMaterial({
  color: "#18181B",
  roughness: 0.65,
});

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
    const seatThick = 0.048;

    if (style === "stool") {
      // 1. Dudukan Bulat/Oval Ber-bevel + Apron Bawah
      const seatGroup = new THREE.Group();
      const bevH = 0.008;
      const coreH = Math.max(0.015, seatThick - bevH * 2);

      const coreCyl = new THREE.CylinderGeometry(0.5, 0.5, coreH, 32);
      const topCyl = new THREE.CylinderGeometry(0.482, 0.5, bevH, 32);
      const botCyl = new THREE.CylinderGeometry(0.5, 0.485, bevH, 32);

      const mCore = new THREE.Mesh(coreCyl, matPrimary);
      mCore.position.y = seatH - seatThick / 2;
      mCore.castShadow = true;
      mCore.receiveShadow = true;

      const mTop = new THREE.Mesh(topCyl, matPrimary);
      mTop.position.y = seatH - bevH / 2;

      const mBot = new THREE.Mesh(botCyl, matPrimary);
      mBot.position.y = seatH - seatThick + bevH / 2;

      seatGroup.add(mCore, mTop, mBot);
      seatGroup.scale.set(W, 1, D);
      group.add(seatGroup);

      // Ring rangka bawah jok
      const apronCyl = new THREE.CylinderGeometry(0.36, 0.36, 0.022, 24);
      apronCyl.scale(W, 1, D);
      addPart(
        group,
        apronCyl,
        matSecondary,
        0,
        seatH - seatThick - 0.01,
        0,
        false,
      );

      // 2. 4 Kaki Splayed (Melebar keluar) + Sepatu Karet
      const legH = Math.max(0.1, seatH - seatThick);
      const legGeo = new THREE.CylinderGeometry(0.015, 0.011, legH + 0.006, 12);
      const glideGeo = new THREE.CylinderGeometry(0.012, 0.013, 0.008, 10);
      const topRX = W * 0.25;
      const topRZ = D * 0.25;
      const splay = 0.11;

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
          sx * (topRX + legH * 0.045),
          legH / 2,
          sz * (topRZ + legH * 0.045),
        );
        legMesh.rotation.z = -sx * splay;
        legMesh.rotation.x = sz * splay;

        addPart(
          group,
          glideGeo,
          sharedCasterMat,
          sx * (topRX + legH * 0.095),
          0.004,
          sz * (topRZ + legH * 0.095),
          false,
        );
      });

      // 3. Footrest Ring Melingkar di 34% ketinggian
      const ringY = legH * 0.34;
      const ringRadius = 0.31;
      const footrestGeo = new THREE.TorusGeometry(ringRadius, 0.008, 10, 28);
      footrestGeo.rotateX(Math.PI / 2);
      footrestGeo.scale(W, 1, D);
      addPart(group, footrestGeo, matSecondary, 0, ringY, 0, false);
    } else if (style === "office") {
      // 1. Kaki Bintang 5 Cabang + Roda (Casters)
      const casterR = 0.022;
      const hubY = casterR * 2 + 0.018;
      const baseRadius = Math.min(W, D) * 0.45;
      const spokeCount = 5;

      // Hub tengah
      addPart(
        group,
        new THREE.CylinderGeometry(0.036, 0.042, 0.036, 16),
        matSecondary,
        0,
        hubY,
        0,
      );

      const spokeLen = Math.max(0.12, baseRadius - 0.02);
      const spokeGeo = createRoundedBoxGeometry(
        0.026,
        0.022,
        spokeLen,
        0.006,
        0.003,
        0.003,
      );
      const wheelGeo = new THREE.CylinderGeometry(casterR, casterR, 0.024, 14);
      wheelGeo.rotateZ(Math.PI / 2);
      const hoodGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.018, 10);

      for (let i = 0; i < spokeCount; i++) {
        const angle = (i / spokeCount) * Math.PI * 2;
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);

        const armDist = spokeLen * 0.52;
        const armMesh = addPart(
          group,
          spokeGeo,
          matSecondary,
          sinA * armDist,
          hubY - 0.006,
          cosA * armDist,
        );
        armMesh.rotation.y = angle;
        armMesh.rotation.x = 0.08;

        // Roda di ujung tiap cabang kaki
        const tipDist = baseRadius - 0.012;
        const wx = sinA * tipDist;
        const wz = cosA * tipDist;
        addPart(
          group,
          hoodGeo,
          matSecondary,
          wx,
          casterR * 2 + 0.004,
          wz,
          false,
        );
        const wMesh = addPart(
          group,
          wheelGeo,
          sharedCasterMat,
          wx,
          casterR,
          wz,
          false,
        );
        wMesh.rotation.y = angle;
      }

      // 2. Gas-Lift Cylinder Bertingkat + Kotak Mekanik Bawah Jok
      const seatBottomY = seatH - seatThick / 2;
      const mechH = 0.028;
      const stemH = Math.max(0.08, seatBottomY - hubY - mechH);

      addPart(
        group,
        new THREE.CylinderGeometry(0.026, 0.028, stemH * 0.55, 14),
        matSecondary,
        0,
        hubY + stemH * 0.275,
        0,
      );
      addPart(
        group,
        new THREE.CylinderGeometry(0.016, 0.016, stemH * 0.5, 14),
        sharedCasterMat,
        0,
        hubY + stemH * 0.75,
        0,
      );
      addPart(
        group,
        createRoundedBoxGeometry(0.16, mechH, 0.18, 0.008, 0.003, 0.003),
        sharedCasterMat,
        0,
        seatBottomY - mechH / 2,
        -0.01,
        false,
      );

      // 3. Dudukan Empuk Ber-bevel
      const seatW = W * 0.84;
      const seatD = D * 0.84;
      addPart(
        group,
        createRoundedBoxGeometry(seatW, seatThick, seatD, 0.045, 0.015, 0.015),
        matPrimary,
        0,
        seatH,
        0.01,
      );

      // 4. Tulang Belakang Penghubung (J-Bar Spine) + Sandaran Miring
      const backH = Math.max(0.22, H - seatH - 0.04);
      const backZ = -seatD / 2 - 0.01;
      const backCenterY = seatH + 0.05 + backH / 2;

      // Spine vertikal di belakang sandaran
      const spineH = backCenterY - (seatBottomY - mechH * 0.6);
      addPart(
        group,
        createRoundedBoxGeometry(0.048, spineH, 0.024, 0.006, 0.003, 0.003),
        matSecondary,
        0,
        seatBottomY - mechH * 0.6 + spineH / 2,
        backZ - 0.024,
      );
      // Spine horizontal dari bawah jok ke belakang
      addPart(
        group,
        createRoundedBoxGeometry(
          0.052,
          0.022,
          seatD * 0.55,
          0.006,
          0.003,
          0.003,
        ),
        matSecondary,
        0,
        seatBottomY - mechH * 0.5,
        -seatD * 0.28,
        false,
      );

      // Panel Sandaran Ergonomis Miring
      const backMesh = addPart(
        group,
        createRoundedBoxGeometry(seatW * 0.9, backH, 0.042, 0.04, 0.014, 0.014),
        matPrimary,
        0,
        backCenterY,
        backZ,
      );
      backMesh.rotation.x = -0.14;

      // 5. T-Armrests Kiri & Kanan
      if (W >= 0.48) {
        const armY = seatH + Math.min(0.18, backH * 0.45);
        const armPostH = armY - seatBottomY;
        const armX = seatW / 2 + 0.022;
        const postGeo = new THREE.CylinderGeometry(0.012, 0.014, armPostH, 10);
        const padArmGeo = createRoundedBoxGeometry(
          0.036,
          0.02,
          seatD * 0.58,
          0.01,
          0.004,
          0.004,
        );

        [-1, 1].forEach((dir) => {
          addPart(
            group,
            postGeo,
            matSecondary,
            dir * armX,
            seatBottomY + armPostH / 2,
            0.01,
            false,
          );
          addPart(
            group,
            padArmGeo,
            sharedCasterMat,
            dir * armX,
            armY + 0.01,
            0.02,
            false,
          );
        });
      }
    } else {
      // --- KURSI STANDAR (SCANDINAVIAN / ARCHITECTURAL) ---
      const seatBottomY = seatH - seatThick / 2;

      // 1. Dudukan dengan Bevel Lembut + Apron Rangka Bawah
      addPart(
        group,
        createRoundedBoxGeometry(
          W * 0.96,
          seatThick,
          D * 0.96,
          0.032,
          0.012,
          0.012,
        ),
        matPrimary,
        0,
        seatH,
        0.008,
      );

      const apronH = 0.028;
      const apronY = seatBottomY - apronH / 2;
      const apW = W * 0.84;
      const apD = D * 0.84;
      const fbApron = new THREE.BoxGeometry(apW, apronH, 0.018);
      const lrApron = new THREE.BoxGeometry(0.018, apronH, apD);
      addPart(group, fbApron, matSecondary, 0, apronY, -apD / 2 + 0.01, false);
      addPart(group, fbApron, matSecondary, 0, apronY, apD / 2 - 0.01, false);
      addPart(group, lrApron, matSecondary, -apW / 2 + 0.01, apronY, 0, false);
      addPart(group, lrApron, matSecondary, apW / 2 - 0.01, apronY, 0, false);

      // 2. Kaki Depan (Splayed) + Tiang Belakang Menyatu ke Sandaran
      const legH = Math.max(0.1, seatBottomY);
      const offX = W / 2 - 0.032;
      const frontZ = D / 2 - 0.035;
      const backZ = -D / 2 + 0.035;

      const frontLegGeo = new THREE.CylinderGeometry(0.016, 0.012, legH, 12);
      [-1, 1].forEach((sx) => {
        const flMesh = addPart(
          group,
          frontLegGeo,
          matSecondary,
          sx * offX,
          legH / 2,
          frontZ,
        );
        flMesh.rotation.z = -sx * 0.05;
        flMesh.rotation.x = 0.05;
      });

      // Tiang belakang naik terus menjadi rangka sandaran (rake ke belakang)
      const backTotalH = Math.max(seatH + 0.2, H - 0.01);
      const backPostGeo = new THREE.CylinderGeometry(
        0.015,
        0.013,
        backTotalH,
        12,
      );
      [-1, 1].forEach((sx) => {
        const bpMesh = addPart(
          group,
          backPostGeo,
          matSecondary,
          sx * offX,
          backTotalH / 2,
          backZ - 0.012,
        );
        bpMesh.rotation.x = -0.07;
        bpMesh.rotation.z = -sx * 0.03;
      });

      // 3. Sandaran Punggung Atas (Top Backrest Rail dengan rongga terbuka di bawahnya)
      const backRailH = Math.min(0.15, Math.max(0.09, (H - seatH) * 0.38));
      const backRailY = H - backRailH / 2 - 0.015;
      const backRakeOffset = -Math.sin(0.07) * (backRailY - backTotalH / 2);
      const railMesh = addPart(
        group,
        createRoundedBoxGeometry(
          W * 0.96,
          backRailH,
          0.028,
          0.016,
          0.006,
          0.006,
        ),
        matPrimary,
        0,
        backRailY,
        backZ - 0.008 + backRakeOffset,
      );
      railMesh.rotation.x = -0.1;
    }
  },
};
