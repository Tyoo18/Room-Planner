import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import RoomViewport from "./components/RoomViewport";
import ControlPanel from "./components/ControlPanel";
import FurnitureCatalog from "./components/FurnitureCatalog";
import {
  createDefaultFurniture,
  clampFurnitureToRoom,
  checkFurnitureConflicts,
} from "./utils/furnitureGeometry";
import {
  createDefaultWallElement,
  clampWallElement,
  checkWallElementConflicts,
} from "./wallElements";
import { TRANSLATIONS } from "./utils/i18n";

const STORAGE_KEY = "mrp_layouts_v1";
const MAX_HISTORY = 40;

const DEFAULT_ROOM = {
  p: 300,
  l: 400,
  t: 280,
  thickness: 15,
  autoThickness: true,
};

const DEFAULT_WALLS = {
  front: { mode: "full", color1: "#F5F3EE", color2: "#D8D2C7", splitRatio: 50 },
  back: { mode: "full", color1: "#F5F3EE", color2: "#D8D2C7", splitRatio: 50 },
  left: { mode: "full", color1: "#F5F3EE", color2: "#D8D2C7", splitRatio: 50 },
  right: { mode: "full", color1: "#F5F3EE", color2: "#D8D2C7", splitRatio: 50 },
};

const DEFAULT_DOOR = {
  onSide: "panjang",
  align: "left",
  offset: 15,
  width: 80,
  height: 210,
  swing: "inward",
  hinge: "left",
};

function createSlotObject(name, overrides = {}) {
  return {
    id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    isRoomCreated: false,
    room: { ...DEFAULT_ROOM },
    walls: JSON.parse(JSON.stringify(DEFAULT_WALLS)),
    door: { ...DEFAULT_DOOR },
    furnitures: [],
    wallElements: [],
    ...overrides,
  };
}

