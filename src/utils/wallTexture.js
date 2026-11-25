import * as THREE from "three";

export function createWallPaintTexture(wall = {}) {
  const mode = wall.mode || "full";
  const color1 = wall.color1 || "#F5F3EE";
  const color2 = wall.color2 || "#D8D2C7";
  const splitRatio = Math.max(5, Math.min(95, Number(wall.splitRatio ?? 50)));

  // Cat full cukup 128x128; pola split pakai 512x512 agar batas garis tetap tajam
  const size = mode === "full" ? 128 : 512;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (mode === "split-h") {
    // splitRatio dihitung dari lantai (bawah), sedangkan Y=0 di Canvas adalah atas
    const splitY = Math.round(size * (1 - splitRatio / 100));
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, size, splitY);
    ctx.fillStyle = color2;
    ctx.fillRect(0, splitY, size, size - splitY);
  } else if (mode === "split-v") {
    const splitX = Math.round(size * (splitRatio / 100));
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, splitX, size);
    ctx.fillStyle = color2;
    ctx.fillRect(splitX, 0, size - splitX, size);
  } else {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
