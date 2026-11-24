import React from "react";

export default function WardrobeInspector({ item, onUpdate, isDark, t }) {
  return (
    <div className="space-y-2.5">
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
              onClick={() => onUpdate(item.id, { wardrobeLayout: lay.id })}
              className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                (item.wardrobeLayout || "vertical") === lay.id
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

      {(item.wardrobeLayout || "vertical") === "vertical" ? (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">{t.doorCountLabel}</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => onUpdate(item.id, { doorCount: cnt })}
                className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${
                  item.doorCount === cnt
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
                  onClick={() => onUpdate(item.id, { wardrobeCols: c })}
                  className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${
                    (item.wardrobeCols || 2) === c
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
                  onClick={() => onUpdate(item.id, { wardrobeRows: r })}
                  className={`h-7 w-7 rounded-md border text-xs font-semibold transition ${
                    (item.wardrobeRows || 3) === r
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
            onClick={() => onUpdate(item.id, { wardrobeDoorType: mech.id })}
            className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
              item.wardrobeDoorType === mech.id
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
  );
}
