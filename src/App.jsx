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

  // History stack untuk Undo / Redo
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const dragSnapshotRef = useRef(null);
  const furnituresRef = useRef(furnitures);
  useEffect(() => {
    furnituresRef.current = furnitures;
  }, [furnitures]);

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

  // Auto-save perubahan ruangan & furnitur ke slot aktif di localStorage
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
  }, [activeSlotId, isRoomCreated, room, walls, door, furnitures]);

  const pushHistorySnapshot = useCallback((snapshot) => {
    setPast((prev) => [...prev.slice(-(MAX_HISTORY - 1)), snapshot]);
    setFuture([]);
  }, []);

  const handleRecordHistorySnapshot = useCallback(() => {
    pushHistorySnapshot(furnituresRef.current);
  }, [pushHistorySnapshot]);

  const handleUndo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previousState = prevPast[prevPast.length - 1];
      const nextPast = prevPast.slice(0, -1);

      setFuture((prevFuture) => [
        furnituresRef.current,
        ...prevFuture.slice(0, MAX_HISTORY - 1),
      ]);
      setFurnitures(previousState);
      setSelectedFurnitureId((currId) =>
        previousState.some((f) => f.id === currId) ? currId : null,
      );
      return nextPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const nextState = prevFuture[0];
      const remainingFuture = prevFuture.slice(1);

      setPast((prevPast) => [
        ...prevPast.slice(-(MAX_HISTORY - 1)),
        furnituresRef.current,
      ]);
      setFurnitures(nextState);
      setSelectedFurnitureId((currId) =>
        nextState.some((f) => f.id === currId) ? currId : null,
      );
      return remainingFuture;
    });
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
      setSelectedFurnitureId(null);
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
    });

    setSlots((prev) => [...prev, copySlot]);
    setActiveSlotId(copySlot.id);
    setSelectedFurnitureId(null);
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
    });

    setSlots((prev) => [...prev, newSlot]);
    setActiveSlotId(newSlot.id);
    setFurnitures([]);
    setSelectedFurnitureId(null);
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
      setSelectedFurnitureId(null);
      setPast([]);
      setFuture([]);
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
  }, [frontWidthCm, sideLengthCm]);

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

  const selectedFurniture = useMemo(
    () => furnitures.find((f) => f.id === selectedFurnitureId) || null,
    [furnitures, selectedFurnitureId],
  );

  const unlockedFurnitureCount = useMemo(
    () => furnitures.filter((f) => !f.locked).length,
    [furnitures],
  );

  const handleAddFurniture = (type, variantPatch) => {
    pushHistorySnapshot(furnituresRef.current);
    const rawItem = createDefaultFurniture(type, variantPatch);
    const offsetIndex = furnitures.length % 5;
    rawItem.x = (offsetIndex - 2) * 12;
    rawItem.z = (offsetIndex - 2) * 12;
    const placed = clampFurnitureToRoom(rawItem, frontWidthCm, sideLengthCm);

    setFurnitures((prev) => [...prev, placed]);
    setSelectedFurnitureId(placed.id);
  };

  const handleUpdateFurniture = useCallback(
    (id, patch, recordHistory = true) => {
      if (recordHistory) {
        pushHistorySnapshot(furnituresRef.current);
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
    [frontWidthCm, sideLengthCm, pushHistorySnapshot],
  );

  const handleToggleLockFurniture = useCallback(
    (id) => {
      pushHistorySnapshot(furnituresRef.current);
      setFurnitures((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, locked: !item.locked } : item,
        ),
      );
    },
    [pushHistorySnapshot],
  );

  const handleFurnitureDragStart = useCallback(() => {
    dragSnapshotRef.current = furnituresRef.current;
  }, []);

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
    pushHistorySnapshot(furnituresRef.current);
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
    setSelectedFurnitureId(copy.id);
  };

  const handleDeleteFurniture = useCallback(
    (id) => {
      setFurnitures((prev) => {
        const target = prev.find((f) => f.id === id);
        if (!target || target.locked) return prev;
        pushHistorySnapshot(prev);
        return prev.filter((f) => f.id !== id);
      });
      setSelectedFurnitureId((prevId) => (prevId === id ? null : prevId));
    },
    [pushHistorySnapshot],
  );

  // Keyboard shortcuts global
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Undo: Ctrl+Z / Cmd+Z
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y atau Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Quick Switch Layout Slot: [ dan ]
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

      if (!selectedFurniture) return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        if (selectedFurniture.locked) return;

        if (!e.repeat) {
          pushHistorySnapshot(furnituresRef.current);
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
    frontWidthCm,
    sideLengthCm,
    slots,
    activeSlotId,
    handleSelectSlot,
    handleUndo,
    handleRedo,
    pushHistorySnapshot,
    handleMoveFurniture,
    handleUpdateFurniture,
    handleToggleLockFurniture,
    handleDeleteFurniture,
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
    setFurnitures((prev) => {
      const lockedOnly = prev.filter((f) => f.locked);
      if (lockedOnly.length !== prev.length) {
        pushHistorySnapshot(prev);
      }
      if (!lockedOnly.some((f) => f.id === selectedFurnitureId)) {
        setSelectedFurnitureId(null);
      }
      return lockedOnly;
    });
  };

  const handleResetAll = () => {
    setIsRoomCreated(false);
    setRoom(DEFAULT_ROOM);
    setWalls(DEFAULT_WALLS);
    setSelectedWalls(["front", "back", "left", "right"]);
    setDoor(DEFAULT_DOOR);
    setFurnitures([]);
    setSelectedFurnitureId(null);
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
      {/* Panel Kiri: Katalog Furnitur */}
      <div className="hidden h-full md:block md:w-auto">
        <FurnitureCatalog
          isRoomCreated={isRoomCreated}
          furnitures={furnitures}
          selectedFurnitureId={selectedFurnitureId}
          conflictIds={conflictMap.ids}
          onAddFurniture={handleAddFurniture}
          onSelectFurniture={setSelectedFurnitureId}
          onToggleLockFurniture={handleToggleLockFurniture}
          onDeleteFurniture={handleDeleteFurniture}
          theme={theme}
          lang={lang}
        />
      </div>

      {/* Tengah: Viewport 3D & 2D Denah */}
      <div className="h-[52vh] w-full md:h-full md:flex-1">
        <RoomViewport
          isRoomCreated={isRoomCreated}
          room={computedRoomDimensions}
          walls={walls}
          door={door}
          furnitures={furnitures}
          selectedFurnitureId={selectedFurnitureId}
          conflictIds={conflictMap.ids}
          onSelectFurniture={setSelectedFurnitureId}
          onFurnitureDragStart={handleFurnitureDragStart}
          onFurnitureDragEnd={handleFurnitureDragEnd}
          onMoveFurniture={handleMoveFurniture}
          snapEnabled={snapEnabled}
          viewMode={viewMode}
          autoHideWalls={autoHideWalls}
          cameraCommand={cameraCommand}
          onCameraManualMove={() => setActiveCameraPreset(null)}
          theme={theme}
          lang={lang}
        />
      </div>

      {/* Panel Kanan: Template Slot, Undo/Redo & Inspector */}
      <div className="h-[48vh] w-full md:h-full md:w-auto">
        <ControlPanel
          slots={slots}
          activeSlotId={activeSlotId}
          onSelectSlot={handleSelectSlot}
          onDuplicateSlot={handleDuplicateSlot}
          onCreateNewSlot={handleCreateNewSlot}
          onRenameSlot={handleRenameSlot}
          onDeleteSlot={handleDeleteSlot}
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
