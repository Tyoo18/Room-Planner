import React, { useState, useEffect, useRef } from "react";
import {
  Eye,
  EyeOff,
  DoorOpen,
  Compass,
  RotateCcw,
  RotateCw,
  Layers,
  AlertCircle,
  AlertTriangle,
  Plus,
  Sun,
  Moon,
  Trash2,
  ArrowLeft,
  Copy,
  Box,
  Grid,
  Magnet,
  Lock,
  Unlock,
} from "lucide-react";
import ColorPicker from "./ColorPicker";
import { getWallDistancesCm } from "../utils/furnitureGeometry";
import { TRANSLATIONS } from "../utils/i18n";

const BED_SIZE_PRESETS = [
  { label: "90×200", w: 90, d: 200 },
  { label: "120×200", w: 120, d: 200 },
  { label: "160×200", w: 160, d: 200 },
  { label: "180×200", w: 180, d: 200 },
];

export default function ControlPanel({
  isRoomCreated,
  room,
  setRoom,
  onCreateRoom,
  walls,
  selectedWalls,
  setSelectedWalls,
  onUpdateSelectedWalls,
  door,
  setDoor,
  frontWidthCm,
  sideLengthCm,
  selectedFurniture,
  selectedConflict,
  onDeselectFurniture,
  onUpdateFurniture,
  onToggleLockFurniture,
  onDuplicateFurniture,
  onDeleteFurniture,
  snapEnabled = true,
  setSnapEnabled,
  viewMode = "3d",
  setViewMode,
  autoHideWalls,
  setAutoHideWalls,
  activeCameraPreset,
  onSetCameraPreset,
  unlockedFurnitureCount = 0,
  onResetFurniture,
  onResetAll,
  theme = "light",
  setTheme,
  lang = "id",
  setLang,
  panelWidth,
  setPanelWidth,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
  const isDark = theme === "dark";

  const [dimInputs, setDimInputs] = useState({ p: "", l: "", t: "" });
  const [thicknessInput, setThicknessInput] = useState(String(room.thickness));
  const [doorInputs, setDoorInputs] = useState({
    width: String(door.width),
    height: String(door.height),
  });
  const [furnInputs, setFurnInputs] = useState({
    width: "",
    depth: "",
    height: "",
    armDepth: "",
  });

  const [dimErrorKey, setDimErrorKey] = useState("");
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const paintSectionRef = useRef(null);

  useEffect(() => {
    if (!isRoomCreated) {
      setDimInputs({ p: "", l: "", t: "" });
      setThicknessInput("15");
      setDoorInputs({ width: "80", height: "210" });
      setDimErrorKey("");
    }
  }, [isRoomCreated]);

  useEffect(() => {
    if (!selectedFurniture) return;
    setFurnInputs({
      width: String(selectedFurniture.width),
      depth: String(selectedFurniture.depth),
      height: String(selectedFurniture.height),
      armDepth: String(selectedFurniture.armDepth || 55),
    });
  }, [
    selectedFurniture?.id,
    selectedFurniture?.width,
    selectedFurniture?.depth,
    selectedFurniture?.height,
    selectedFurniture?.armDepth,
  ]);

  useEffect(() => {
    if (!confirmResetAll) return;
    const timer = setTimeout(() => setConfirmResetAll(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmResetAll]);

  const maxDoorOffset = Math.max(0, frontWidthCm - door.width);
  const clampedDoorOffset = Math.min(door.offset, maxDoorOffset);

  useEffect(() => {
    if (door.align === "center") {
      const centered = Math.round(maxDoorOffset / 2);
      if (door.offset !== centered) {
        setDoor((prev) => ({ ...prev, offset: centered }));
      }
    } else if (door.offset > maxDoorOffset) {
      setDoor((prev) => ({ ...prev, offset: maxDoorOffset }));
    }
  }, [maxDoorOffset, door.align, door.offset, setDoor]);

  const handleStartResize = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent) => {
      const nextWidth = window.innerWidth - moveEvent.clientX;
      const clamped = Math.max(320, Math.min(480, nextWidth));
      setPanelWidth(clamped);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleDimensionChange = (field, rawValue) => {
    const cleaned = rawValue.replace(/[^0-9]/g, "");
    const nextInputs = { ...dimInputs, [field]: cleaned };
    setDimInputs(nextInputs);

    if (cleaned === "") {
      setDimErrorKey("");
      return;
    }

    const numVal = Number(cleaned);
    if (numVal < 50) {
      setDimErrorKey("min50");
      return;
    }

    setDimErrorKey("");
    if (isRoomCreated) {
      setRoom((prev) => ({ ...prev, [field]: numVal }));
    }
  };

  const handleThicknessTyping = (rawValue) => {
    const cleaned = rawValue.replace(/[^0-9]/g, "");
    setThicknessInput(cleaned);
    const numVal = Number(cleaned);
    if (cleaned !== "" && numVal >= 5 && numVal <= 50) {
      setRoom((prev) => ({ ...prev, thickness: numVal }));
    }
  };

  const handleThicknessBlur = () => {
    const numVal = Number(thicknessInput);
    const valid = !thicknessInput || numVal < 5 ? 15 : Math.min(50, numVal);
    setThicknessInput(String(valid));
    setRoom((prev) => ({ ...prev, thickness: valid }));
  };

  const handleDoorSizeTyping = (field, rawValue) => {
    const cleaned = rawValue.replace(/[^0-9]/g, "");
    setDoorInputs((prev) => ({ ...prev, [field]: cleaned }));

    if (cleaned === "") return;
    const numVal = Number(cleaned);

    if (field === "width") {
      const maxW = Math.max(50, frontWidthCm - 10);
      if (numVal >= 50 && numVal <= maxW) {
        setDoor((prev) => ({ ...prev, width: numVal }));
      }
    } else if (field === "height") {
      const maxH = Math.max(150, room.t - 10);
      if (numVal >= 150 && numVal <= maxH) {
        setDoor((prev) => ({ ...prev, height: numVal }));
      }
    }
  };

  const handleDoorSizeBlur = (field) => {
    const numVal = Number(doorInputs[field]);
    if (field === "width") {
      const maxW = Math.max(50, frontWidthCm - 10);
      const validW =
        !doorInputs.width || numVal < 50 ? 50 : Math.min(maxW, numVal);
      setDoorInputs((prev) => ({ ...prev, width: String(validW) }));
      setDoor((prev) => ({ ...prev, width: validW }));
    } else if (field === "height") {
      const maxH = Math.max(150, room.t - 10);
      const validH =
        !doorInputs.height || numVal < 150 ? 150 : Math.min(maxH, numVal);
      setDoorInputs((prev) => ({ ...prev, height: String(validH) }));
      setDoor((prev) => ({ ...prev, height: validH }));
    }
  };

  const handleFurnDimTyping = (field, rawValue) => {
    const cleaned = rawValue.replace(/[^0-9]/g, "");
    setFurnInputs((prev) => ({ ...prev, [field]: cleaned }));
    if (cleaned === "" || !selectedFurniture || selectedFurniture.locked)
      return;

    const numVal = Number(cleaned);
    if (field === "width" && numVal >= 20 && numVal <= frontWidthCm) {
      onUpdateFurniture(selectedFurniture.id, { width: numVal });
    } else if (field === "depth" && numVal >= 20 && numVal <= sideLengthCm) {
      onUpdateFurniture(selectedFurniture.id, { depth: numVal });
    } else if (field === "height" && numVal >= 10 && numVal <= room.t) {
      onUpdateFurniture(selectedFurniture.id, { height: numVal });
    } else if (field === "armDepth" && numVal >= 30 && numVal <= 120) {
      onUpdateFurniture(selectedFurniture.id, { armDepth: numVal });
    }
  };

  const handleFurnDimBlur = (field) => {
    if (!selectedFurniture || selectedFurniture.locked) return;
    const numVal = Number(furnInputs[field]);

    if (field === "width") {
      const valid =
        !furnInputs.width || numVal < 20 ? 30 : Math.min(frontWidthCm, numVal);
      setFurnInputs((prev) => ({ ...prev, width: String(valid) }));
      onUpdateFurniture(selectedFurniture.id, { width: valid });
    } else if (field === "depth") {
      const valid =
        !furnInputs.depth || numVal < 20 ? 30 : Math.min(sideLengthCm, numVal);
      setFurnInputs((prev) => ({ ...prev, depth: String(valid) }));
      onUpdateFurniture(selectedFurniture.id, { depth: valid });
    } else if (field === "height") {
      const valid =
        !furnInputs.height || numVal < 10 ? 20 : Math.min(room.t, numVal);
      setFurnInputs((prev) => ({ ...prev, height: String(valid) }));
      onUpdateFurniture(selectedFurniture.id, { height: valid });
    } else if (field === "armDepth") {
      const maxArm = Math.max(
        30,
        Math.min(selectedFurniture.width - 15, selectedFurniture.depth - 15),
      );
      const valid =
        !furnInputs.armDepth || numVal < 30 ? 45 : Math.min(maxArm, numVal);
      setFurnInputs((prev) => ({ ...prev, armDepth: String(valid) }));
      onUpdateFurniture(selectedFurniture.id, { armDepth: valid });
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const pVal = Number(dimInputs.p);
    const lVal = Number(dimInputs.l);
    const tVal = Number(dimInputs.t);

    if (!dimInputs.p || !dimInputs.l || !dimInputs.t) {
      setDimErrorKey("empty");
      return;
    }

    if (pVal < 50 || lVal < 50 || tVal < 50) {
      setDimErrorKey("min50");
      return;
    }

    setDimErrorKey("");
    onCreateRoom({
      ...room,
      p: pVal,
      l: lVal,
      t: tVal,
    });
  };

  const toggleWallSelection = (wallId) => {
    setSelectedWalls((prev) => {
      if (prev.includes(wallId)) {
        return prev.length > 1 ? prev.filter((id) => id !== wallId) : prev;
      }
      return [...prev, wallId];
    });
  };

  const selectAllWalls = () => {
    setSelectedWalls(["front", "back", "left", "right"]);
  };

  const handleSelectPaintMode = (mode) => {
    onUpdateSelectedWalls({ mode });
    if (mode !== "full") {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          paintSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        });
      });
    }
  };

  const activeWall = walls[selectedWalls[0] || "front"];

  const applyDoorPreset = (preset) => {
    let nextOffset = 15;
    if (preset === "left") {
      nextOffset = Math.min(15, maxDoorOffset);
    } else if (preset === "center") {
      nextOffset = Math.round(maxDoorOffset / 2);
    } else if (preset === "right") {
      nextOffset = Math.max(0, maxDoorOffset - 15);
    }
    setDoor((prev) => ({ ...prev, align: preset, offset: nextOffset }));
  };

  const handleResetAllClick = () => {
    if (!confirmResetAll) {
      setConfirmResetAll(true);
      return;
    }
    setConfirmResetAll(false);
    onResetAll();
  };

  const distFromRight = Math.max(0, maxDoorOffset - clampedDoorOffset);
  const isDoorCentered = door.align === "center";
  const isDoorRight = door.align === "right";

  const referenceDimension =
    activeWall.mode === "split-h"
      ? room.t
      : selectedWalls[0] === "left" || selectedWalls[0] === "right"
        ? sideLengthCm
        : frontWidthCm;
  const splitInCm = Math.round(
    (activeWall.splitRatio / 100) * referenceDimension,
  );

  const doorLeftPct =
    frontWidthCm > 0 ? (clampedDoorOffset / frontWidthCm) * 100 : 0;
  const doorWidthPct =
    frontWidthCm > 0 ? Math.min(100, (door.width / frontWidthCm) * 100) : 25;

  const cardClass = isDark
    ? "rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 shadow-xs"
    : "rounded-xl border border-zinc-300/90 bg-white p-3.5 shadow-xs";

  const subCardClass = isDark
    ? "rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
    : "rounded-xl border border-zinc-200 bg-zinc-100/80 p-3";

  const inputClass = isDark
    ? "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 shadow-xs placeholder:font-normal placeholder:text-zinc-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
    : "w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-900 shadow-xs placeholder:font-normal placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

  const getCameraBtnClass = (presetKey) => {
    const isActive = viewMode === "3d" && activeCameraPreset === presetKey;
    if (isActive) {
      return "flex items-center justify-center gap-1.5 rounded-lg border border-blue-600 bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white shadow-xs transition";
    }
    return isDark
      ? "flex items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
      : "flex items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs transition hover:border-zinc-400 hover:bg-zinc-50";
  };

  const wallDistances = selectedFurniture
    ? getWallDistancesCm(selectedFurniture, frontWidthCm, sideLengthCm)
    : null;

  const isLocked = Boolean(selectedFurniture?.locked);

  return (
    <aside
      style={{ "--panel-w": `${panelWidth}px` }}
      className={`relative flex h-full w-full flex-col border-l transition-colors md:w-[var(--panel-w)] ${
        isDark
          ? "border-zinc-800 bg-zinc-950 text-zinc-100"
          : "border-zinc-300 bg-zinc-50/70 text-zinc-900"
      }`}
    >
      {/* Resizable Handle */}
      <div
        onMouseDown={handleStartResize}
        title="Tarik untuk mengubah lebar panel"
        className="group absolute inset-y-0 -left-1.5 z-30 hidden w-3 cursor-col-resize items-center justify-center md:flex"
      >
        <div
          className={`h-10 w-1 rounded-full transition-all ${
            isResizing
              ? "h-16 bg-blue-500"
              : isDark
                ? "bg-zinc-700/0 group-hover:bg-zinc-600"
                : "bg-zinc-400/0 group-hover:bg-zinc-400"
          }`}
        />
      </div>

      {/* HEADER */}
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${
          isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
        }`}
      >
        <div className="min-w-0 pr-2">
          <h1 className="truncate text-sm font-semibold tracking-tight">
            MyRoomPlanner
          </h1>
          <p
            className={`truncate text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
          >
            {t.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div
            className={`flex rounded-lg border p-0.5 text-[11px] font-semibold ${
              isDark
                ? "border-zinc-700 bg-zinc-950"
                : "border-zinc-300 bg-zinc-100"
            }`}
          >
            <button
              type="button"
              onClick={() => setLang("id")}
              className={`rounded-md px-2 py-1 transition ${
                lang === "id"
                  ? isDark
                    ? "bg-zinc-800 text-white shadow-2xs"
                    : "bg-white text-zinc-900 shadow-2xs"
                  : isDark
                    ? "text-zinc-400 hover:text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-md px-2 py-1 transition ${
                lang === "en"
                  ? isDark
                    ? "bg-zinc-800 text-white shadow-2xs"
                    : "bg-white text-zinc-900 shadow-2xs"
                  : isDark
                    ? "text-zinc-400 hover:text-zinc-200"
                    : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              EN
            </button>
          </div>

          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            title={isDark ? "Ganti ke Light Mode" : "Ganti ke Dark Mode"}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              isDark
                ? "border-zinc-700 bg-zinc-800 text-amber-400 hover:border-zinc-600 hover:bg-zinc-700"
                : "border-zinc-300 bg-white text-zinc-700 shadow-2xs hover:border-zinc-400 hover:bg-zinc-50"
            }`}
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* KONTEN SCROLLABLE */}
      <div
        className={`flex-1 space-y-4 overflow-y-auto p-4 ${
          isDark ? "dark-scroll" : "light-scroll"
        }`}
      >
        {/* BAGIAN 1: TAMPILAN 3D / 2D DENAH, SNAP & KAMERA */}
        <section className={cardClass}>
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">{t.viewAndCamera}</span>

            <div
              className={`flex rounded-lg border p-0.5 text-[11px] font-semibold ${
                isDark
                  ? "border-zinc-700 bg-zinc-950"
                  : "border-zinc-300 bg-zinc-100"
              }`}
            >
              <button
                type="button"
                disabled={!isRoomCreated}
                onClick={() => setViewMode("3d")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition disabled:opacity-40 ${
                  viewMode === "3d"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : isDark
                      ? "text-zinc-400 hover:text-zinc-200"
                      : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Box className="h-3 w-3" />
                <span>{t.mode3D}</span>
              </button>
              <button
                type="button"
                disabled={!isRoomCreated}
                onClick={() => setViewMode("2d")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 transition disabled:opacity-40 ${
                  viewMode === "2d"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : isDark
                      ? "text-zinc-400 hover:text-zinc-200"
                      : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Grid className="h-3 w-3" />
                <span>{t.mode2D}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={!isRoomCreated}
              onClick={() => {
                setViewMode("3d");
                onSetCameraPreset("iso");
              }}
              className={`${getCameraBtnClass("iso")} disabled:opacity-40`}
            >
              <Compass className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.camIso}</span>
            </button>
            <button
              type="button"
              disabled={!isRoomCreated}
              onClick={() => {
                setViewMode("3d");
                onSetCameraPreset("top");
              }}
              className={`${getCameraBtnClass("top")} disabled:opacity-40`}
            >
              <Layers className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.camTop}</span>
            </button>
            <button
              type="button"
              disabled={!isRoomCreated}
              onClick={() => {
                setViewMode("3d");
                onSetCameraPreset("door");
              }}
              className={`${getCameraBtnClass("door")} disabled:opacity-40`}
            >
              <DoorOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.camDoor}</span>
            </button>
          </div>

          {/* Bar Toggle: Auto-Hide Tembok + Magnetic Snap */}
          <div
            className={`mt-2 grid gap-1.5 ${viewMode === "3d" ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {viewMode === "3d" && (
              <button
                type="button"
                disabled={!isRoomCreated}
                onClick={() => setAutoHideWalls(!autoHideWalls)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                  autoHideWalls
                    ? isDark
                      ? "border-zinc-100 bg-zinc-100 text-zinc-900 shadow-xs"
                      : "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                    : isDark
                      ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200/70"
                }`}
              >
                {autoHideWalls ? (
                  <EyeOff className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{t.autoHideWalls}</span>
              </button>
            )}

            <button
              type="button"
              disabled={!isRoomCreated}
              onClick={() => setSnapEnabled(!snapEnabled)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                snapEnabled
                  ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                  : isDark
                    ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200/70"
              }`}
            >
              <Magnet className="h-3.5 w-3.5 shrink-0" />
              <span>
                {t.snapLabel}: {snapEnabled ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </section>

        {/* MODE A: INSPECTOR FURNITUR */}
        {selectedFurniture ? (
          <section className={`space-y-3.5 ${cardClass}`}>
            {/* Bar Kembali + Lock, Duplikat & Hapus */}
            <div
              className={`flex items-center justify-between gap-1.5 border-b pb-2.5 ${
                isDark ? "border-zinc-800" : "border-zinc-200/80"
              }`}
            >
              <button
                type="button"
                onClick={onDeselectFurniture}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  isDark
                    ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    : "border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
                }`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>{t.backToRoom}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleLockFurniture(selectedFurniture.id)}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    isLocked
                      ? "border-amber-500 bg-amber-500 text-zinc-950 shadow-xs"
                      : isDark
                        ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {isLocked ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    <Unlock className="h-3.5 w-3.5" />
                  )}
                  <span>{isLocked ? t.unlockItem : t.lockItem}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDuplicateFurniture(selectedFurniture.id)}
                  title={t.duplicateItem}
                  className={`flex items-center justify-center rounded-lg border p-1.5 text-xs font-semibold transition ${
                    isDark
                      ? "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => onDeleteFurniture(selectedFurniture.id)}
                  title={isLocked ? t.unlockItem : t.deleteItem}
                  className={`flex items-center justify-center rounded-lg border p-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
                    isDark
                      ? "border-red-500/40 bg-red-950/50 text-red-300 hover:bg-red-900/60"
                      : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Banner Status Locked */}
            {isLocked && (
              <div
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-medium ${
                  isDark
                    ? "border-amber-500/40 bg-amber-950/40 text-amber-200"
                    : "border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span>{t.lockedBanner}</span>
              </div>
            )}

            {/* Peringatan Tabrakan / Menghalangi Pintu */}
            {(selectedConflict?.hasOverlap ||
              selectedConflict?.hasDoorBlock) && (
              <div
                className={`space-y-1 rounded-lg border px-2.5 py-2 text-[11px] font-medium ${
                  isDark
                    ? "border-red-500/40 bg-red-950/60 text-red-300"
                    : "border-red-300 bg-red-50 text-red-700"
                }`}
              >
                {selectedConflict.hasOverlap && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{t.warnOverlap}</span>
                  </div>
                )}
                {selectedConflict.hasDoorBlock && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>{t.warnDoorBlock}</span>
                  </div>
                )}
              </div>
            )}

            {/* Opsi Tipe & Varian Khusus per Kategori */}
            <div
              className={`space-y-2.5 ${subCardClass} ${
                isLocked ? "pointer-events-none opacity-55" : ""
              }`}
            >
              <label
                className={`block text-[11px] font-semibold ${
                  isDark ? "text-zinc-300" : "text-zinc-700"
                }`}
              >
                {t.variantType}
              </label>

              {selectedFurniture.type === "bed" && (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "frame", label: t.bedFrame, defaultH: 50 },
                      { id: "floor", label: t.bedFloor, defaultH: 24 },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdateFurniture(selectedFurniture.id, {
                            bedStyle: opt.id,
                            height: opt.defaultH,
                          })
                        }
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                          selectedFurniture.bedStyle === opt.id
                            ? isDark
                              ? "border-zinc-100 bg-zinc-100 text-zinc-900"
                              : "border-zinc-900 bg-zinc-900 text-white"
                            : isDark
                              ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                              : "border-zinc-300 bg-white text-zinc-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1">
                    <span className="mb-1 block text-[10px] font-medium text-zinc-500">
                      {t.quickSizePreset}
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {BED_SIZE_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() =>
                            onUpdateFurniture(selectedFurniture.id, {
                              width: p.w,
                              depth: p.d,
                            })
                          }
                          className={`rounded-md border py-1 text-[10px] font-semibold transition ${
                            selectedFurniture.width === p.w &&
                            selectedFurniture.depth === p.d
                              ? "border-blue-600 bg-blue-600 text-white"
                              : isDark
                                ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedFurniture.type === "desk" && (
                <>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "rect", label: t.deskRect },
                      { id: "l-shape", label: t.deskL },
                      { id: "round", label: t.deskRound },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdateFurniture(selectedFurniture.id, {
                            deskShape: opt.id,
                          })
                        }
                        className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                          selectedFurniture.deskShape === opt.id
                            ? isDark
                              ? "border-zinc-100 bg-zinc-100 text-zinc-900"
                              : "border-zinc-900 bg-zinc-900 text-white"
                            : isDark
                              ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                              : "border-zinc-300 bg-white text-zinc-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {selectedFurniture.deskShape === "l-shape" && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">
                          {t.lCornerLabel}
                        </span>
                        <div className="flex gap-1">
                          {[
                            { id: "left", label: t.lCornerLeft },
                            { id: "right", label: t.lCornerRight },
                          ].map((side) => (
                            <button
                              key={side.id}
                              type="button"
                              onClick={() =>
                                onUpdateFurniture(selectedFurniture.id, {
                                  lCorner: side.id,
                                })
                              }
                              className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                                selectedFurniture.lCorner === side.id
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : isDark
                                    ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                                    : "border-zinc-300 bg-white text-zinc-700"
                              }`}
                            >
                              {side.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-500">
                          {t.armDepthLabel}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={furnInputs.armDepth}
                          onChange={(e) =>
                            handleFurnDimTyping("armDepth", e.target.value)
                          }
                          onBlur={() => handleFurnDimBlur("armDepth")}
                          className={`${inputClass} !w-20 text-right`}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedFurniture.type === "wardrobe" && (
                <div className="space-y-2.5">
                  {/* Pilihan Susunan Pintu: Vertikal vs Grid (Susun) */}
                  <div>
                    <span className="mb-1 block text-[11px] text-zinc-500">
                      {t.wardrobeLayoutLabel}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: "vertical", label: t.wardrobeVertical },
                        { id: "grid", label: t.wardrobeGrid },
                      ].map((lay) => (
                        <button
                          key={lay.id}
                          type="button"
                          onClick={() =>
                            onUpdateFurniture(selectedFurniture.id, {
                              wardrobeLayout: lay.id,
                            })
                          }
                          className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                            (selectedFurniture.wardrobeLayout || "vertical") ===
                            lay.id
                              ? isDark
                                ? "border-zinc-100 bg-zinc-100 text-zinc-900"
                                : "border-zinc-900 bg-zinc-900 text-white"
                              : isDark
                                ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                                : "border-zinc-300 bg-white text-zinc-700"
                          }`}
                        >
                          {lay.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(selectedFurniture.wardrobeLayout || "vertical") ===
                  "vertical" ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">
                        {t.doorCountLabel}
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() =>
                              onUpdateFurniture(selectedFurniture.id, {
                                doorCount: cnt,
                              })
                            }
                            className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${
                              selectedFurniture.doorCount === cnt
                                ? "border-blue-600 bg-blue-600 text-white"
                                : isDark
                                  ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                                  : "border-zinc-300 bg-white text-zinc-700"
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">
                          {t.wardrobeColsLabel}
                        </span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() =>
                                onUpdateFurniture(selectedFurniture.id, {
                                  wardrobeCols: c,
                                })
                              }
                              className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${
                                (selectedFurniture.wardrobeCols || 2) === c
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : isDark
                                    ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                                    : "border-zinc-300 bg-white text-zinc-700"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">
                          {t.wardrobeRowsLabel}
                        </span>
                        <div className="flex gap-1">
                          {[2, 3, 4, 5].map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() =>
                                onUpdateFurniture(selectedFurniture.id, {
                                  wardrobeRows: r,
                                })
                              }
                              className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${
                                (selectedFurniture.wardrobeRows || 3) === r
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : isDark
                                    ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                                    : "border-zinc-300 bg-white text-zinc-700"
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "swing", label: t.wardrobeSwing },
                      { id: "sliding", label: t.wardrobeSliding },
                    ].map((mech) => (
                      <button
                        key={mech.id}
                        type="button"
                        onClick={() =>
                          onUpdateFurniture(selectedFurniture.id, {
                            wardrobeDoorType: mech.id,
                          })
                        }
                        className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                          selectedFurniture.wardrobeDoorType === mech.id
                            ? "border-blue-600 bg-blue-600 text-white"
                            : isDark
                              ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                              : "border-zinc-300 bg-white text-zinc-700"
                        }`}
                      >
                        {mech.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedFurniture.type === "chair" && (
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "standard", label: t.chairStandard },
                    { id: "office", label: t.chairOffice },
                    { id: "stool", label: t.chairStool },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdateFurniture(selectedFurniture.id, {
                          chairStyle: opt.id,
                          height: opt.id === "stool" ? 45 : 85,
                        })
                      }
                      className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                        selectedFurniture.chairStyle === opt.id
                          ? isDark
                            ? "border-zinc-100 bg-zinc-100 text-zinc-900"
                            : "border-zinc-900 bg-zinc-900 text-white"
                          : isDark
                            ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                            : "border-zinc-300 bg-white text-zinc-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dimensi P × L × T */}
            <div className={isLocked ? "pointer-events-none opacity-55" : ""}>
              <label
                className={`mb-1.5 block text-[11px] font-semibold ${
                  isDark ? "text-zinc-300" : "text-zinc-700"
                }`}
              >
                {t.dimensionsCm}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="mb-1 block text-[10px] text-zinc-500">
                    {t.dimWidthX}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isLocked}
                    value={furnInputs.width}
                    onChange={(e) =>
                      handleFurnDimTyping("width", e.target.value)
                    }
                    onBlur={() => handleFurnDimBlur("width")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[10px] text-zinc-500">
                    {t.dimDepthZ}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isLocked}
                    value={furnInputs.depth}
                    onChange={(e) =>
                      handleFurnDimTyping("depth", e.target.value)
                    }
                    onBlur={() => handleFurnDimBlur("depth")}
                    className={inputClass}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[10px] text-zinc-500">
                    {t.dimHeightY}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={isLocked}
                    value={furnInputs.height}
                    onChange={(e) =>
                      handleFurnDimTyping("height", e.target.value)
                    }
                    onBlur={() => handleFurnDimBlur("height")}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Rotasi / Orientasi */}
            <div
              className={`space-y-2 ${subCardClass} ${
                isLocked ? "pointer-events-none opacity-55" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold">
                  {t.rotationTitle}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                    isDark
                      ? "bg-zinc-800 text-zinc-100"
                      : "bg-white text-zinc-900"
                  }`}
                >
                  {selectedFurniture.rotation}°
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() =>
                    onUpdateFurniture(selectedFurniture.id, {
                      rotation: (selectedFurniture.rotation + 90) % 360,
                    })
                  }
                  className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                    isDark
                      ? "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                      : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>+90°</span>
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() =>
                    onUpdateFurniture(selectedFurniture.id, {
                      rotation: (selectedFurniture.rotation + 270) % 360,
                    })
                  }
                  className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                    isDark
                      ? "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                      : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  <RotateCw className="h-3 w-3" />
                  <span>-90°</span>
                </button>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() =>
                    onUpdateFurniture(selectedFurniture.id, { rotation: 0 })
                  }
                  className={`rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                    isDark
                      ? "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                      : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                  }`}
                >
                  0°
                </button>
              </div>

              <input
                type="range"
                disabled={isLocked}
                min="0"
                max="355"
                step="5"
                value={selectedFurniture.rotation}
                onChange={(e) =>
                  onUpdateFurniture(selectedFurniture.id, {
                    rotation: Number(e.target.value),
                  })
                }
                className={`h-2 w-full cursor-pointer appearance-none rounded-full border accent-blue-600 ${
                  isDark
                    ? "border-zinc-700 bg-zinc-800"
                    : "border-zinc-400/40 bg-zinc-300"
                }`}
              />
            </div>

            {/* Jarak Presisi ke 4 Tembok */}
            {wallDistances && (
              <div className={subCardClass}>
                <span className="mb-1.5 block text-[11px] font-semibold">
                  {t.wallDistances}
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div
                    className={`flex justify-between rounded-md border px-2 py-1 ${
                      isDark
                        ? "border-zinc-800 bg-zinc-900"
                        : "border-zinc-200 bg-white"
                    }`}
                  >
                    <span className="text-zinc-500">{t.distLeft}:</span>
                    <span className="font-semibold">
                      {wallDistances.left} cm
                    </span>
                  </div>
                  <div
                    className={`flex justify-between rounded-md border px-2 py-1 ${
                      isDark
                        ? "border-zinc-800 bg-zinc-900"
                        : "border-zinc-200 bg-white"
                    }`}
                  >
                    <span className="text-zinc-500">{t.distRight}:</span>
                    <span className="font-semibold">
                      {wallDistances.right} cm
                    </span>
                  </div>
                  <div
                    className={`flex justify-between rounded-md border px-2 py-1 ${
                      isDark
                        ? "border-zinc-800 bg-zinc-900"
                        : "border-zinc-200 bg-white"
                    }`}
                  >
                    <span className="text-zinc-500">{t.distBack}:</span>
                    <span className="font-semibold">
                      {wallDistances.back} cm
                    </span>
                  </div>
                  <div
                    className={`flex justify-between rounded-md border px-2 py-1 ${
                      isDark
                        ? "border-zinc-800 bg-zinc-900"
                        : "border-zinc-200 bg-white"
                    }`}
                  >
                    <span className="text-zinc-500">{t.distFront}:</span>
                    <span className="font-semibold">
                      {wallDistances.front} cm
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Warna Furnitur */}
            <div className={`space-y-2.5 ${subCardClass}`}>
              <ColorPicker
                theme={theme}
                lang={lang}
                label={
                  selectedFurniture.type === "bed"
                    ? t.colorMattress
                    : selectedFurniture.type === "desk"
                      ? t.colorTableTop
                      : selectedFurniture.type === "wardrobe"
                        ? t.colorWardrobeBody
                        : t.colorSeat
                }
                color={selectedFurniture.color1}
                onChange={(hex) =>
                  onUpdateFurniture(selectedFurniture.id, { color1: hex })
                }
              />

              {!(
                selectedFurniture.type === "bed" &&
                selectedFurniture.bedStyle === "floor"
              ) && (
                <ColorPicker
                  theme={theme}
                  lang={lang}
                  label={
                    selectedFurniture.type === "bed"
                      ? t.colorBedFrame
                      : selectedFurniture.type === "desk"
                        ? t.colorTableLegs
                        : selectedFurniture.type === "wardrobe"
                          ? t.colorWardrobeDoor
                          : t.colorChairLegs
                  }
                  color={selectedFurniture.color2}
                  onChange={(hex) =>
                    onUpdateFurniture(selectedFurniture.id, { color2: hex })
                  }
                />
              )}
            </div>

            <p className="text-[11px] leading-relaxed text-zinc-500">
              {t.dragTip}
            </p>
          </section>
        ) : (
          /* MODE B: PENGATURAN KAMAR, PINTU & CAT */
          <>
            <form
              onSubmit={handleCreateSubmit}
              className={`space-y-3 ${cardClass}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold">{t.sec1Title}</h2>
                {isRoomCreated && (
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      isDark
                        ? "bg-zinc-800 text-zinc-300"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {((room.p * room.l) / 10000).toFixed(2)} m²
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label
                    className={`mb-1 block text-[11px] font-medium ${
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    {t.lengthP}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="300"
                    value={dimInputs.p}
                    onChange={(e) => handleDimensionChange("p", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    className={`mb-1 block text-[11px] font-medium ${
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    {t.widthL}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="400"
                    value={dimInputs.l}
                    onChange={(e) => handleDimensionChange("l", e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    className={`mb-1 block text-[11px] font-medium ${
                      isDark ? "text-zinc-400" : "text-zinc-600"
                    }`}
                  >
                    {t.heightT}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="280"
                    value={dimInputs.t}
                    onChange={(e) => handleDimensionChange("t", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {dimErrorKey && (
                <div
                  className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-medium ${
                    isDark
                      ? "border-red-500/40 bg-red-950/60 text-red-300"
                      : "border-red-300 bg-red-50 text-red-700"
                  }`}
                >
                  <AlertCircle
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      isDark ? "text-red-400" : "text-red-600"
                    }`}
                  />
                  <span>
                    {dimErrorKey === "empty" ? t.errEmpty : t.errMin50}
                  </span>
                </div>
              )}

              <div
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950/70"
                    : "border-zinc-200 bg-zinc-100/80"
                }`}
              >
                <div>
                  <p className="text-xs font-medium">{t.wallThickness}</p>
                  <p
                    className={`text-[11px] ${isDark ? "text-zinc-500" : "text-zinc-500"}`}
                  >
                    {t.wallThicknessDesc}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const nextAuto = !room.autoThickness;
                      const nextThick = nextAuto ? 15 : room.thickness;
                      setThicknessInput(String(nextThick));
                      setRoom({
                        ...room,
                        autoThickness: nextAuto,
                        thickness: nextThick,
                      });
                    }}
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                      room.autoThickness
                        ? isDark
                          ? "border-zinc-100 bg-zinc-100 text-zinc-900 shadow-xs"
                          : "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                        : isDark
                          ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {t.auto}
                  </button>
                  <div
                    className={`flex items-center rounded-md border px-2 py-1 shadow-xs ${
                      isDark
                        ? "border-zinc-700 bg-zinc-950"
                        : "border-zinc-300 bg-white"
                    }`}
                  >
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={room.autoThickness}
                      value={thicknessInput}
                      onChange={(e) => handleThicknessTyping(e.target.value)}
                      onBlur={handleThicknessBlur}
                      className={`w-8 bg-transparent text-right text-xs font-semibold focus:outline-none ${
                        isDark
                          ? "text-zinc-100 disabled:text-zinc-600"
                          : "text-zinc-900 disabled:text-zinc-400"
                      }`}
                    />
                    <span className="ml-1 text-[11px] text-zinc-500">cm</span>
                  </div>
                </div>
              </div>

              {!isRoomCreated && (
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t.createRoomBtn}</span>
                </button>
              )}
            </form>

            <section className={`space-y-3 ${cardClass}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold">{t.sec2Title}</h2>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                    isDark
                      ? "bg-zinc-800 text-zinc-300"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {door.width} × {door.height} cm
                </span>
              </div>

              <div
                className={`rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${
                  isDark
                    ? "border-blue-500/30 bg-blue-950/40 text-blue-200"
                    : "border-blue-200 bg-blue-50 text-blue-900"
                }`}
              >
                <span className="font-semibold">{t.doorRefNote}</span>{" "}
                {t.doorRefDesc1}{" "}
                <span className="font-semibold">{t.doorRefFront}</span>{" "}
                {t.doorRefDesc2}
              </div>

              <div>
                <label
                  className={`mb-1.5 block text-[11px] font-medium ${
                    isDark ? "text-zinc-400" : "text-zinc-600"
                  }`}
                >
                  {t.doorWallPos}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDoor({ ...door, onSide: "panjang" })}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                      door.onSide === "panjang"
                        ? isDark
                          ? "border-zinc-100 bg-zinc-100 text-zinc-900 shadow-xs"
                          : "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                        : isDark
                          ? "border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                          : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white"
                    }`}
                  >
                    {t.sideLength} ({dimInputs.p || room.p} cm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDoor({ ...door, onSide: "lebar" })}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                      door.onSide === "lebar"
                        ? isDark
                          ? "border-zinc-100 bg-zinc-100 text-zinc-900 shadow-xs"
                          : "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                        : isDark
                          ? "border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                          : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white"
                    }`}
                  >
                    {t.sideWidth} ({dimInputs.l || room.l} cm)
                  </button>
                </div>
              </div>

              <div className={`space-y-2.5 ${subCardClass}`}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-semibold ${
                      isDark ? "text-zinc-300" : "text-zinc-700"
                    }`}
                  >
                    {t.posOnWall}
                  </span>
                  <div className="flex gap-1">
                    {[
                      { id: "left", label: t.posLeft },
                      { id: "center", label: t.posCenter },
                      { id: "right", label: t.posRight },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => applyDoorPreset(pos.id)}
                        className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                          door.align === pos.id
                            ? isDark
                              ? "border-zinc-100 bg-zinc-100 text-zinc-900 shadow-xs"
                              : "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                            : isDark
                              ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                              : "border-zinc-300 bg-white text-zinc-700 shadow-xs hover:border-zinc-400 hover:bg-zinc-50"
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`transition-opacity ${isDoorCentered ? "opacity-45" : "opacity-100"}`}
                >
                  <div className="mb-1.5 flex items-center justify-between text-[11px]">
                    <span
                      className={`font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                    >
                      {isDoorCentered
                        ? t.lockedCenter
                        : isDoorRight
                          ? t.distFromRight
                          : t.distFromLeft}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-semibold shadow-2xs ${
                        isDark
                          ? "bg-zinc-800 text-zinc-100"
                          : "bg-white text-zinc-900"
                      }`}
                    >
                      {isDoorCentered
                        ? t.centerBadge
                        : `${isDoorRight ? distFromRight : clampedDoorOffset} cm`}
                    </span>
                  </div>

                  <input
                    type="range"
                    dir={isDoorRight ? "rtl" : "ltr"}
                    disabled={isDoorCentered}
                    min="0"
                    max={maxDoorOffset}
                    value={isDoorRight ? distFromRight : clampedDoorOffset}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const nextOffset = isDoorRight
                        ? maxDoorOffset - val
                        : val;
                      setDoor({ ...door, offset: nextOffset });
                    }}
                    className={`h-2 w-full cursor-pointer appearance-none rounded-full border accent-blue-600 disabled:cursor-not-allowed ${
                      isDark
                        ? "border-zinc-700 bg-zinc-800"
                        : "border-zinc-400/40 bg-zinc-300"
                    }`}
                  />

                  <div className="mt-1 flex justify-between text-[10px] font-medium text-zinc-500">
                    {isDoorCentered ? (
                      <>
                        <span>
                          {t.leftDistLabel}: {clampedDoorOffset} cm
                        </span>
                        <span>
                          {t.rightDistLabel}: {distFromRight} cm
                        </span>
                      </>
                    ) : isDoorRight ? (
                      <>
                        <span>
                          {t.slideLeftHint} ({maxDoorOffset} cm)
                        </span>
                        <span>{t.flushRightHint}</span>
                      </>
                    ) : (
                      <>
                        <span>{t.flushLeftHint}</span>
                        <span>
                          {t.slideRightHint} ({maxDoorOffset} cm) →
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label
                      className={`mb-1 block text-[11px] font-medium ${
                        isDark ? "text-zinc-400" : "text-zinc-600"
                      }`}
                    >
                      {t.doorWidth}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="50"
                      value={doorInputs.width}
                      onChange={(e) =>
                        handleDoorSizeTyping("width", e.target.value)
                      }
                      onBlur={() => handleDoorSizeBlur("width")}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      className={`mb-1 block text-[11px] font-medium ${
                        isDark ? "text-zinc-400" : "text-zinc-600"
                      }`}
                    >
                      {t.doorHeight}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="210"
                      value={doorInputs.height}
                      onChange={(e) =>
                        handleDoorSizeTyping("height", e.target.value)
                      }
                      onBlur={() => handleDoorSizeBlur("height")}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDoor({
                        ...door,
                        swing: door.swing === "inward" ? "outward" : "inward",
                      })
                    }
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold shadow-xs transition ${
                      isDark
                        ? "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50"
                    }`}
                  >
                    {t.swingLabel}:{" "}
                    {door.swing === "inward" ? t.swingInward : t.swingOutward}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDoor({
                        ...door,
                        hinge: door.hinge === "left" ? "right" : "left",
                      })
                    }
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold shadow-xs transition ${
                      isDark
                        ? "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50"
                    }`}
                  >
                    {t.hingeLabel}:{" "}
                    {door.hinge === "left" ? t.hingeLeft : t.hingeRight}
                  </button>
                </div>
              </div>
            </section>

            <section
              ref={paintSectionRef}
              className={`scroll-mb-6 space-y-3 ${cardClass} ${
                !isRoomCreated ? "pointer-events-none opacity-45" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold">{t.sec3Title}</h2>
                <button
                  type="button"
                  onClick={selectAllWalls}
                  className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold transition ${
                    selectedWalls.length === 4
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : isDark
                        ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                        : "border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {t.allSides} ({selectedWalls.length}/4)
                </button>
              </div>

              <div className={subCardClass}>
                <div className="mx-auto flex max-w-[230px] flex-col items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleWallSelection("back")}
                    className={`h-6 w-32 rounded-md border text-[11px] font-semibold transition ${
                      selectedWalls.includes("back")
                        ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                        : isDark
                          ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                          : "border-zinc-300 bg-white text-zinc-700 shadow-xs hover:border-zinc-400"
                    }`}
                  >
                    {t.wallBack}
                  </button>

                  <div className="flex w-full items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleWallSelection("left")}
                      className={`h-20 w-7 rounded-md border text-[11px] font-semibold transition [writing-mode:vertical-rl] rotate-180 ${
                        selectedWalls.includes("left")
                          ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                          : isDark
                            ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                            : "border-zinc-300 bg-white text-zinc-700 shadow-xs hover:border-zinc-400"
                      }`}
                    >
                      {t.wallLeft}
                    </button>

                    <div
                      className={`flex h-20 flex-1 flex-col items-center justify-center rounded-lg border border-dashed px-1 text-center ${
                        isDark
                          ? "border-zinc-700 bg-zinc-900/80"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      <span
                        className={`text-[11px] font-semibold ${
                          isDark ? "text-zinc-300" : "text-zinc-700"
                        }`}
                      >
                        {t.selectWallPrompt}
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium text-zinc-500">
                        {frontWidthCm} × {sideLengthCm} cm
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleWallSelection("right")}
                      className={`h-20 w-7 rounded-md border text-[11px] font-semibold transition [writing-mode:vertical-rl] ${
                        selectedWalls.includes("right")
                          ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                          : isDark
                            ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                            : "border-zinc-300 bg-white text-zinc-700 shadow-xs hover:border-zinc-400"
                      }`}
                    >
                      {t.wallRight}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleWallSelection("front")}
                    className={`relative h-7 w-32 overflow-hidden rounded-md border text-[11px] font-semibold transition ${
                      selectedWalls.includes("front")
                        ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                        : isDark
                          ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                          : "border-zinc-300 bg-white text-zinc-700 shadow-xs hover:border-zinc-400"
                    }`}
                  >
                    <span className="relative z-10">{t.wallFrontDoor}</span>
                    <span
                      className="absolute bottom-0 h-1.5 rounded-t-xs bg-amber-400"
                      style={{
                        left: `${doorLeftPct}%`,
                        width: `${doorWidthPct}%`,
                      }}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label
                  className={`mb-1.5 block text-[11px] font-medium ${
                    isDark ? "text-zinc-400" : "text-zinc-600"
                  }`}
                >
                  {t.paintPattern}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPaintMode("full")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition ${
                      activeWall.mode === "full"
                        ? isDark
                          ? "border-zinc-100 bg-zinc-100 text-zinc-900 shadow-xs"
                          : "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                        : isDark
                          ? "border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                          : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-md border ${
                        activeWall.mode === "full"
                          ? isDark
                            ? "border-zinc-900/40 bg-zinc-900/15"
                            : "border-white/70 bg-white/25"
                          : isDark
                            ? "border-zinc-500 bg-zinc-700"
                            : "border-zinc-400 bg-zinc-200"
                      }`}
                    />
                    <span className="text-[11px]">{t.modeFull}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPaintMode("split-h")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition ${
                      activeWall.mode === "split-h"
                        ? isDark
                          ? "border-zinc-100 bg-zinc-100 text-zinc-900 shadow-xs"
                          : "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                        : isDark
                          ? "border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                          : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white"
                    }`}
                  >
                    <div
                      className={`relative h-6 w-6 rounded-md border ${
                        activeWall.mode === "split-h"
                          ? isDark
                            ? "border-zinc-900/40 bg-zinc-900/15"
                            : "border-white/70 bg-white/25"
                          : isDark
                            ? "border-zinc-500 bg-zinc-700"
                            : "border-zinc-400 bg-zinc-200"
                      }`}
                    >
                      <span
                        className={`absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 ${
                          activeWall.mode === "split-h"
                            ? isDark
                              ? "bg-zinc-900"
                              : "bg-white"
                            : isDark
                              ? "bg-zinc-200"
                              : "bg-zinc-800"
                        }`}
                      />
                    </div>
                    <span className="text-[11px]">{t.modeHorizontal}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPaintMode("split-v")}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition ${
                      activeWall.mode === "split-v"
                        ? isDark
                          ? "border-zinc-100 bg-zinc-100 text-zinc-900 shadow-xs"
                          : "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                        : isDark
                          ? "border-zinc-700 bg-zinc-800/70 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                          : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white"
                    }`}
                  >
                    <div
                      className={`relative h-6 w-6 rounded-md border ${
                        activeWall.mode === "split-v"
                          ? isDark
                            ? "border-zinc-900/40 bg-zinc-900/15"
                            : "border-white/70 bg-white/25"
                          : isDark
                            ? "border-zinc-500 bg-zinc-700"
                            : "border-zinc-400 bg-zinc-200"
                      }`}
                    >
                      <span
                        className={`absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 ${
                          activeWall.mode === "split-v"
                            ? isDark
                              ? "bg-zinc-900"
                              : "bg-white"
                            : isDark
                              ? "bg-zinc-200"
                              : "bg-zinc-800"
                        }`}
                      />
                    </div>
                    <span className="text-[11px]">{t.modeVertical}</span>
                  </button>
                </div>
              </div>

              <div className={`space-y-2.5 ${subCardClass}`}>
                <ColorPicker
                  theme={theme}
                  lang={lang}
                  label={
                    activeWall.mode === "full"
                      ? t.paintColor
                      : activeWall.mode === "split-h"
                        ? t.colorTop
                        : t.colorLeft
                  }
                  color={activeWall.color1}
                  onChange={(hex) => onUpdateSelectedWalls({ color1: hex })}
                />

                {activeWall.mode !== "full" && (
                  <>
                    <ColorPicker
                      theme={theme}
                      lang={lang}
                      label={
                        activeWall.mode === "split-h"
                          ? t.colorBottom
                          : t.colorRight
                      }
                      color={activeWall.color2}
                      onChange={(hex) => onUpdateSelectedWalls({ color2: hex })}
                    />

                    <div className="pt-1">
                      <div className="mb-1.5 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
                        >
                          {activeWall.mode === "split-h"
                            ? t.splitHeightBottom
                            : t.splitWidthLeft}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-semibold shadow-2xs ${
                            isDark
                              ? "bg-zinc-800 text-zinc-100"
                              : "bg-white text-zinc-900"
                          }`}
                        >
                          {activeWall.splitRatio}% ({splitInCm} cm)
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        value={activeWall.splitRatio}
                        onChange={(e) =>
                          onUpdateSelectedWalls({
                            splitRatio: Number(e.target.value),
                          })
                        }
                        className={`h-2 w-full cursor-pointer appearance-none rounded-full border accent-blue-600 ${
                          isDark
                            ? "border-zinc-700 bg-zinc-800"
                            : "border-zinc-400/40 bg-zinc-300"
                        }`}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {/* FOOTER RESET TERPISAH */}
      <div
        className={`grid grid-cols-2 gap-2 border-t px-4 py-3 ${
          isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
        }`}
      >
        <button
          type="button"
          disabled={!isRoomCreated || unlockedFurnitureCount === 0}
          onClick={onResetFurniture}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isDark
              ? "border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
              : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100"
          }`}
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{t.resetFurniture}</span>
        </button>

        <button
          type="button"
          disabled={!isRoomCreated}
          onClick={handleResetAllClick}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
            confirmResetAll
              ? "border-red-600 bg-red-600 text-white shadow-xs"
              : isDark
                ? "border-red-500/35 bg-red-950/40 text-red-300 hover:border-red-500/60 hover:bg-red-950/70"
                : "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {confirmResetAll ? t.confirmResetAll : t.resetAll}
          </span>
        </button>
      </div>
    </aside>
  );
}