function loadInitialLayoutStore(lang) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.slots) && parsed.slots.length > 0) {
        const activeId = parsed.slots.some((s) => s.id === parsed.activeSlotId)
          ? parsed.activeSlotId
          : parsed.slots[0].id;
        return { slots: parsed.slots, activeSlotId: activeId };
      }
    }
  } catch {
    // Abaikan error storage corrupt & fallback ke slot default
  }
  const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
  const firstSlot = createSlotObject(t.layoutDefault1);
  return { slots: [firstSlot], activeSlotId: firstSlot.id };
}

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("mrp_theme") || "light",
  );
  const [lang, setLang] = useState(
    () => localStorage.getItem("mrp_lang") || "id",
  );
  const [leftPanelWidth, setLeftPanelWidth] = useState(276);
  const [panelWidth, setPanelWidth] = useState(356);

  const initialStore = useMemo(() => loadInitialLayoutStore(lang), []);
  const [slots, setSlots] = useState(initialStore.slots);
  const [activeSlotId, setActiveSlotId] = useState(initialStore.activeSlotId);

  const initialActive =
    initialStore.slots.find((s) => s.id === initialStore.activeSlotId) ||
    initialStore.slots[0];

  const [isRoomCreated, setIsRoomCreated] = useState(
    Boolean(initialActive.isRoomCreated),
  );
  const [room, setRoom] = useState(initialActive.room || DEFAULT_ROOM);
  const [walls, setWalls] = useState(initialActive.walls || DEFAULT_WALLS);
  const [selectedWalls, setSelectedWalls] = useState([
    "front",
    "back",
    "left",
    "right",
  ]);
  const [door, setDoor] = useState(initialActive.door || DEFAULT_DOOR);

  const [furnitures, setFurnitures] = useState(initialActive.furnitures || []);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);

  const [wallElements, setWallElements] = useState(
    initialActive.wallElements || [],
  );
  const [selectedWallElementId, setSelectedWallElementId] = useState(null);

  // History stack gabungan untuk Undo / Redo
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const dragSnapshotRef = useRef(null);

  const furnituresRef = useRef(furnitures);
  useEffect(() => {
    furnituresRef.current = furnitures;
  }, [furnitures]);

  const wallElementsRef = useRef(wallElements);
  useEffect(() => {
    wallElementsRef.current = wallElements;
  }, [wallElements]);

  const captureScreenshotRef = useRef(null);

  const [snapEnabled, setSnapEnabled] = useState(true);
  const [viewMode, setViewMode] = useState("3d");
  const [autoHideWalls, setAutoHideWalls] = useState(true);
  const [activeCameraPreset, setActiveCameraPreset] = useState("iso");
  const [cameraCommand, setCameraCommand] = useState(null);

  useEffect(() => {
    localStorage.setItem("mrp_theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("mrp_lang", lang);
  }, [lang]);

  // Auto-save perubahan ke localStorage
  useEffect(() => {
    setSlots((prevSlots) => {
      const nextSlots = prevSlots.map((slot) =>
        slot.id === activeSlotId
          ? {
              ...slot,
              isRoomCreated,
              room,
              walls,
              door,
              furnitures,
              wallElements,
            }
          : slot,
      );
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ activeSlotId, slots: nextSlots }),
        );
      } catch {
        // Abaikan quota error
      }
      return nextSlots;
    });
  }, [
    activeSlotId,
    isRoomCreated,
    room,
    walls,
    door,
    furnitures,
    wallElements,
  ]);

  const getCurrentSnapshot = useCallback(
    () => ({
      furnitures: furnituresRef.current,
      wallElements: wallElementsRef.current,
    }),
    [],
  );

  const pushHistorySnapshot = useCallback((snapshot) => {
    setPast((prev) => [...prev.slice(-(MAX_HISTORY - 1)), snapshot]);
    setFuture([]);
  }, []);

  const handleRecordHistorySnapshot = useCallback(() => {
    pushHistorySnapshot(getCurrentSnapshot());
  }, [pushHistorySnapshot, getCurrentSnapshot]);

  const applySnapshot = useCallback((snapshot) => {
    const nextFurn = Array.isArray(snapshot)
      ? snapshot
      : snapshot?.furnitures || [];
    const nextWallEls = Array.isArray(snapshot)
      ? []
      : snapshot?.wallElements || [];

    setFurnitures(nextFurn);
    setWallElements(nextWallEls);
    setSelectedFurnitureId((currId) =>
      nextFurn.some((f) => f.id === currId) ? currId : null,
    );
    setSelectedWallElementId((currId) =>
      nextWallEls.some((w) => w.id === currId) ? currId : null,
    );
  }, []);

  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previousState = prevPast[prevPast.length - 1];
      const nextPast = prevPast.slice(0, -1);

      setFuture((prevFuture) => [
        getCurrentSnapshot(),
        ...prevFuture.slice(0, MAX_HISTORY - 1),
      ]);
      applySnapshot(previousState);
      return nextPast;
    });
  }, [getCurrentSnapshot, applySnapshot]);

  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const nextState = prevFuture[0];
      const remainingFuture = prevFuture.slice(1);

      setPast((prevPast) => [
        ...prevPast.slice(-(MAX_HISTORY - 1)),
        getCurrentSnapshot(),
      ]);
      applySnapshot(nextState);
      return remainingFuture;
    });
  }, [getCurrentSnapshot, applySnapshot]);

  // Seleksi saling eksklusif antara Furnitur dan Elemen Dinding
  const handleSelectFurniture = useCallback((id) => {
    setSelectedFurnitureId(id);
    if (id) setSelectedWallElementId(null);
  }, []);

  const handleSelectWallElement = useCallback((id) => {
    setSelectedWallElementId(id);
    if (id) setSelectedFurnitureId(null);
  }, []);

  // Manajemen Layout Slots
  const handleSelectSlot = useCallback(
    (targetId) => {
      if (targetId === activeSlotId) return;
      const target = slots.find((s) => s.id === targetId);
      if (!target) return;

      setActiveSlotId(target.id);
      setIsRoomCreated(Boolean(target.isRoomCreated));
      setRoom(target.room || { ...DEFAULT_ROOM });
      setWalls(target.walls || JSON.parse(JSON.stringify(DEFAULT_WALLS)));
      setDoor(target.door || { ...DEFAULT_DOOR });
      setFurnitures(target.furnitures || []);
      setWallElements(target.wallElements || []);
      setSelectedFurnitureId(null);
      setSelectedWallElementId(null);
      setPast([]);
      setFuture([]);
    },
    [activeSlotId, slots],
  );

  const handleDuplicateSlot = () => {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
    const current = slots.find((s) => s.id === activeSlotId);
    const baseName = current ? current.name : t.layoutDefault1;
    const copySlot = createSlotObject(`${baseName} (${t.layoutCopySuffix})`, {
      isRoomCreated,
      room: { ...room },
      walls: JSON.parse(JSON.stringify(walls)),
      door: { ...door },
      furnitures: JSON.parse(JSON.stringify(furnitures)),
      wallElements: JSON.parse(JSON.stringify(wallElements)),
    });

    setSlots((prev) => [...prev, copySlot]);
    setActiveSlotId(copySlot.id);
    setSelectedFurnitureId(null);
    setSelectedWallElementId(null);
    setPast([]);
    setFuture([]);
  };

  const handleCreateNewSlot = () => {
    const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
    const nextNumber = slots.length + 1;
    const newSlot = createSlotObject(`${t.layoutCopySuffix} #${nextNumber}`, {
      isRoomCreated,
      room: { ...room },
      walls: JSON.parse(JSON.stringify(walls)),
      door: { ...door },
      furnitures: [],
      wallElements: [],
    });

    setSlots((prev) => [...prev, newSlot]);
    setActiveSlotId(newSlot.id);
    setFurnitures([]);
    setWallElements([]);
    setSelectedFurnitureId(null);
    setSelectedWallElementId(null);
    setPast([]);
    setFuture([]);
  };

  const handleRenameSlot = (slotId, nextName) => {
    setSlots((prev) => {
      const updated = prev.map((s) =>
        s.id === slotId ? { ...s, name: nextName } : s,
      );
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ activeSlotId, slots: updated }),
        );
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleDeleteSlot = (slotId) => {
    if (slots.length <= 1) return;
    const remaining = slots.filter((s) => s.id !== slotId);
    setSlots(remaining);
    if (slotId === activeSlotId) {
      const fallback = remaining[0];
      setActiveSlotId(fallback.id);
      setIsRoomCreated(Boolean(fallback.isRoomCreated));
      setRoom(fallback.room || { ...DEFAULT_ROOM });
      setWalls(fallback.walls || JSON.parse(JSON.stringify(DEFAULT_WALLS)));
      setDoor(fallback.door || { ...DEFAULT_DOOR });
      setFurnitures(fallback.furnitures || []);
      setWallElements(fallback.wallElements || []);
      setSelectedFurnitureId(null);
      setSelectedWallElementId(null);
      setPast([]);
      setFuture([]);
    }
  };

  const handleExportJson = () => {
    const syncedSlots = slots.map((slot) =>
      slot.id === activeSlotId
        ? {
            ...slot,
            isRoomCreated,
            room,
            walls,
            door,
            furnitures,
            wallElements,
          }
        : slot,
    );

    const payload = {
      app: "MyRoomPlanner",
      version: 1,
      exportedAt: new Date().toISOString(),
      activeSlotId,
      slots: syncedSlots,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `myroomplanner-backup-${stamp}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed?.slots) || parsed.slots.length === 0) {
        return false;
      }

      const normalizedSlots = parsed.slots.map((s, idx) => ({
        id:
          typeof s.id === "string" && s.id ? s.id : `slot_${Date.now()}_${idx}`,
        name:
          typeof s.name === "string" && s.name ? s.name : `Layout ${idx + 1}`,
        isRoomCreated: Boolean(s.isRoomCreated),
        room: { ...DEFAULT_ROOM, ...(s.room || {}) },
        walls: s.walls
          ? {
              front: { ...DEFAULT_WALLS.front, ...s.walls.front },
              back: { ...DEFAULT_WALLS.back, ...s.walls.back },
              left: { ...DEFAULT_WALLS.left, ...s.walls.left },
              right: { ...DEFAULT_WALLS.right, ...s.walls.right },
            }
          : JSON.parse(JSON.stringify(DEFAULT_WALLS)),
        door: { ...DEFAULT_DOOR, ...(s.door || {}) },
        furnitures: Array.isArray(s.furnitures) ? s.furnitures : [],
        wallElements: Array.isArray(s.wallElements) ? s.wallElements : [],
      }));

      const targetSlot =
        normalizedSlots.find((s) => s.id === parsed.activeSlotId) ||
        normalizedSlots[0];

      setSlots(normalizedSlots);
      setActiveSlotId(targetSlot.id);
      setIsRoomCreated(Boolean(targetSlot.isRoomCreated));
      setRoom(targetSlot.room);
      setWalls(targetSlot.walls);
      setDoor(targetSlot.door);
      setFurnitures(targetSlot.furnitures);
      setWallElements(targetSlot.wallElements);
      setSelectedFurnitureId(null);
      setSelectedWallElementId(null);
      setPast([]);
      setFuture([]);
      return true;
    } catch {
      return false;
    }
  };

  const frontWidthCm = door.onSide === "panjang" ? room.p : room.l;
  const sideLengthCm = door.onSide === "panjang" ? room.l : room.p;

  const computedRoomDimensions = {
    width: frontWidthCm,
    length: sideLengthCm,
    height: room.t,
    thickness: room.thickness,
  };

  // Clamp furnitur & elemen dinding saat ukuran kamar berubah
  useEffect(() => {
    setFurnitures((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((item) => {
        const clamped = clampFurnitureToRoom(item, frontWidthCm, sideLengthCm);
        if (clamped.x !== item.x || clamped.z !== item.z) {
          changed = true;
          return clamped;
        }
        return item;
      });
      return changed ? next : prev;
    });

    setWallElements((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const next = prev.map((el) => {
        const clamped = clampWallElement(
          el,
          frontWidthCm,
          sideLengthCm,
          room.t,
        );
        if (
          clamped.width !== el.width ||
          clamped.height !== el.height ||
          clamped.offsetCm !== el.offsetCm ||
          clamped.elevationCm !== el.elevationCm
        ) {
          changed = true;
          return clamped;
        }
        return el;
      });
      return changed ? next : prev;
    });
  }, [frontWidthCm, sideLengthCm, room.t]);

  const conflictMap = useMemo(() => {
    const map = new Map();
    const ids = new Set();
    furnitures.forEach((item) => {
      const res = checkFurnitureConflicts(
        item,
        furnitures,
        frontWidthCm,
        sideLengthCm,
        door,
      );
      map.set(item.id, res);
      if (res.hasOverlap || res.hasDoorBlock) {
        ids.add(item.id);
      }
    });
    return { map, ids };
  }, [furnitures, frontWidthCm, sideLengthCm, door]);

  const wallElementConflictMap = useMemo(() => {
    const map = new Map();
    const ids = new Set();
    wallElements.forEach((el) => {
      const res = checkWallElementConflicts(
        el,
        wallElements,
        frontWidthCm,
        sideLengthCm,
        room.t,
        door,
      );
      map.set(el.id, res);
      if (res.hasOverlap || res.hasDoorBlock) {
        ids.add(el.id);
      }
    });
    return { map, ids };
  }, [wallElements, frontWidthCm, sideLengthCm, room.t, door]);

  const selectedFurniture = useMemo(
    () => furnitures.find((f) => f.id === selectedFurnitureId) || null,
    [furnitures, selectedFurnitureId],
  );

  const selectedWallElement = useMemo(
    () => wallElements.find((w) => w.id === selectedWallElementId) || null,
    [wallElements, selectedWallElementId],
  );

  const unlockedFurnitureCount = useMemo(
    () =>
      furnitures.filter((f) => !f.locked).length +
      wallElements.filter((w) => !w.locked).length,
    [furnitures, wallElements],
  );

  // --- CRUD Furnitur ---
  const handleAddFurniture = (type, variantPatch) => {
    pushHistorySnapshot(getCurrentSnapshot());
    const rawItem = createDefaultFurniture(type, variantPatch);
    const offsetIndex = furnitures.length % 5;
    rawItem.x = (offsetIndex - 2) * 12;
    rawItem.z = (offsetIndex - 2) * 12;
    const placed = clampFurnitureToRoom(rawItem, frontWidthCm, sideLengthCm);

    setFurnitures((prev) => [...prev, placed]);
    handleSelectFurniture(placed.id);
  };

  const handleUpdateFurniture = useCallback(
    (id, patch, recordHistory = true) => {
      if (recordHistory) {
        pushHistorySnapshot(getCurrentSnapshot());
      }
      setFurnitures((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          if (item.locked && patch.locked === undefined) {
            const colorOnly = {};
            if (patch.color1 !== undefined) colorOnly.color1 = patch.color1;
            if (patch.color2 !== undefined) colorOnly.color2 = patch.color2;
            return Object.keys(colorOnly).length > 0
              ? { ...item, ...colorOnly }
              : item;
          }
          const updated = { ...item, ...patch };
          return clampFurnitureToRoom(updated, frontWidthCm, sideLengthCm);
        }),
      );
    },
    [frontWidthCm, sideLengthCm, pushHistorySnapshot, getCurrentSnapshot],
  );

  const handleToggleLockFurniture = useCallback(
    (id) => {
      pushHistorySnapshot(getCurrentSnapshot());
      setFurnitures((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, locked: !item.locked } : item,
        ),
      );
    },
    [pushHistorySnapshot, getCurrentSnapshot],
  );

  const handleFurnitureDragStart = useCallback(() => {
    dragSnapshotRef.current = getCurrentSnapshot();
  }, [getCurrentSnapshot]);

  const handleFurnitureDragEnd = useCallback(
    (didMove) => {
      if (didMove && dragSnapshotRef.current) {
        pushHistorySnapshot(dragSnapshotRef.current);
      }
      dragSnapshotRef.current = null;
    },
    [pushHistorySnapshot],
  );

  const handleMoveFurniture = useCallback((id, nextX, nextZ) => {
    setFurnitures((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.locked) return item;
        return { ...item, x: nextX, z: nextZ };
      }),
    );
  }, []);

  const handleDuplicateFurniture = (id) => {
    const source = furnitures.find((f) => f.id === id);
    if (!source) return;
    pushHistorySnapshot(getCurrentSnapshot());
    const copy = clampFurnitureToRoom(
      {
        ...source,
        locked: false,
        id: `furn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        x: source.x + 25,
        z: source.z + 25,
      },
      frontWidthCm,
      sideLengthCm,
    );
    setFurnitures((prev) => [...prev, copy]);
    handleSelectFurniture(copy.id);
  };

  const handleDeleteFurniture = useCallback(
    (id) => {
      setFurnitures((prev) => {
        const target = prev.find((f) => f.id === id);
        if (!target || target.locked) return prev;
        pushHistorySnapshot({
          furnitures: prev,
          wallElements: wallElementsRef.current,
        });
        return prev.filter((f) => f.id !== id);
      });
      setSelectedFurnitureId((prevId) => (prevId === id ? null : prevId));
    },
    [pushHistorySnapshot],
  );

  // --- CRUD Elemen Dinding (Jendela & Stopkontak) ---
  const handleAddWallElement = (type, variantPatch) => {
    pushHistorySnapshot(getCurrentSnapshot());
    const rawEl = createDefaultWallElement(type, variantPatch);
    // Jika user sedang fokus ke 1 tembok tertentu, tempel langsung di tembok itu
    if (selectedWalls.length === 1) {
      rawEl.wall = selectedWalls[0];
    }
    const offsetShift = (wallElements.length % 4) * 20;
    rawEl.offsetCm += offsetShift;

    const placed = clampWallElement(rawEl, frontWidthCm, sideLengthCm, room.t);
    setWallElements((prev) => [...prev, placed]);
    handleSelectWallElement(placed.id);
  };

  const handleUpdateWallElement = useCallback(
    (id, patch, recordHistory = true) => {
      if (recordHistory) {
        pushHistorySnapshot(getCurrentSnapshot());
      }
      setWallElements((prev) =>
        prev.map((el) => {
          if (el.id !== id) return el;
          if (el.locked && patch.locked === undefined) {
            const colorOnly = {};
            if (patch.color1 !== undefined) colorOnly.color1 = patch.color1;
            if (patch.color2 !== undefined) colorOnly.color2 = patch.color2;
            return Object.keys(colorOnly).length > 0
              ? { ...el, ...colorOnly }
              : el;
          }
          const updated = { ...el, ...patch };
          return clampWallElement(updated, frontWidthCm, sideLengthCm, room.t);
        }),
      );
    },
    [
      frontWidthCm,
      sideLengthCm,
      room.t,
      pushHistorySnapshot,
      getCurrentSnapshot,
    ],
  );

  const handleToggleLockWallElement = useCallback(
    (id) => {
      pushHistorySnapshot(getCurrentSnapshot());
      setWallElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, locked: !el.locked } : el)),
      );
    },
    [pushHistorySnapshot, getCurrentSnapshot],
  );

  const handleDuplicateWallElement = (id) => {
    const source = wallElements.find((w) => w.id === id);
    if (!source) return;
    pushHistorySnapshot(getCurrentSnapshot());
    const copy = clampWallElement(
      {
        ...source,
        locked: false,
        id: `we_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        offsetCm: source.offsetCm + 25,
      },
      frontWidthCm,
      sideLengthCm,
      room.t,
    );
    setWallElements((prev) => [...prev, copy]);
    handleSelectWallElement(copy.id);
  };

  const handleDeleteWallElement = useCallback(
    (id) => {
      setWallElements((prev) => {
        const target = prev.find((w) => w.id === id);
        if (!target || target.locked) return prev;
        pushHistorySnapshot({
          furnitures: furnituresRef.current,
          wallElements: prev,
        });
        return prev.filter((w) => w.id !== id);
      });
      setSelectedWallElementId((prevId) => (prevId === id ? null : prevId));
    },
    [pushHistorySnapshot],
  );

  // Keyboard shortcuts global
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === "[" && slots.length > 1) {
        const idx = slots.findIndex((s) => s.id === activeSlotId);
        const prevIdx = (idx - 1 + slots.length) % slots.length;
        handleSelectSlot(slots[prevIdx].id);
        return;
      }
      if (e.key === "]" && slots.length > 1) {
        const idx = slots.findIndex((s) => s.id === activeSlotId);
        const nextIdx = (idx + 1) % slots.length;
        handleSelectSlot(slots[nextIdx].id);
        return;
      }

      if (e.key === "2" && isRoomCreated) {
        setViewMode("2d");
        return;
      }
      if (e.key === "3" && isRoomCreated) {
        setViewMode("3d");
        return;
      }

      // Shortcut saat Elemen Dinding terpilih
      if (selectedWallElement) {
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
        ) {
          e.preventDefault();
          if (selectedWallElement.locked) return;

          if (!e.repeat) {
            pushHistorySnapshot(getCurrentSnapshot());
          }

          const step = e.shiftKey ? 10 : 1;
          let dOffset = 0;
          let dElev = 0;
          if (e.key === "ArrowLeft") dOffset = -step;
          if (e.key === "ArrowRight") dOffset = step;
          if (e.key === "ArrowUp") dElev = step;
          if (e.key === "ArrowDown") dElev = -step;

          handleUpdateWallElement(
            selectedWallElement.id,
            {
              offsetCm: selectedWallElement.offsetCm + dOffset,
              elevationCm: selectedWallElement.elevationCm + dElev,
            },
            false,
          );
          return;
        }

        if (e.key === "l" || e.key === "L") {
          handleToggleLockWallElement(selectedWallElement.id);
        } else if (
          (e.key === "Delete" || e.key === "Backspace") &&
          !selectedWallElement.locked
        ) {
          handleDeleteWallElement(selectedWallElement.id);
        } else if (e.key === "Escape") {
          setSelectedWallElementId(null);
        }
        return;
      }

      if (!selectedFurniture) return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        if (selectedFurniture.locked) return;

        if (!e.repeat) {
          pushHistorySnapshot(getCurrentSnapshot());
        }

        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dz = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dz = -step;
        if (e.key === "ArrowDown") dz = step;

        const clamped = clampFurnitureToRoom(
          {
            ...selectedFurniture,
            x: selectedFurniture.x + dx,
            z: selectedFurniture.z + dz,
          },
          frontWidthCm,
          sideLengthCm,
        );
        handleMoveFurniture(selectedFurniture.id, clamped.x, clamped.z);
      } else if (
        (e.key === "r" || e.key === "R") &&
        !selectedFurniture.locked
      ) {
        handleUpdateFurniture(selectedFurniture.id, {
          rotation: (selectedFurniture.rotation + 90) % 360,
        });
      } else if (e.key === "l" || e.key === "L") {
        handleToggleLockFurniture(selectedFurniture.id);
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !selectedFurniture.locked
      ) {
        handleDeleteFurniture(selectedFurniture.id);
      } else if (e.key === "Escape") {
        setSelectedFurnitureId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isRoomCreated,
    selectedFurniture,
    selectedWallElement,
    frontWidthCm,
    sideLengthCm,
    slots,
    activeSlotId,
    handleSelectSlot,
    handleUndo,
    handleRedo,
    pushHistorySnapshot,
    getCurrentSnapshot,
    handleMoveFurniture,
    handleUpdateFurniture,
    handleToggleLockFurniture,
    handleDeleteFurniture,
    handleToggleLockWallElement,
    handleDeleteWallElement,
    handleUpdateWallElement,
  ]);

  const handleCreateRoom = (validRoomData) => {
    setRoom(validRoomData);
    setIsRoomCreated(true);
    setViewMode("3d");
    setActiveCameraPreset("iso");
    setCameraCommand({ type: "iso", timestamp: Date.now() });
  };

  const handleUpdateSelectedWalls = (patch) => {
    setWalls((prev) => {
      const updated = { ...prev };
      selectedWalls.forEach((wallId) => {
        updated[wallId] = { ...updated[wallId], ...patch };
      });
      return updated;
    });
  };

  const handleSelectCameraPreset = (type) => {
    setActiveCameraPreset(type);
    setCameraCommand({ type, timestamp: Date.now() });
  };

  const handleResetFurniture = () => {
    const lockedFurn = furnitures.filter((f) => f.locked);
    const lockedWallEls = wallElements.filter((w) => w.locked);

    if (
      lockedFurn.length !== furnitures.length ||
      lockedWallEls.length !== wallElements.length
    ) {
      pushHistorySnapshot(getCurrentSnapshot());
    }

    setFurnitures(lockedFurn);
    setWallElements(lockedWallEls);

    if (!lockedFurn.some((f) => f.id === selectedFurnitureId)) {
      setSelectedFurnitureId(null);
    }
    if (!lockedWallEls.some((w) => w.id === selectedWallElementId)) {
      setSelectedWallElementId(null);
    }
  };

  const handleResetAll = () => {
    setIsRoomCreated(false);
    setRoom(DEFAULT_ROOM);
    setWalls(DEFAULT_WALLS);
    setSelectedWalls(["front", "back", "left", "right"]);
    setDoor(DEFAULT_DOOR);
    setFurnitures([]);
    setWallElements([]);
    setSelectedFurnitureId(null);
    setSelectedWallElementId(null);
    setPast([]);
    setFuture([]);
    setViewMode("3d");
    setAutoHideWalls(true);
    setActiveCameraPreset("iso");
    setCameraCommand(null);
  };

  return (
    <main
      className={`flex h-screen w-screen flex-col overflow-hidden md:flex-row ${
        theme === "dark" ? "bg-zinc-950" : "bg-zinc-100"
      }`}
    >
      {/* Panel Kiri: Figma Assets & Layers */}
      <div className="hidden h-full md:block md:shrink-0">
        <FurnitureCatalog
          isRoomCreated={isRoomCreated}
          furnitures={furnitures}
          selectedFurnitureId={selectedFurnitureId}
          conflictIds={conflictMap.ids}
          onAddFurniture={handleAddFurniture}
          onSelectFurniture={handleSelectFurniture}
          onToggleLockFurniture={handleToggleLockFurniture}
          onDeleteFurniture={handleDeleteFurniture}
          wallElements={wallElements}
          selectedWallElementId={selectedWallElementId}
          wallElementConflictIds={wallElementConflictMap.ids}
          onAddWallElement={handleAddWallElement}
          onSelectWallElement={handleSelectWallElement}
          onToggleLockWallElement={handleToggleLockWallElement}
          onDeleteWallElement={handleDeleteWallElement}
          selectedWalls={selectedWalls}
          onSelectWallLayer={(wallId) => setSelectedWalls([wallId])}
          theme={theme}
          lang={lang}
          panelWidth={leftPanelWidth}
          setPanelWidth={setLeftPanelWidth}
        />
      </div>

      {/* Tengah: Viewport 3D & 2D Denah */}
      <div className="h-[52vh] min-h-0 w-full min-w-0 overflow-hidden md:h-full md:flex-1">
        <RoomViewport
          isRoomCreated={isRoomCreated}
          room={computedRoomDimensions}
          walls={walls}
          door={door}
          furnitures={furnitures}
          selectedFurnitureId={selectedFurnitureId}
          conflictIds={conflictMap.ids}
          onSelectFurniture={handleSelectFurniture}
          onFurnitureDragStart={handleFurnitureDragStart}
          onFurnitureDragEnd={handleFurnitureDragEnd}
          onMoveFurniture={handleMoveFurniture}
          wallElements={wallElements}
          selectedWallElementId={selectedWallElementId}
          wallElementConflictIds={wallElementConflictMap.ids}
          onSelectWallElement={handleSelectWallElement}
          snapEnabled={snapEnabled}
          viewMode={viewMode}
          autoHideWalls={autoHideWalls}
          cameraCommand={cameraCommand}
          onCameraManualMove={() => setActiveCameraPreset(null)}
          onRegisterScreenshot={(fn) => {
            captureScreenshotRef.current = fn;
          }}
          theme={theme}
          lang={lang}
        />
      </div>

      {/* Panel Kanan: Template Slot, Undo/Redo & Inspector */}
      <div className="h-[48vh] min-h-0 w-full md:h-full md:shrink-0 md:w-auto">
        <ControlPanel
          slots={slots}
          activeSlotId={activeSlotId}
          onSelectSlot={handleSelectSlot}
          onDuplicateSlot={handleDuplicateSlot}
          onCreateNewSlot={handleCreateNewSlot}
          onRenameSlot={handleRenameSlot}
          onDeleteSlot={handleDeleteSlot}
          onExportJson={handleExportJson}
          onImportJson={handleImportJson}
          onScreenshot={() => captureScreenshotRef.current?.()}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onRecordHistorySnapshot={handleRecordHistorySnapshot}
          isRoomCreated={isRoomCreated}
          room={room}
          setRoom={setRoom}
          onCreateRoom={handleCreateRoom}
          walls={walls}
          selectedWalls={selectedWalls}
          setSelectedWalls={setSelectedWalls}
          onUpdateSelectedWalls={handleUpdateSelectedWalls}
          door={door}
          setDoor={setDoor}
          frontWidthCm={frontWidthCm}
          sideLengthCm={sideLengthCm}
          selectedFurniture={selectedFurniture}
          selectedConflict={
            selectedFurniture ? conflictMap.map.get(selectedFurniture.id) : null
          }
          onDeselectFurniture={() => setSelectedFurnitureId(null)}
          onUpdateFurniture={handleUpdateFurniture}
          onToggleLockFurniture={handleToggleLockFurniture}
          onDuplicateFurniture={handleDuplicateFurniture}
          onDeleteFurniture={handleDeleteFurniture}
          wallElements={wallElements}
          selectedWallElement={selectedWallElement}
          selectedWallElementConflict={
            selectedWallElement
              ? wallElementConflictMap.map.get(selectedWallElement.id)
              : null
          }
          onSelectWallElement={handleSelectWallElement}
          onDeselectWallElement={() => setSelectedWallElementId(null)}
          onUpdateWallElement={handleUpdateWallElement}
          onToggleLockWallElement={handleToggleLockWallElement}
          onDuplicateWallElement={handleDuplicateWallElement}
          onDeleteWallElement={handleDeleteWallElement}
          snapEnabled={snapEnabled}
          setSnapEnabled={setSnapEnabled}
          viewMode={viewMode}
          setViewMode={setViewMode}
          autoHideWalls={autoHideWalls}
          setAutoHideWalls={setAutoHideWalls}
          activeCameraPreset={activeCameraPreset}
          onSetCameraPreset={handleSelectCameraPreset}
          unlockedFurnitureCount={unlockedFurnitureCount}
          onResetFurniture={handleResetFurniture}
          onResetAll={handleResetAll}
          theme={theme}
          setTheme={setTheme}
          lang={lang}
          setLang={setLang}
          panelWidth={panelWidth}
          setPanelWidth={setPanelWidth}
        />
      </div>
    </main>
  );
}
