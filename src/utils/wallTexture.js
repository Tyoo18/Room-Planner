import * as THREE from "three";

export function createWallPaintTexture(paintConfig) {
  const { mode, color1, color2, splitRatio } = paintConfig;
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (mode === "full") {
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (mode === "split-h") {
    // Bulatkan ke piksel utuh agar bebas anti-aliasing
    const bottomHeight = Math.round((splitRatio / 100) * canvas.height);
    const topHeight = canvas.height - bottomHeight;

    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, canvas.width, topHeight);

    ctx.fillStyle = color2;
    ctx.fillRect(0, topHeight, canvas.width, bottomHeight);
  } else if (mode === "split-v") {
    const leftWidth = Math.round((splitRatio / 100) * canvas.width);
    const rightWidth = canvas.width - leftWidth;

    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, leftWidth, canvas.height);

    ctx.fillStyle = color2;
    ctx.fillRect(leftWidth, 0, rightWidth, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  // Matikan mipmap agar garis batas cat tetap tajam & tidak nge-blur saat dilihat dari sudut miring
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}
