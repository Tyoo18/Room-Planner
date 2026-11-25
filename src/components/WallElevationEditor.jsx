import React, { useRef, useState } from "react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import {
  getWallWidthCm,
  getDoorRectOnFrontWall,
  clampWallElement,
} from "../wallElements";

export default function WallElevationEditor({
  wallId,
  wallPaint,
  frontWidthCm,
  sideLengthCm,
  roomHeightCm,
  door,
  elementsOnWall,
  selectedId,
  onSelect,
  onUpdate,
  onLiveMove,
  onRecordHistorySnapshot,
  isDark,
  t,
}) {
  const boardRef = useRef(null);
  const [nudgeStep, setNudgeStep] = useState(1);
  const [dragPreview, setDragPreview] = useState(null);
  const wallWidthCm = getWallWidthCm(wallId, frontWidthCm, sideLengthCm);

  const selectedEl = elementsOnWall.find((e) => e.id === selectedId) || null;
  const isLocked = Boolean(selectedEl?.locked);

  const handleNudge = (dOffset, dElev) => {
    if (!selectedEl || isLocked) return;
    onRecordHistorySnapshot();
    onUpdate(
      selectedEl.id,
      {
        offsetCm: selectedEl.offsetCm + dOffset * nudgeStep,
        elevationCm: selectedEl.elevationCm + dElev * nudgeStep,
      },
      false,
    );
  };

  const handlePointerDown = (e, el) => {
    e.stopPropagation();
    onSelect(el.id);
    if (el.locked || !boardRef.current) return;

    onRecordHistorySnapshot();
    const rect = boardRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initOffset = el.offsetCm;
    const initElev = el.elevationCm;
    let latestPos = { offsetCm: initOffset, elevationCm: initElev };
    let didMove = false;

    const onMove = (me) => {
      const dxCm = ((me.clientX - startX) / rect.width) * wallWidthCm;
      const dyCm = ((startY - me.clientY) / rect.height) * roomHeightCm;
      const step = me.altKey ? 1 : 5;

      const rawOffset = Math.round((initOffset + dxCm) / step) * step;
      const rawElev = Math.round((initElev + dyCm) / step) * step;

      const clamped = clampWallElement(
        { ...el, offsetCm: rawOffset, elevationCm: rawElev },
        frontWidthCm,
        sideLengthCm,
        roomHeightCm,
      );

      if (
        clamped.offsetCm !== latestPos.offsetCm ||
        clamped.elevationCm !== latestPos.elevationCm
      ) {
        didMove = true;
        latestPos = {
          offsetCm: clamped.offsetCm,
          elevationCm: clamped.elevationCm,
        };
        setDragPreview({ id: el.id, ...latestPos });
        onLiveMove?.(el.id, latestPos.offsetCm, latestPos.elevationCm);
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragPreview(null);
      if (didMove) {
        onUpdate(el.id, latestPos, false);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const getWallBgStyle = () => {
    if (!wallPaint || wallPaint.mode === "full") {
      return { backgroundColor: wallPaint?.color1 || "#F5F3EE" };
    }
    if (wallPaint.mode === "split-h") {
      return {
        background: `linear-gradient(to top, ${wallPaint.color2} 0%, ${wallPaint.color2} ${wallPaint.splitRatio}%, ${wallPaint.color1} ${wallPaint.splitRatio}%, ${wallPaint.color1} 100%)`,
      };
    }
    return {
      background: `linear-gradient(to right, ${wallPaint.color1} 0%, ${wallPaint.color1} ${wallPaint.splitRatio}%, ${wallPaint.color2} ${wallPaint.splitRatio}%, ${wallPaint.color2} 100%)`,
    };
  };

  const doorRect =
    wallId === "front"
      ? getDoorRectOnFrontWall(door, frontWidthCm, roomHeightCm)
      : null;

  const nudgeBtnClass = `flex h-7 w-7 items-center justify-center rounded-md border transition disabled:opacity-35 ${
    isDark
      ? "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700"
      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200"
  }`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold">{t.elevationTitle}</span>
        <span className="text-[10px] text-zinc-500">
          {wallWidthCm} × {roomHeightCm} cm
        </span>
      </div>

      <div
        className={`flex items-center justify-center rounded-xl border p-2.5 ${
          isDark
            ? "border-zinc-800 bg-zinc-950/90"
            : "border-zinc-200 bg-zinc-100/90"
        }`}
      >
        <div
          ref={boardRef}
          style={{
            aspectRatio: `${wallWidthCm} / ${roomHeightCm}`,
            ...getWallBgStyle(),
          }}
          className="relative max-h-48 w-full overflow-hidden rounded-md border border-zinc-400/70 shadow-inner select-none"
        >
          {doorRect && (
            <div
              style={{
                left: `${(doorRect.leftCm / wallWidthCm) * 100}%`,
                bottom: 0,
                width: `${((doorRect.rightCm - doorRect.leftCm) / wallWidthCm) * 100}%`,
                height: `${(doorRect.topCm / roomHeightCm) * 100}%`,
              }}
              className="pointer-events-none absolute flex items-center justify-center border-x-2 border-t-2 border-amber-700/70 bg-amber-900/20 text-[9px] font-bold text-amber-900"
            >
              PINTU
            </div>
          )}

          {elementsOnWall.map((el) => {
            const activeEl =
              dragPreview && dragPreview.id === el.id
                ? { ...el, ...dragPreview }
                : el;
            const isSel = activeEl.id === selectedId;

            return (
              <div
                key={activeEl.id}
                onPointerDown={(e) => handlePointerDown(e, activeEl)}
                style={{
                  left: `${(activeEl.offsetCm / wallWidthCm) * 100}%`,
                  bottom: `${(activeEl.elevationCm / roomHeightCm) * 100}%`,
                  width: `${(activeEl.width / wallWidthCm) * 100}%`,
                  height: `${(activeEl.height / roomHeightCm) * 100}%`,
                  backgroundColor:
                    activeEl.type === "window"
                      ? activeEl.color2
                      : activeEl.color1,
                  borderColor: isSel ? "#2563eb" : "#475569",
                }}
                title={`${activeEl.width}×${activeEl.height} cm`}
                className={`absolute flex cursor-grab items-center justify-center rounded-xs border-2 transition-shadow active:cursor-grabbing ${
                  isSel ? "z-10 ring-2 ring-blue-500/40" : "opacity-90"
                }`}
              >
                {activeEl.type === "window" &&
                  activeEl.windowStyle === "double" && (
                    <div className="h-full w-0.5 bg-white/80" />
                  )}
                {activeEl.type === "ac" && (
                  <span className="text-[8px] font-bold tracking-tight text-slate-700">
                    AC
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bar Tombol Panah Presisi (Touch/Mouse) + Pilihan Langkah */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!selectedEl || isLocked}
            onClick={() => handleNudge(-1, 0)}
            title="Geser Kiri (ArrowLeft)"
            className={nudgeBtnClass}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!selectedEl || isLocked}
            onClick={() => handleNudge(0, 1)}
            title="Geser Atas (ArrowUp)"
            className={nudgeBtnClass}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!selectedEl || isLocked}
            onClick={() => handleNudge(0, -1)}
            title="Geser Bawah (ArrowDown)"
            className={nudgeBtnClass}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!selectedEl || isLocked}
            onClick={() => handleNudge(1, 0)}
            title="Geser Kanan (ArrowRight)"
            className={nudgeBtnClass}
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          disabled={!selectedEl || isLocked}
          onClick={() => setNudgeStep((s) => (s === 1 ? 5 : 1))}
          className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition disabled:opacity-35 ${
            isDark
              ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          Step: {nudgeStep} cm
        </button>
      </div>

      <p className="text-[10px] text-zinc-500">{t.elevationHint}</p>
    </div>
  );
}
