import * as THREE from "three";
import {
  getFurnitureWorldAABB,
  clampFurnitureToRoom,
  snapFurniturePosition,
  getWallDistancesCm,
  testOBBOverlap,
} from "./helpers";
import { bedModule } from "./bed";
import { deskModule, getLDeskDimensionsM } from "./desk";
import { chairModule } from "./chair";
import { wardrobeModule } from "./wardrobe";
import { shelfModule } from "./shelf";
import { carpetModule } from "./carpet";

export {
  getLDeskDimensionsM,
  getFurnitureWorldAABB,
  clampFurnitureToRoom,
  snapFurniturePosition,
  getWallDistancesCm,
};

export const FURNITURE_REGISTRY = {
  bed: bedModule,
  desk: deskModule,
  chair: chairModule,
  wardrobe: wardrobeModule,
  shelf: shelfModule,
  carpet: carpetModule,
};

export const ROOM_ZONES = [
  { id: "sleep", titleKey: "zoneSleep", types: ["bed"] },
  { id: "work", titleKey: "zoneWork", types: ["desk", "chair"] },
  { id: "storage", titleKey: "zoneStorage", types: ["wardrobe", "shelf"] },
  { id: "floorDecor", titleKey: "zoneFloorDecor", types: ["carpet"] },
];

export function createDefaultFurniture(type, variant = {}) {
  const id = `furn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const mod = FURNITURE_REGISTRY[type] || chairModule;
  return mod.createDefault(id, variant);
}

export function getFurnitureItemLabel(item, t) {
  const mod = FURNITURE_REGISTRY[item.type];
  return mod ? mod.getItemLabel(item, t) : item.type;
}

export function getFurnitureColorLabels(item, t) {
  const mod = FURNITURE_REGISTRY[item.type];
  if (mod?.getColorLabels) {
    return mod.getColorLabels(item, t);
  }
  return { color1: t.paintColor, color2: null };
}

export function getFurnitureLocalBoxes(item) {
  const mod = FURNITURE_REGISTRY[item.type];
  if (mod?.getLocalBoxes) {
    const customBoxes = mod.getLocalBoxes(item);
    if (customBoxes) return customBoxes;
  }
  const w = item.width / 100;
  const d = item.depth / 100;
  return [{ cx: 0, cz: 0, w, d }];
}

function getWorldOrientedBoxes(item) {
  const rad = ((item.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ix = item.x / 100;
  const iz = item.z / 100;

  return getFurnitureLocalBoxes(item).map((box) => {
    const wx = ix + (box.cx * cos + box.cz * sin);
    const wz = iz + (-box.cx * sin + box.cz * cos);
    return {
      cx: wx,
      cz: wz,
      halfW: box.w / 2,
      halfD: box.d / 2,
      cos,
      sin,
    };
  });
}

export function checkFurnitureConflicts(
  item,
  allFurnitures,
  roomWidthCm,
  roomLengthCm,
  door,
) {
  const modA = FURNITURE_REGISTRY[item.type];
  if (modA?.ignoreCollision) {
    return { hasOverlap: false, hasDoorBlock: false };
  }

  const boxesA = getWorldOrientedBoxes(item);
  let hasOverlap = false;

  for (const other of allFurnitures) {
    if (other.id === item.id) continue;
    const modB = FURNITURE_REGISTRY[other.type];
    if (modB?.ignoreCollision) continue;

    const boxesB = getWorldOrientedBoxes(other);
    for (const bA of boxesA) {
      for (const bB of boxesB) {
        if (testOBBOverlap(bA, bB)) {
          hasOverlap = true;
          break;
        }
      }
      if (hasOverlap) break;
    }
    if (hasOverlap) break;
  }

  let hasDoorBlock = false;
  if (door.swing === "inward") {
    const W = roomWidthCm / 100;
    const L = roomLengthCm / 100;
    const dW = Math.min(door.width / 100, W - 0.1);
    const maxOffsetM = Math.max(0, W - dW);
    const offsetM = Math.min(door.offset / 100, maxOffsetM);

    const doorLocalRight = W / 2 - offsetM;
    const doorLocalLeft = doorLocalRight - dW;
    const frameThick = 0.035;
    const hingeLocalX =
      door.hinge === "left"
        ? doorLocalRight - frameThick
        : doorLocalLeft + frameThick;
    const hingeWorldX = -hingeLocalX;
    const hingeWorldZ = L / 2 - 0.02;
    const swingRadius = Math.max(0.2, dW - frameThick * 2);

    for (const box of boxesA) {
      const relX = hingeWorldX - box.cx;
      const relZ = hingeWorldZ - box.cz;
      const localX = relX * box.cos - relZ * box.sin;
      const localZ = relX * box.sin + relZ * box.cos;

      const clampedX = Math.max(-box.halfW, Math.min(box.halfW, localX));
      const clampedZ = Math.max(-box.halfD, Math.min(box.halfD, localZ));

      const distX = localX - clampedX;
      const distZ = localZ - clampedZ;
      const distSq = distX * distX + distZ * distZ;

      if (distSq < (swingRadius - 0.02) * (swingRadius - 0.02)) {
        hasDoorBlock = true;
        break;
      }
    }
  }

  return { hasOverlap, hasDoorBlock };
}

export function buildFurnitureGroup(
  item,
  { isSelected = false, hasConflict = false } = {},
) {
  const group = new THREE.Group();
  group.userData.furnitureId = item.id;

  const W = item.width / 100;
  const D = item.depth / 100;
  const H = item.height / 100;

  const matPrimary = new THREE.MeshStandardMaterial({
    color: item.color1 || "#e2e8f0",
    roughness: 0.78,
    metalness: 0.04,
  });

  const matSecondary = new THREE.MeshStandardMaterial({
    color: item.color2 || "#334155",
    roughness: 0.72,
    metalness: 0.08,
  });

  const mod = FURNITURE_REGISTRY[item.type];
  if (mod) {
    mod.buildMesh(group, item, { matPrimary, matSecondary }, { W, D, H });
  }

  if (isSelected || hasConflict) {
    const boxes = getFurnitureLocalBoxes(item);
    const outlineColor = hasConflict
      ? "#ef4444"
      : item.locked
        ? "#f59e0b"
        : "#2563eb";
    boxes.forEach((b) => {
      const pad = 0.025;
      const rectGeo = new THREE.EdgesGeometry(
        new THREE.PlaneGeometry(b.w + pad * 2, b.d + pad * 2),
      );
      const line = new THREE.LineSegments(
        rectGeo,
        new THREE.LineBasicMaterial({ color: outlineColor }),
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(b.cx, 0.006, b.cz);
      group.add(line);
    });
  }

  group.position.set(item.x / 100, 0, item.z / 100);
  group.rotation.y = ((item.rotation || 0) * Math.PI) / 180;

  return group;
}
