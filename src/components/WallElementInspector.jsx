import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Lock,
  Unlock,
  Copy,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import ColorPicker from "./ColorPicker";
import WallElevationEditor from "./WallElevationEditor";
import { getWallWidthCm } from "../wallElements";

export default function WallElementInspector({
  element,
  allElements,
  conflict,
  walls,
  door,
  frontWidthCm,
  sideLengthCm,
  roomHeightCm,
  onSelectElement,
  onDeselect,
  onUpdate,
  onToggleLock,
  onDuplicate,
  onDelete,
  onRecordHistorySnapshot,
  subCardClass,
  inputClass,
  theme,
  lang,
  t,
}) {
  const isDark = theme === "dark";
  const isLocked = Boolean(element.locked);
  const wallWidthCm = getWallWidthCm(element.wall, frontWidthCm, sideLengthCm);

  const [inputs, setInputs] = useState({
    width: String(element.width),
    height: String(element.height),
    offsetCm: String(element.offsetCm),
    elevationCm: String(element.elevationCm),
  });

  useEffect(() => {
    setInputs({
      width: String(element.width),
      height: String(element.height),
      offsetCm: String(element.offsetCm),
      elevationCm: String(element.elevationCm),
    });
  }, [
    element.id,
    element.width,
    element.height,
    element.offsetCm,
    element.elevationCm,
  ]);

  const handleTyping = (field, raw) => {
    const cleaned = raw.replace(/[^0-9]/g, "");
    setInputs((prev) => ({ ...prev, [field]: cleaned }));
    if (cleaned === "" || isLocked) return;

    const val = Number(cleaned);
    if (field === "width" && val >= 6 && val <= wallWidthCm) {
      onUpdate(element.id, { width: val }, false);
    } else if (field === "height" && val >= 6 && val <= roomHeightCm) {
      onUpdate(element.id, { height: val }, false);
    } else if (field === "offsetCm") {
      onUpdate(element.id, { offsetCm: val }, false);
    } else if (field === "elevationCm") {
      onUpdate(element.id, { elevationCm: val }, false);
    }
  };

  const handleBlur = (field) => {
    if (isLocked) return;
    const val = Number(inputs[field]);
    const fallback = field === "width" || field === "height" ? 10 : 0;
    const nextVal = inputs[field] === "" ? fallback : val;
    onUpdate(element.id, { [field]: nextVal }, false);
  };

  const elementsOnSameWall = allElements.filter((e) => e.wall === element.wall);

  return (
    <div className="space-y-3.5">
      {/* Header Aksi */}
      <div
        className={`flex items-center justify-between gap-1.5 border-b pb-2.5 ${
          isDark ? "border-zinc-800" : "border-zinc-200/80"
        }`}
      >
        <button
          type="button"
          onClick={onDeselect}
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
            onClick={() => onToggleLock(element.id)}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              isLocked
                ? "border-amber-500 bg-amber-500 text-zinc-950 shadow-xs"
                : isDark
                  ? "border-zinc-700 bg-zinc-800 text-zinc-200"
                  : "border-zinc-300 bg-white text-zinc-700"
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
            onClick={() => onDuplicate(element.id)}
            title={t.duplicateItem}
            className={`rounded-lg border p-1.5 transition ${
              isDark
                ? "border-zinc-700 bg-zinc-800 text-zinc-200"
                : "border-zinc-300 bg-white text-zinc-700"
            }`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            disabled={isLocked}
            onClick={() => onDelete(element.id)}
            className={`rounded-lg border p-1.5 transition disabled:opacity-35 ${
              isDark
                ? "border-red-500/40 bg-red-950/50 text-red-300"
                : "border-red-200 bg-red-50 text-red-600"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Warning Tabrakan / Pintu */}
      {(conflict?.hasOverlap || conflict?.hasDoorBlock) && (
        <div
          className={`space-y-1 rounded-lg border px-2.5 py-2 text-[11px] font-medium ${
            isDark
              ? "border-red-500/40 bg-red-950/60 text-red-300"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {conflict.hasOverlap && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{t.warnWallOverlap}</span>
            </div>
          )}
          {conflict.hasDoorBlock && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{t.warnWallDoorBlock}</span>
            </div>
          )}
        </div>
      )}

      {/* Pilih Sisi Tembok */}
      <div className={isLocked ? "pointer-events-none opacity-55" : ""}>
        <label className="mb-1.5 block text-[11px] font-semibold">
          {t.wallTargetLabel}
        </label>
        <div className="grid grid-cols-4 gap-1">
          {[
            { id: "back", label: t.wallBack },
            { id: "left", label: t.wallLeft },
            { id: "right", label: t.wallRight },
            {
              id: "front",
              label: t.wallFront || (lang === "en" ? "Front" : "Depan"),
            },
          ].map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onUpdate(element.id, { wall: w.id })}
              className={`rounded-lg border py-1.5 text-[11px] font-semibold transition ${
                element.wall === w.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : isDark
                    ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                    : "border-zinc-300 bg-white text-zinc-700"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2D Elevation Live Editor */}
      <div className={subCardClass}>
        <WallElevationEditor
          wallId={element.wall}
          wallPaint={walls[element.wall]}
          frontWidthCm={frontWidthCm}
          sideLengthCm={sideLengthCm}
          roomHeightCm={roomHeightCm}
          door={door}
          elementsOnWall={elementsOnSameWall}
          selectedId={element.id}
          onSelect={onSelectElement}
          onUpdate={onUpdate}
          onRecordHistorySnapshot={onRecordHistorySnapshot}
          isDark={isDark}
          t={t}
        />
      </div>

      {/* Ukuran & Posisi Presisi (cm) */}
      <div
        className={`grid grid-cols-2 gap-2 ${isLocked ? "pointer-events-none opacity-55" : ""}`}
      >
        <div>
          <span className="mb-1 block text-[10px] text-zinc-500">
            {t.elWidthCm}
          </span>
          <input
            type="text"
            inputMode="numeric"
            onFocus={onRecordHistorySnapshot}
            value={inputs.width}
            onChange={(e) => handleTyping("width", e.target.value)}
            onBlur={() => handleBlur("width")}
            className={inputClass}
          />
        </div>
        <div>
          <span className="mb-1 block text-[10px] text-zinc-500">
            {t.elHeightCm}
          </span>
          <input
            type="text"
            inputMode="numeric"
            onFocus={onRecordHistorySnapshot}
            value={inputs.height}
            onChange={(e) => handleTyping("height", e.target.value)}
            onBlur={() => handleBlur("height")}
            className={inputClass}
          />
        </div>
        <div>
          <span className="mb-1 block text-[10px] text-zinc-500">
            {t.elOffsetCm}
          </span>
          <input
            type="text"
            inputMode="numeric"
            onFocus={onRecordHistorySnapshot}
            value={inputs.offsetCm}
            onChange={(e) => handleTyping("offsetCm", e.target.value)}
            onBlur={() => handleBlur("offsetCm")}
            className={inputClass}
          />
        </div>
        <div>
          <span className="mb-1 block text-[10px] text-zinc-500">
            {t.elElevationCm}
          </span>
          <input
            type="text"
            inputMode="numeric"
            onFocus={onRecordHistorySnapshot}
            value={inputs.elevationCm}
            onChange={(e) => handleTyping("elevationCm", e.target.value)}
            onBlur={() => handleBlur("elevationCm")}
            className={inputClass}
          />
        </div>
      </div>

      {/* Warna */}
      <div className={`space-y-2.5 ${subCardClass}`}>
        <ColorPicker
          theme={theme}
          lang={lang}
          label={
            element.type === "window"
              ? t.colorWindowFrame
              : element.type === "ac"
                ? t.colorACBody ||
                  (lang === "en" ? "AC Body Color" : "Warna Bodi AC")
                : t.colorOutletPlate
          }
          color={element.color1}
          onChange={(hex) => onUpdate(element.id, { color1: hex })}
        />
        <ColorPicker
          theme={theme}
          lang={lang}
          label={
            element.type === "window"
              ? t.colorWindowGlass
              : element.type === "ac"
                ? t.colorACLouver ||
                  (lang === "en" ? "Vent / Trim Color" : "Warna Kisi Angin")
                : t.colorOutletSocket
          }
          color={element.color2}
          onChange={(hex) => onUpdate(element.id, { color2: hex })}
        />
      </div>
    </div>
  );
}
