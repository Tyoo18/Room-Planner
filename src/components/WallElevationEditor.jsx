import React, { useRef } from "react";
import { getWallWidthCm, getDoorRectOnFrontWall } from "../wallElements";

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
  onRecordHistorySnapshot,
  isDark,
  t,
}) {
  const boardRef = useRef(null);
  const wallWidthCm = getWallWidthCm(wallId, frontWidthCm, sideLengthCm);

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

    const onMove = (me) => {
      const dxCm = ((me.clientX - startX) / rect.width) * wallWidthCm;
      const dyCm = ((startY - me.clientY) / rect.height) * roomHeightCm;
      const step = me.altKey ? 1 : 5;

      const nextOffset = Math.round((initOffset + dxCm) / step) * step;
      const nextElev = Math.round((initElev + dyCm) / step) * step;

      onUpdate(el.id, { offsetCm: nextOffset, elevationCm: nextElev }, false);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Render background sesuai pola cat tembok
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

  return (
    <div className="space-y-1.5">
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
          {/* Area Pintu jika tembok depan */}
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

          {/* Semua elemen pada tembok ini */}
          {elementsOnWall.map((el) => {
            const isSel = el.id === selectedId;
            return (
              <div
                key={el.id}
                onPointerDown={(e) => handlePointerDown(e, el)}
                style={{
                  left: `${(el.offsetCm / wallWidthCm) * 100}%`,
                  bottom: `${(el.elevationCm / roomHeightCm) * 100}%`,
                  width: `${(el.width / wallWidthCm) * 100}%`,
                  height: `${(el.height / roomHeightCm) * 100}%`,
                  backgroundColor: el.type === "window" ? el.color2 : el.color1,
                  borderColor: isSel ? "#2563eb" : "#475569",
                }}
                title={`${el.width}×${el.height} cm`}
                className={`absolute flex cursor-grab items-center justify-center rounded-xs border-2 transition-shadow active:cursor-grabbing ${
                  isSel ? "z-10 ring-2 ring-blue-500/40" : "opacity-90"
                }`}
              >
                {el.type === "window" && el.windowStyle === "double" && (
                  <div className="h-full w-0.5 bg-white/80" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-zinc-500">{t.elevationHint}</p>
    </div>
  );
}
