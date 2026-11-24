import React, { useState, useEffect } from "react";
import RoomViewport from "./components/RoomViewport";
import ControlPanel from "./components/ControlPanel";

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
  const [panelWidth, setPanelWidth] = useState(368);

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

  const handleCreateRoom = (validRoomData) => {
    setRoom(validRoomData);
    setIsRoomCreated(true);
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
    setFurnitures([]);
  };

  const handleResetAll = () => {
    setIsRoomCreated(false);
    setRoom(DEFAULT_ROOM);
    setWalls(DEFAULT_WALLS);
    setSelectedWalls(["front", "back", "left", "right"]);
    setDoor(DEFAULT_DOOR);
    setFurnitures([]);
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
      <div className="h-[52vh] w-full md:h-full md:flex-1">
        <RoomViewport
          isRoomCreated={isRoomCreated}
          room={computedRoomDimensions}
          walls={walls}
          door={door}
          autoHideWalls={autoHideWalls}
          cameraCommand={cameraCommand}
          onCameraManualMove={() => setActiveCameraPreset(null)}
          theme={theme}
          lang={lang}
        />
      </div>

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
          autoHideWalls={autoHideWalls}
          setAutoHideWalls={setAutoHideWalls}
          activeCameraPreset={activeCameraPreset}
          onSetCameraPreset={handleSelectCameraPreset}
          furnitureCount={furnitures.length}
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
