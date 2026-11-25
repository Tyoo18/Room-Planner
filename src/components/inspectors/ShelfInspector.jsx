import React from "react";

export default function ShelfInspector({ item, onUpdate, isDark, t }) {
  const activeStyle = item.shelfStyle || "cube";

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

  const getNumBtnClass = (isActive) =>
    `h-7 min-w-7 rounded-md border px-1.5 text-xs font-semibold transition ${
      isActive
        ? "border-blue-600 bg-blue-600 text-white"
        : isDark
          ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
    }`;

  const styleOptions = [
    {
      id: "cube",
      label: t.shelfCube,
      patch: {
        shelfStyle: "cube",
        width: 147,
        depth: 39,
        height: 77,
        color1: "#F8FAFC",
        color2: "#F1F5F9",
      },
    },
    {
      id: "console",
      label: t.shelfConsole,
      patch: {
        shelfStyle: "console",
        width: 160,
        depth: 38,
        height: 68,
        color1: "#C68B59",
        color2: "#64748B",
      },
    },
    {
      id: "wire",
      label: t.shelfWire || "Rak Kawat",
      patch: {
        shelfStyle: "wire",
        shelfTiers: 3,
        shelfLegPairs: 2,
        width: 90,
        depth: 36,
        height: 95,
        color1: "#D4D4D8",
        color2: "#71717A",
      },
    },
    {
      id: "bookcase",
      label: t.shelfBookcase || "Rak Buku",
      patch: {
        shelfStyle: "bookcase",
        shelfCols: 2,
        shelfRows: 5,
        hasBottomDrawers: true,
        width: 140,
        depth: 36,
        height: 185,
        color1: "#94A3B8",
        color2: "#D6B892",
      },
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* Pilih Gaya Rak (4 Varian) */}
      <div className="grid grid-cols-2 gap-1.5">
        {styleOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onUpdate(item.id, opt.patch)}
            className={getTabClass(activeStyle === opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Kontrol Khusus Cube */}
      {activeStyle === "cube" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {t.shelfColsLabel}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdate(item.id, { shelfCols: c })}
                  className={getNumBtnClass((item.shelfCols || 4) === c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {t.shelfRowsLabel}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onUpdate(item.id, { shelfRows: r })}
                  className={getNumBtnClass((item.shelfRows || 2) === r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Kontrol Khusus Console & Rak Kawat */}
      {(activeStyle === "console" || activeStyle === "wire") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {t.shelfTiersLabel}
            </span>
            <div className="flex gap-1">
              {(activeStyle === "wire" ? [2, 3, 4, 5] : [2, 3, 4]).map(
                (tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => onUpdate(item.id, { shelfTiers: tier })}
                    className={getNumBtnClass((item.shelfTiers || 3) === tier)}
                  >
                    {tier}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {t.shelfLegPairsLabel}
            </span>
            <div className="flex gap-1">
              {[2, 3].map((pairs) => (
                <button
                  key={pairs}
                  type="button"
                  onClick={() => onUpdate(item.id, { shelfLegPairs: pairs })}
                  className={getNumBtnClass(
                    (item.shelfLegPairs || 2) === pairs,
                  )}
                >
                  {pairs}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Kontrol Khusus Rak Buku Tangga */}
      {activeStyle === "bookcase" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {t.shelfColsLabel}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdate(item.id, { shelfCols: c })}
                  className={getNumBtnClass((item.shelfCols || 2) === c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {t.shelfRowsLabel}
            </span>
            <div className="flex gap-1">
              {[3, 4, 5, 6].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onUpdate(item.id, { shelfRows: r })}
                  className={getNumBtnClass((item.shelfRows || 5) === r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdate(item.id, {
                hasBottomDrawers: !(item.hasBottomDrawers !== false),
              })
            }
            className={`w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              item.hasBottomDrawers !== false
                ? "border-blue-600 bg-blue-600 text-white"
                : isDark
                  ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {t.bookcaseDrawersLabel || "Laci Bawah"}:{" "}
            {item.hasBottomDrawers !== false ? "ON" : "OFF"}
          </button>
        </div>
      )}
    </div>
  );
}
