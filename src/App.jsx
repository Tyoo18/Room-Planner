import React, { useState, useEffect, useMemo, useCallback } from "react";
import RoomViewport from "./components/RoomViewport";
import ControlPanel from "./components/ControlPanel";
import FurnitureCatalog from "./components/FurnitureCatalog";
import {
  createDefaultFurniture,
  clampFurnitureToRoom,
  checkFurnitureConflicts,
} from "./utils/furnitureGeometry";

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

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("mrp_theme") || "light",
  );
  const [lang, setLang] = useState(
    () => localStorage.getItem("mrp_lang") || "id",
  );
  const [panelWidth, setPanelWidth] = useState(356);

  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [room, setRoom] = useState(DEFAULT_ROOM);
  const [walls, setWalls] = useState(DEFAULT_WALLS);
  const [selectedWalls, setSelectedWalls] = useState([
    "front",
    "back",
    "left",
    "right",
  ]);
  const [door, setDoor] = useState(DEFAULT_DOOR);

  const [furnitures, setFurnitures] = useState([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);
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
    const rawItem = createDefaultFurniture(type, variantPatch);
    const offsetIndex = furnitures.length % 5;
    rawItem.x = (offsetIndex - 2) * 12;
    rawItem.z = (offsetIndex - 2) * 12;
    const placed = clampFurnitureToRoom(rawItem, frontWidthCm, sideLengthCm);

    setFurnitures((prev) => [...prev, placed]);
    setSelectedFurnitureId(placed.id);
  };

  const handleUpdateFurniture = useCallback(
    (id, patch) => {
      setFurnitures((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          // Jika terkunci, hanya izinkan perubahan status lock atau warna
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
    [frontWidthCm, sideLengthCm],
  );

  const handleToggleLockFurniture = useCallback((id) => {
    setFurnitures((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, locked: !item.locked } : item,
      ),
    );
  }, []);

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

  const handleDeleteFurniture = useCallback((id) => {
    setFurnitures((prev) => {
      const target = prev.find((f) => f.id === id);
      if (!target || target.locked) return prev;
      return prev.filter((f) => f.id !== id);
    });
    setSelectedFurnitureId((prevId) => (prevId === id ? null : prevId));
  }, []);

  // Keyboard shortcuts:
  // - 2 / 3: Pindah mode 2D Denah / 3D
  // - Arrow Keys: Geser furnitur terpilih 1 cm (atau 10 cm jika tahan Shift)
  // - R: Putar 90° | L: Lock/Unlock | Delete/Backspace: Hapus | Esc: Batal pilih
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

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

  // Hanya menghapus furnitur yang TIDAK terkunci
  const handleResetFurniture = () => {
    setFurnitures((prev) => {
      const lockedOnly = prev.filter((f) => f.locked);
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

      {/* Panel Kanan: Context-Aware Inspector */}
      <div className="h-[48vh] w-full md:h-full md:w-auto">
        <ControlPanel
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
