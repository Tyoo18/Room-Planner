import React from "react";

export default function DeskInspector({
  item,
  onUpdate,
  furnInputs,
  onTyping,
  onBlur,
  onRecordHistorySnapshot,
  inputClass,
  isDark,
  t,
}) {
  const getTabClass = (isActive) =>
    `rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
      isActive
        ? isDark
          ? "border-zinc-100 bg-zinc-100 text-zinc-900"
          : "border-zinc-900 bg-zinc-900 text-white"
        : isDark
          ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
    }`;

  const getSubBtnClass = (isActive) =>
    `rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
      isActive
        ? "border-blue-600 bg-blue-600 text-white"
        : isDark
          ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
    }`;

  const shapeOptions = [
    { id: "rect", label: t.deskRect, patch: { deskShape: "rect" } },
    { id: "l-shape", label: t.deskL, patch: { deskShape: "l-shape" } },
    { id: "round", label: t.deskRound, patch: { deskShape: "round" } },
    {
      id: "studio",
      label: t.deskStudio || "Meja Laci",
      patch: {
        deskShape: "studio",
        pedestalLayout: item.pedestalLayout || "left",
        drawerCount: item.drawerCount || 5,
        hasTopDrawers: item.hasTopDrawers !== false,
        drawerHandleStyle: item.drawerHandleStyle || "cutout",
        ...(item.width < 130 ? { width: 150 } : {}),
        ...(item.depth > 85 ? { depth: 65 } : {}),
      },
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* Pilih Bentuk Meja (Grid 2x2) */}
      <div className="grid grid-cols-2 gap-1.5">
        {shapeOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onUpdate(item.id, opt.patch)}
            className={getTabClass(item.deskShape === opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Kontrol Khusus Meja L-Shape */}
      {item.deskShape === "l-shape" && (
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">{t.lCornerLabel}</span>
            <div className="flex gap-1">
              {[
                { id: "left", label: t.lCornerLeft },
                { id: "right", label: t.lCornerRight },
              ].map((side) => (
                <button
                  key={side.id}
                  type="button"
                  onClick={() => onUpdate(item.id, { lCorner: side.id })}
                  className={getSubBtnClass(item.lCorner === side.id)}
                >
                  {side.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-500">
              {t.mainDepthLabel}
            </span>
            <input
              type="text"
              inputMode="numeric"
              onFocus={onRecordHistorySnapshot}
              value={furnInputs.mainDepth}
              onChange={(e) => onTyping("mainDepth", e.target.value)}
              onBlur={() => onBlur("mainDepth")}
              className={`${inputClass} w-20! text-right`}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-500">
              {t.sideWidthLabel}
            </span>
            <input
              type="text"
              inputMode="numeric"
              onFocus={onRecordHistorySnapshot}
              value={furnInputs.sideWidth}
              onChange={(e) => onTyping("sideWidth", e.target.value)}
              onBlur={() => onBlur("sideWidth")}
              className={`${inputClass} w-20! text-right`}
            />
          </div>
        </div>
      )}

      {/* Kontrol Khusus Meja Kabinet Laci (Studio Desk) */}
      {item.deskShape === "studio" && (
        <div className="space-y-2 pt-0.5">
          {/* Posisi Kabinet Laci */}
          <div>
            <span className="mb-1 block text-[11px] text-zinc-500">
              {t.deskPedestalLabel || "Posisi Kabinet Laci"}
            </span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "left", label: t.lCornerLeft || "Kiri" },
                { id: "right", label: t.lCornerRight || "Kanan" },
                { id: "both", label: t.deskPedestalBoth || "Keduanya" },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => onUpdate(item.id, { pedestalLayout: pos.id })}
                  className={getSubBtnClass(
                    (item.pedestalLayout || "left") === pos.id,
                  )}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jumlah Laci per Kabinet */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {t.deskDrawerCountLabel || "Jumlah Laci"}
            </span>
            <div className="flex gap-1">
              {[4, 5, 6].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => onUpdate(item.id, { drawerCount: cnt })}
                  className={`h-7 w-8 rounded-md border text-xs font-semibold transition ${
                    (item.drawerCount || 5) === cnt
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

          {/* Gaya Handle Laci */}
          <div>
            <span className="mb-1 block text-[11px] text-zinc-500">
              {t.deskHandleStyleLabel || "Model Handle"}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "cutout", label: t.deskHandleCutout || "Coakan Jari" },
                { id: "bar", label: t.deskHandleBar || "Handle Batang" },
              ].map((hs) => (
                <button
                  key={hs.id}
                  type="button"
                  onClick={() =>
                    onUpdate(item.id, { drawerHandleStyle: hs.id })
                  }
                  className={getSubBtnClass(
                    (item.drawerHandleStyle || "cutout") === hs.id,
                  )}
                >
                  {hs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Laci Tengah di Bawah Daun Meja */}
          <button
            type="button"
            onClick={() =>
              onUpdate(item.id, {
                hasTopDrawers: !(item.hasTopDrawers !== false),
              })
            }
            className={`w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              item.hasTopDrawers !== false
                ? "border-blue-600 bg-blue-600 text-white"
                : isDark
                  ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {t.deskTopDrawersLabel || "Laci Bawah Meja"}:{" "}
            {item.hasTopDrawers !== false ? "ON" : "OFF"}
          </button>
        </div>
      )}
    </div>
  );
}
