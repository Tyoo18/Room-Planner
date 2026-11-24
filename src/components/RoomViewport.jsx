import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Box } from "lucide-react";
import { createWallPaintTexture } from "../utils/wallTexture";
import {
  buildFurnitureGroup,
  clampFurnitureToRoom,
  snapFurniturePosition,
  getFurnitureWorldAABB,
} from "../utils/furnitureGeometry";
// ✅ NEW — sesuaikan path jika berbeda
// import { buildWallElementGroup } from "../utils/wallElementGeometry";
import { buildWallElementGroup, getWallWidthCm } from "../wallElements";
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

function disposeGroupChildren(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
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
    group.remove(child);
  }
}

export default function RoomViewport({
  isRoomCreated,
  room,
  walls,
  door,
  furnitures,
  selectedFurnitureId,
  conflictIds,
  onSelectFurniture,
  onFurnitureDragStart,
  onFurnitureDragEnd,
  onMoveFurniture,
  // ✅ PROPS BARU: Wall Elements
  wallElements = [],
  selectedWallElementId,
  wallElementConflictIds,
  onSelectWallElement,
  // ─────────────────────────────
  snapEnabled = true,
  viewMode = "3d",
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
  const perspCameraRef = useRef(null);
  const orthoCameraRef = useRef(null);
  const activeCameraRef = useRef(null);
  const controlsRef = useRef(null);
  const roomGroupRef = useRef(null);
  const furnitureGroupRef = useRef(null);
  const guideGroupRef = useRef(null);
  const gridHelperRef = useRef(null);
  const hemiLightRef = useRef(null);
  const wallGroupsRef = useRef({});
  const wallElementGroupsRef = useRef({}); // ✅ NEW

  const autoHideRef = useRef(autoHideWalls);
  const viewModeRef = useRef(viewMode);
  const snapEnabledRef = useRef(snapEnabled);
  const onManualMoveRef = useRef(onCameraManualMove);
  const onSelectFurnRef = useRef(onSelectFurniture);
  const onSelectWallElRef = useRef(onSelectWallElement); // ✅ NEW
  const onDragStartRef = useRef(onFurnitureDragStart);
  const onDragEndRef = useRef(onFurnitureDragEnd);
  const onMoveFurnRef = useRef(onMoveFurniture);

  const latestDataRef = useRef({ isRoomCreated, room, door, furnitures });
  useEffect(() => {
    latestDataRef.current = { isRoomCreated, room, door, furnitures };
  }, [isRoomCreated, room, door, furnitures]);

  useEffect(() => {
    autoHideRef.current = autoHideWalls;
  }, [autoHideWalls]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    snapEnabledRef.current = snapEnabled;
  }, [snapEnabled]);

  useEffect(() => {
    onManualMoveRef.current = onCameraManualMove;
    onSelectFurnRef.current = onSelectFurniture;
    onSelectWallElRef.current = onSelectWallElement; // ✅ NEW
    onDragStartRef.current = onFurnitureDragStart;
    onDragEndRef.current = onFurnitureDragEnd;
    onMoveFurnRef.current = onMoveFurniture;
  }, [
    onCameraManualMove,
    onSelectFurniture,
    onSelectWallElement, // ✅ NEW
    onFurnitureDragStart,
    onFurnitureDragEnd,
    onMoveFurniture,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eef0f3");
    sceneRef.current = scene;

    const aspect = container.clientWidth / container.clientHeight;
    const perspCamera = new THREE.PerspectiveCamera(48, aspect, 0.05, 100);
    perspCamera.position.set(4.5, 4.2, 5.2);
    perspCameraRef.current = perspCamera;

    const frustumHalf = 3.2;
    const orthoCamera = new THREE.OrthographicCamera(
      -frustumHalf * aspect,
      frustumHalf * aspect,
      frustumHalf,
      -frustumHalf,
      0.1,
      50,
    );
    orthoCamera.position.set(0, 10, 0);
    orthoCamera.up.set(0, 0, -1);
    orthoCamera.lookAt(0, 0, 0);
    orthoCameraRef.current = orthoCamera;

    activeCameraRef.current = perspCamera;

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

    const furnitureGroup = new THREE.Group();
    scene.add(furnitureGroup);
    furnitureGroupRef.current = furnitureGroup;

    const guideGroup = new THREE.Group();
    scene.add(guideGroup);
    guideGroupRef.current = guideGroup;

    const controls = new OrbitControls(perspCamera, renderer.domElement);
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

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const planeHit = new THREE.Vector3();

    let draggingId = null;
    let dragOffset = { x: 0, z: 0 };
    let dragInitialPos = { x: 0, z: 0 };
    let pointerDownPos = { x: 0, y: 0 };
    let didPointerMove = false;
    let didHitObject = false; // ✅ NEW — agar klik wall element tidak auto-deselect

    const getNdcFromEvent = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const findFurnitureIdFromHit = (object) => {
      let curr = object;
      while (curr) {
        if (curr.userData && curr.userData.furnitureId) {
          return curr.userData.furnitureId;
        }
        curr = curr.parent;
      }
      return null;
    };

    // ✅ NEW — cari wallElementId dari hasil raycast
    const findWallElementIdFromHit = (object) => {
      let curr = object;
      while (curr) {
        if (curr.userData && curr.userData.wallElementId) {
          return curr.userData.wallElementId;
        }
        curr = curr.parent;
      }
      return null;
    };

    const handlePointerDown = (e) => {
      if (e.button !== 0 || !latestDataRef.current.isRoomCreated) return;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      didPointerMove = false;
      didHitObject = false; // ✅ reset

      getNdcFromEvent(e);
      raycaster.setFromCamera(pointerNdc, activeCameraRef.current);

      const hits = raycaster.intersectObjects(furnitureGroup.children, true);
      if (hits.length > 0) {
        // ✅ NEW — prioritaskan furniture non-carpet
        const solidHit = hits.find((h) => {
          const id = findFurnitureIdFromHit(h.object);
          const item = latestDataRef.current.furnitures.find(
            (f) => f.id === id,
          );
          return item && item.type !== "carpet";
        });
        const chosenHit = solidHit || hits[0];

        const hitId = findFurnitureIdFromHit(chosenHit.object);
        const item = latestDataRef.current.furnitures.find(
          (f) => f.id === hitId,
        );
        if (item) {
          didHitObject = true; // ✅
          if (onSelectFurnRef.current) {
            onSelectFurnRef.current(item.id);
          }
          if (
            !item.locked &&
            raycaster.ray.intersectPlane(floorPlane, planeHit)
          ) {
            draggingId = item.id;
            dragInitialPos = { x: item.x, z: item.z };
            dragOffset = {
              x: item.x / 100 - planeHit.x,
              z: item.z / 100 - planeHit.z,
            };
            if (onDragStartRef.current) {
              onDragStartRef.current();
            }
            controls.enabled = false;
            renderer.domElement.style.cursor = "grabbing";
          }
        }
        return; // ✅ jangan cek wall element saat furniture ter-hit
      }

      // ✅ NEW — tidak ada furniture, cek wall element
      const wallElHits = raycaster.intersectObjects(
        Object.values(wallElementGroupsRef.current),
        true,
      );
      if (wallElHits.length > 0) {
        const hitWallElId = findWallElementIdFromHit(wallElHits[0].object);
        if (hitWallElId) {
          didHitObject = true;
          if (onSelectWallElRef.current) {
            onSelectWallElRef.current(hitWallElId);
          }
        }
      }
    };

    const handlePointerMove = (e) => {
      const dist = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y,
      );
      if (dist > 4) didPointerMove = true;

      if (!draggingId) {
        if (!latestDataRef.current.isRoomCreated) return;
        getNdcFromEvent(e);
        raycaster.setFromCamera(pointerNdc, activeCameraRef.current);
        const hoverHits = raycaster.intersectObjects(
          furnitureGroup.children,
          true,
        );
        if (hoverHits.length > 0) {
          // ✅ NEW — solidHit / chosenHit untuk hover juga
          const solidHit = hoverHits.find((h) => {
            const id = findFurnitureIdFromHit(h.object);
            const item = latestDataRef.current.furnitures.find(
              (f) => f.id === id,
            );
            return item && item.type !== "carpet";
          });
          const chosenHit = solidHit || hoverHits[0];
          const hId = findFurnitureIdFromHit(chosenHit.object);
          const hItem = latestDataRef.current.furnitures.find(
            (f) => f.id === hId,
          );
          renderer.domElement.style.cursor = hItem?.locked
            ? "not-allowed"
            : "grab";
        } else {
          // ✅ NEW — hover wall element → cursor pointer
          const wallElHits = raycaster.intersectObjects(
            Object.values(wallElementGroupsRef.current),
            true,
          );
          renderer.domElement.style.cursor =
            wallElHits.length > 0 ? "pointer" : "auto";
        }
        return;
      }

      getNdcFromEvent(e);
      raycaster.setFromCamera(pointerNdc, activeCameraRef.current);

      if (raycaster.ray.intersectPlane(floorPlane, planeHit)) {
        const { room: r, furnitures: list } = latestDataRef.current;
        const item = list.find((f) => f.id === draggingId);
        if (!item || item.locked) return;

        const snapStep = e.shiftKey ? 5 : 1;
        const rawX =
          Math.round(((planeHit.x + dragOffset.x) * 100) / snapStep) * snapStep;
        const rawZ =
          Math.round(((planeHit.z + dragOffset.z) * 100) / snapStep) * snapStep;

        const candidate = { ...item, x: rawX, z: rawZ };
        const finalPos =
          snapEnabledRef.current && !e.altKey
            ? snapFurniturePosition(candidate, list, r.width, r.length, 8)
            : clampFurnitureToRoom(candidate, r.width, r.length);

        if (onMoveFurnRef.current) {
          onMoveFurnRef.current(draggingId, finalPos.x, finalPos.z);
        }
      }
    };

    const handlePointerUp = () => {
      if (draggingId) {
        const currentItem = latestDataRef.current.furnitures.find(
          (f) => f.id === draggingId,
        );
        const changed =
          currentItem &&
          (currentItem.x !== dragInitialPos.x ||
            currentItem.z !== dragInitialPos.z);

        if (onDragEndRef.current) {
          onDragEndRef.current(Boolean(changed));
        }

        draggingId = null;
        controls.enabled = true;
        renderer.domElement.style.cursor = "auto";
        return;
      }

      // ✅ NEW — klik ruang kosong: deselect furniture & wall element
      if (
        !didPointerMove &&
        !didHitObject &&
        latestDataRef.current.isRoomCreated
      ) {
        if (onSelectFurnRef.current) onSelectFurnRef.current(null);
        if (onSelectWallElRef.current) onSelectWallElRef.current(null);
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    const resizeObserver = new ResizeObserver(() => {
      if (
        !container ||
        container.clientWidth === 0 ||
        container.clientHeight === 0
      )
        return;
      const nextAspect = container.clientWidth / container.clientHeight;

      perspCamera.aspect = nextAspect;
      perspCamera.updateProjectionMatrix();

      const halfH = (orthoCamera.top - orthoCamera.bottom) / 2;
      orthoCamera.left = -halfH * nextAspect;
      orthoCamera.right = halfH * nextAspect;
      orthoCamera.updateProjectionMatrix();

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

      const is2D = viewModeRef.current === "2d";
      const wallMap = wallGroupsRef.current;

      Object.values(wallMap).forEach((wg) => {
        if (is2D || !autoHideRef.current) {
          wg.visible = true;
          return;
        }
        wg.getWorldPosition(wallWorldPos);
        wallNormal.set(0, 0, 1).applyQuaternion(wg.quaternion);
        toCamera.subVectors(perspCamera.position, wallWorldPos);
        wg.visible = wallNormal.dot(toCamera) > -0.05;
      });

      renderer.render(scene, activeCameraRef.current);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      domEl.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      controls.removeEventListener("start", handleControlStart);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (domEl && container.contains(domEl)) {
        container.removeChild(domEl);
      }
    };
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    const perspCamera = perspCameraRef.current;
    const orthoCamera = orthoCameraRef.current;
    const container = containerRef.current;
    if (!controls || !perspCamera || !orthoCamera || !container) return;

    const { room: r } = latestDataRef.current;
    const maxSpanM = Math.max(r.width, r.length) / 100;

    if (viewMode === "2d") {
      const aspect = Math.max(
        0.5,
        container.clientWidth / Math.max(1, container.clientHeight),
      );
      const halfH = Math.max(1.8, maxSpanM * 0.72);
      orthoCamera.left = -halfH * aspect;
      orthoCamera.right = halfH * aspect;
      orthoCamera.top = halfH;
      orthoCamera.bottom = -halfH;
      orthoCamera.zoom = 1;
      orthoCamera.position.set(0, 12, 0);
      orthoCamera.up.set(0, 0, -1);
      orthoCamera.lookAt(0, 0, 0);
      orthoCamera.updateProjectionMatrix();

      activeCameraRef.current = orthoCamera;
      controls.object = orthoCamera;
      controls.target.set(0, 0, 0);
      controls.enableRotate = false;
      controls.minZoom = 0.4;
      controls.maxZoom = 5;
      controls.update();
    } else {
      activeCameraRef.current = perspCamera;
      controls.object = perspCamera;
      controls.enableRotate = true;
      controls.update();
    }
  }, [viewMode]);

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

    disposeGroupChildren(roomGroup);
    wallGroupsRef.current = {};
    wallElementGroupsRef.current = {}; // ✅ NEW — reset container map

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
      { id: "back", innerWidth: W, cornerExt: T, pos: [0, 0, -L / 2], rotY: 0 },
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
    const newWallElementGroups = {}; // ✅ NEW

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

      // ✅ NEW — container untuk wall elements (di-child-kan ke wg)
      const elContainer = new THREE.Group();
      elContainer.name = `wallElements_${spec.id}`;
      elContainer.position.set(0, 0, 0);
      wg.add(elContainer);
      newWallElementGroups[spec.id] = elContainer;

      roomGroup.add(wg);
      newWallGroups[spec.id] = wg;
    });

    wallGroupsRef.current = newWallGroups;
    wallElementGroupsRef.current = newWallElementGroups; // ✅ NEW
  }, [isRoomCreated, room, walls, door]);

  // ✅ NEW — Render Mesh Elemen Dinding
  useEffect(() => {
    const wallElGroups = wallElementGroupsRef.current;
    if (!wallElGroups) return;

    // Bersihkan semua container
    Object.values(wallElGroups).forEach((container) => {
      disposeGroupChildren(container);
    });

    if (!isRoomCreated) return;

    (wallElements || []).forEach((item) => {
      const container = wallElGroups[item.wall];
      if (!container) return;

      const isSelected = item.id === selectedWallElementId;
      const hasConflict = Boolean(wallElementConflictIds?.has?.(item.id));
      const wallWidthCm = getWallWidthCm(item.wall, room.width, room.length);

      const meshGroup = buildWallElementGroup(item, wallWidthCm, {
        isSelected,
        hasConflict,
      });
      container.add(meshGroup);
    });
  }, [
    isRoomCreated,
    room,
    walls,
    door,
    wallElements,
    selectedWallElementId,
    wallElementConflictIds,
  ]);

  useEffect(() => {
    const fGroup = furnitureGroupRef.current;
    const gGroup = guideGroupRef.current;
    if (!fGroup || !gGroup) return;

    disposeGroupChildren(fGroup);
    disposeGroupChildren(gGroup);

    if (!isRoomCreated) return;

    furnitures.forEach((item) => {
      const isSelected = item.id === selectedFurnitureId;
      const hasConflict = conflictIds.has(item.id);
      const meshGroup = buildFurnitureGroup(item, { isSelected, hasConflict });
      fGroup.add(meshGroup);
    });

    const selectedItem = furnitures.find((f) => f.id === selectedFurnitureId);
    if (selectedItem) {
      const W = room.width / 100;
      const L = room.length / 100;
      const { minX, maxX, minZ, maxZ } = getFurnitureWorldAABB(selectedItem);
      const midX = (minX + maxX) / 2;
      const midZ = (minZ + maxZ) / 2;
      const y = 0.007;

      const points = [
        new THREE.Vector3(minX, y, midZ),
        new THREE.Vector3(-W / 2, y, midZ),
        new THREE.Vector3(maxX, y, midZ),
        new THREE.Vector3(W / 2, y, midZ),
        new THREE.Vector3(midX, y, minZ),
        new THREE.Vector3(midX, y, -L / 2),
        new THREE.Vector3(midX, y, maxZ),
        new THREE.Vector3(midX, y, L / 2),
      ];

      const guideColor = conflictIds.has(selectedItem.id)
        ? "#ef4444"
        : selectedItem.locked
          ? "#f59e0b"
          : "#2563eb";

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: guideColor,
        transparent: true,
        opacity: 0.75,
      });
      gGroup.add(new THREE.LineSegments(lineGeo, lineMat));
    }
  }, [isRoomCreated, room, furnitures, selectedFurnitureId, conflictIds]);

  useEffect(() => {
    if (!cameraCommand || !perspCameraRef.current || !controlsRef.current)
      return;

    const { isRoomCreated: created, room: r, door: d } = latestDataRef.current;
    if (!created) return;

    const camera = perspCameraRef.current;
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
          {viewMode === "2d" ? t.controlsHint2D : t.controlsHint3D}
        </div>
      )}
    </div>
  );
}
