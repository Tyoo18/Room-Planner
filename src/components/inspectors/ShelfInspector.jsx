import React from "react";

export default function ShelfInspector({ item, onUpdate, isDark, t }) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-1.5">
        {[
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
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onUpdate(item.id, opt.patch)}
            className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
              (item.shelfStyle || "cube") === opt.id
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

      {(item.shelfStyle || "cube") === "cube" ? (
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
                  className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${
                    (item.shelfCols || 4) === c
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
              {t.shelfRowsLabel}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onUpdate(item.id, { shelfRows: r })}
                  className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${
                    (item.shelfRows || 2) === r
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
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {t.shelfTiersLabel}
            </span>
            <div className="flex gap-1">
              {[2, 3].map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => onUpdate(item.id, { shelfTiers: tier })}
                  className={`h-7 w-9 rounded-md border text-xs font-semibold transition ${
                    (item.shelfTiers || 2) === tier
                      ? "border-blue-600 bg-blue-600 text-white"
                      : isDark
                        ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                        : "border-zinc-300 bg-white text-zinc-700"
                  }`}
                >
                  {tier}
                </button>
              ))}
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
                  className={`h-7 w-9 rounded-md border text-xs font-semibold transition ${
                    (item.shelfLegPairs || 3) === pairs
                      ? "border-blue-600 bg-blue-600 text-white"
                      : isDark
                        ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                        : "border-zinc-300 bg-white text-zinc-700"
                  }`}
                >
                  {pairs}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
