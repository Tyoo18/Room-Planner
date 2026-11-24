import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Box } from "lucide-react";
import { createWallPaintTexture } from "../utils/wallTexture";
import { TRANSLATIONS } from "../utils/i18n";

function remapInnerFaceUV(geometry, u0, u1, v0, v1) {
  const uvAttr = geometry.attributes.uv;
  for (let i = 16; i < 20; i++) {
    const origU = uvAttr.getX(i);
    const origV = uvAttr.getY(i);
    const mappedU = origU < 0.5 ? u0 : u1;
    const mappedV = origV < 0.5 ? v0 : v1;
    uvAttr.setXY(i, mappedU, mappedV);
  }
  uvAttr.needsUpdate = true;
}

export default function RoomViewport({
  isRoomCreated,
  room,
  walls,
  door,
  autoHideWalls,
  cameraCommand,
  onCameraManualMove,
  theme = "light",
  lang = "id",
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
  const isDark = theme === "dark";

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const roomGroupRef = useRef(null);
  const gridHelperRef = useRef(null);
  const hemiLightRef = useRef(null);
  const wallGroupsRef = useRef({});
  const autoHideRef = useRef(autoHideWalls);
  const onManualMoveRef = useRef(onCameraManualMove);

  const latestDataRef = useRef({ isRoomCreated, room, door });
  useEffect(() => {
    latestDataRef.current = { isRoomCreated, room, door };
  }, [isRoomCreated, room, door]);

  useEffect(() => {
    autoHideRef.current = autoHideWalls;
  }, [autoHideWalls]);

  useEffect(() => {
    onManualMoveRef.current = onCameraManualMove;
  }, [onCameraManualMove]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef0f3");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / container.clientHeight,
      0.05,
      100,
    );
    camera.position.set(4.5, 4.2, 5.2);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight("#ffffff", 1.15);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight("#ffffff", "#e2e8f0", 0.65);
    hemiLight.position.set(0, 6, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight("#fffdf8", 0.45);
    dirLight.position.set(4, 9, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    const d = 6;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(16, 32, "#cbd5e1", "#e2e8f0");
    gridHelper.position.y = -0.002;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    const roomGroup = new THREE.Group();
    scene.add(roomGroup);
    roomGroupRef.current = roomGroup;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 1.1, 0);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 0.4;
    controls.maxDistance = 20;
    controls.update();
    controlsRef.current = controls;

    const handleControlStart = () => {
      if (onManualMoveRef.current) {
        onManualMoveRef.current();
      }
    };
    controls.addEventListener("start", handleControlStart);

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    let animId;
    const wallWorldPos = new THREE.Vector3();
    const wallNormal = new THREE.Vector3();
    const toCamera = new THREE.Vector3();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      const wallMap = wallGroupsRef.current;
      Object.values(wallMap).forEach((wg) => {
        if (!autoHideRef.current) {
          wg.visible = true;
          return;
        }
        wg.getWorldPosition(wallWorldPos);
        wallNormal.set(0, 0, 1).applyQuaternion(wg.quaternion);
        toCamera.subVectors(camera.position, wallWorldPos);
        wg.visible = wallNormal.dot(toCamera) > -0.05;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      controls.removeEventListener("start", handleControlStart);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    scene.background = new THREE.Color(isDark ? "#141518" : "#eef0f3");

    if (hemiLightRef.current) {
      hemiLightRef.current.groundColor.set(isDark ? "#27272a" : "#e2e8f0");
      hemiLightRef.current.intensity = isDark ? 0.52 : 0.65;
    }

    if (gridHelperRef.current) {
      scene.remove(gridHelperRef.current);
      gridHelperRef.current.geometry.dispose();
      if (Array.isArray(gridHelperRef.current.material)) {
        gridHelperRef.current.material.forEach((m) => m.dispose());
      } else {
        gridHelperRef.current.material.dispose();
      }
    }

    const nextGrid = isDark
      ? new THREE.GridHelper(16, 32, "#2e3038", "#202228")
      : new THREE.GridHelper(16, 32, "#cbd5e1", "#e2e8f0");
    nextGrid.position.y = -0.002;
    scene.add(nextGrid);
    gridHelperRef.current = nextGrid;
  }, [isDark]);

  useEffect(() => {
    const roomGroup = roomGroupRef.current;
    if (!roomGroup) return;

    while (roomGroup.children.length > 0) {
      const child = roomGroup.children[0];
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else {
            if (obj.material.map) obj.material.map.dispose();
            obj.material.dispose();
          }
        }
      });
      roomGroup.remove(child);
    }

    wallGroupsRef.current = {};

    if (!isRoomCreated) return;

    const W = room.width / 100;
    const L = room.length / 100;
    const H = room.height / 100;
    const T = room.thickness / 100;

    const floorGeo = new THREE.BoxGeometry(W, 0.04, L);
    const floorMat = new THREE.MeshStandardMaterial({
      color: "#e7e2d8",
      roughness: 0.85,
      metalness: 0.05,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.02, 0);
    floorMesh.receiveShadow = true;
    roomGroup.add(floorMesh);

    const floorEdges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(W, L));
    const floorOutline = new THREE.LineSegments(
      floorEdges,
      new THREE.LineBasicMaterial({ color: "#94a3b8" }),
    );
    floorOutline.rotation.x = -Math.PI / 2;
    floorOutline.position.y = 0.001;
    roomGroup.add(floorOutline);

    const wallSpecs = [
      {
        id: "front",
        innerWidth: W,
        cornerExt: T,
        pos: [0, 0, L / 2],
        rotY: Math.PI,
      },
      {
        id: "back",
        innerWidth: W,
        cornerExt: T,
        pos: [0, 0, -L / 2],
        rotY: 0,
      },
      {
        id: "left",
        innerWidth: L,
        cornerExt: 0,
        pos: [-W / 2, 0, 0],
        rotY: Math.PI / 2,
      },
      {
        id: "right",
        innerWidth: L,
        cornerExt: 0,
        pos: [W / 2, 0, 0],
        rotY: -Math.PI / 2,
      },
    ];

    const newWallGroups = {};

    wallSpecs.forEach((spec) => {
      const wg = new THREE.Group();
      wg.position.set(...spec.pos);
      wg.rotation.y = spec.rotY;

      const paintTexture = createWallPaintTexture(walls[spec.id]);
      const innerPaintMat = new THREE.MeshStandardMaterial({
        map: paintTexture,
        roughness: 0.92,
        metalness: 0.0,
      });
      // Samakan semua sisi luar & pinggiran tembok agar sudut luar tidak belang
      const outerPlasterMat = new THREE.MeshStandardMaterial({
        color: "#cbd5e1",
        roughness: 0.95,
      });

      const wallMaterials = [
        outerPlasterMat,
        outerPlasterMat,
        outerPlasterMat,
        outerPlasterMat,
        innerPaintMat,
        outerPlasterMat,
      ];

      const wLeft = -spec.innerWidth / 2 - spec.cornerExt;
      const wRight = spec.innerWidth / 2 + spec.cornerExt;

      const addWallBlock = (x0, x1, y0, y1) => {
        const segW = x1 - x0;
        const segH = y1 - y0;
        if (segW <= 0.001 || segH <= 0.001) return;

        const geo = new THREE.BoxGeometry(segW, segH, T);
        const u0 = (x0 - -spec.innerWidth / 2) / spec.innerWidth;
        const u1 = (x1 - -spec.innerWidth / 2) / spec.innerWidth;
        const v0 = y0 / H;
        const v1 = y1 / H;
        remapInnerFaceUV(geo, u0, u1, v0, v1);

        const mesh = new THREE.Mesh(geo, wallMaterials);
        mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, -T / 2);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        wg.add(mesh);
      };

      if (spec.id !== "front") {
        addWallBlock(wLeft, wRight, 0, H);
      } else {
        const dW = Math.min(door.width / 100, spec.innerWidth - 0.1);
        const dH = Math.min(door.height / 100, H - 0.05);
        const maxOffsetM = Math.max(0, spec.innerWidth - dW);
        const offsetM = Math.min(door.offset / 100, maxOffsetM);

        const doorLocalRight = spec.innerWidth / 2 - offsetM;
        const doorLocalLeft = doorLocalRight - dW;

        addWallBlock(wLeft, doorLocalLeft, 0, H);
        addWallBlock(doorLocalRight, wRight, 0, H);
        addWallBlock(doorLocalLeft, doorLocalRight, dH, H);

        // Kusen
        const frameMat = new THREE.MeshStandardMaterial({
          color: "#78553a",
          roughness: 0.7,
        });
        const frameThick = 0.035;
        const frameDepth = T + 0.015;

        const leftJamb = new THREE.Mesh(
          new THREE.BoxGeometry(frameThick, dH, frameDepth),
          frameMat,
        );
        leftJamb.position.set(doorLocalLeft + frameThick / 2, dH / 2, -T / 2);
        wg.add(leftJamb);

        const rightJamb = new THREE.Mesh(
          new THREE.BoxGeometry(frameThick, dH, frameDepth),
          frameMat,
        );
        rightJamb.position.set(doorLocalRight - frameThick / 2, dH / 2, -T / 2);
        wg.add(rightJamb);

        const topJamb = new THREE.Mesh(
          new THREE.BoxGeometry(dW, frameThick, frameDepth),
          frameMat,
        );
        topJamb.position.set(
          (doorLocalLeft + doorLocalRight) / 2,
          dH - frameThick / 2,
          -T / 2,
        );
        wg.add(topJamb);

        // Daun Pintu
        const leafWidth = dW - frameThick * 2;
        const leafHeight = dH - frameThick;
        const leafThick = 0.04;

        const hingeGroup = new THREE.Group();
        const hingeX =
          door.hinge === "left"
            ? doorLocalRight - frameThick
            : doorLocalLeft + frameThick;
        const hingeZ = door.swing === "inward" ? -0.02 : -T + 0.02;
        hingeGroup.position.set(hingeX, 0, hingeZ);

        const leafGeo = new THREE.BoxGeometry(leafWidth, leafHeight, leafThick);
        const leafMat = new THREE.MeshStandardMaterial({
          color: "#9a6e4c",
          roughness: 0.65,
        });
        const leafMesh = new THREE.Mesh(leafGeo, leafMat);
        leafMesh.position.set(
          door.hinge === "left" ? -leafWidth / 2 : leafWidth / 2,
          leafHeight / 2,
          0,
        );
        leafMesh.castShadow = true;
        hingeGroup.add(leafMesh);

        const handleMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, 0.025, 0.08),
          new THREE.MeshStandardMaterial({
            color: "#27272a",
            metalness: 0.7,
            roughness: 0.3,
          }),
        );
        handleMesh.position.set(
          door.hinge === "left" ? -(leafWidth - 0.1) : leafWidth - 0.1,
          0.95,
          0,
        );
        hingeGroup.add(handleMesh);

        const openAngle = Math.PI / 2;
        if (door.hinge === "left") {
          hingeGroup.rotation.y =
            door.swing === "inward" ? openAngle : -openAngle;
        } else {
          hingeGroup.rotation.y =
            door.swing === "inward" ? -openAngle : openAngle;
        }
        wg.add(hingeGroup);

        // Garis lengkung ayunan pintu
        const swingRadius = leafWidth;
        const arcPoints = [];
        const segments = 24;

        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * (Math.PI / 2);
          let px = 0;
          let pz = 0;
          if (door.hinge === "left") {
            px = hingeX - Math.cos(theta) * swingRadius;
            pz =
              door.swing === "inward"
                ? hingeZ + Math.sin(theta) * swingRadius
                : hingeZ - Math.sin(theta) * swingRadius;
          } else {
            px = hingeX + Math.cos(theta) * swingRadius;
            pz =
              door.swing === "inward"
                ? hingeZ + Math.sin(theta) * swingRadius
                : hingeZ - Math.sin(theta) * swingRadius;
          }
          arcPoints.push(new THREE.Vector3(px, 0.005, pz));
        }
        arcPoints.push(new THREE.Vector3(hingeX, 0.005, hingeZ));

        const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
        const arcLine = new THREE.Line(
          arcGeo,
          new THREE.LineBasicMaterial({
            color: "#3b82f6",
            transparent: true,
            opacity: 0.7,
          }),
        );
        wg.add(arcLine);
      }

      roomGroup.add(wg);
      newWallGroups[spec.id] = wg;
    });

    wallGroupsRef.current = newWallGroups;
  }, [isRoomCreated, room, walls, door]);

  useEffect(() => {
    if (!cameraCommand || !cameraRef.current || !controlsRef.current) return;

    const { isRoomCreated: created, room: r, door: d } = latestDataRef.current;
    if (!created) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const W = r.width / 100;
    const L = r.length / 100;
    const H = r.height / 100;

    if (cameraCommand.type === "iso") {
      const dist = Math.max(W, L, H) * 1.45;
      camera.position.set(dist, dist * 0.95, dist * 1.15);
      controls.target.set(0, H * 0.4, 0);
    } else if (cameraCommand.type === "top") {
      const dist = Math.max(W, L) * 1.65;
      camera.position.set(0, dist, 0.01);
      controls.target.set(0, 0, 0);
    } else if (cameraCommand.type === "door") {
      const wg = wallGroupsRef.current.front;
      if (wg) {
        const dW = Math.min(d.width / 100, W - 0.1);
        const maxOffsetM = Math.max(0, W - dW);
        const offsetM = Math.min(d.offset / 100, maxOffsetM);
        const doorCenterLocalX = W / 2 - offsetM - dW / 2;

        const eyeHeight = Math.min(1.6, H - 0.25);
        const worldEyePos = wg.localToWorld(
          new THREE.Vector3(doorCenterLocalX, eyeHeight, 0.18),
        );
        camera.position.copy(worldEyePos);
        controls.target.set(0, eyeHeight * 0.85, 0);
      }
    }

    controls.update();
  }, [cameraCommand]);

  return (
    <div className="relative h-full w-full flex-1 overflow-hidden">
      <div ref={containerRef} className="h-full w-full" />

      {!isRoomCreated && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
          <div
            className={`max-w-xs rounded-2xl border p-5 text-center shadow-lg backdrop-blur-xs transition-colors ${
              isDark
                ? "border-zinc-800 bg-zinc-900/90 text-zinc-100"
                : "border-zinc-200/90 bg-white/90 text-zinc-900"
            }`}
          >
            <div
              className={`mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl ${
                isDark
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              <Box className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold">{t.emptyTitle}</h3>
            <p
              className={`mt-1 text-xs leading-relaxed ${
                isDark ? "text-zinc-400" : "text-zinc-500"
              }`}
            >
              {t.emptyDesc1}{" "}
              <span
                className={`font-semibold ${isDark ? "text-zinc-200" : "text-zinc-700"}`}
              >
                {t.createRoomBtn}
              </span>
              .
            </p>
          </div>
        </div>
      )}

      {isRoomCreated && (
        <div
          className={`pointer-events-none absolute bottom-4 left-4 rounded-xl border px-3 py-2 text-[11px] shadow-xs backdrop-blur-xs transition-colors ${
            isDark
              ? "border-zinc-800 bg-zinc-900/85 text-zinc-300"
              : "border-zinc-200/80 bg-white/85 text-zinc-600"
          }`}
        >
          <span
            className={`font-semibold ${isDark ? "text-zinc-100" : "text-zinc-800"}`}
          >
            {t.controlsHintTitle}
          </span>{" "}
          {t.controlsHintBody}
        </div>
      )}
    </div>
  );
}
