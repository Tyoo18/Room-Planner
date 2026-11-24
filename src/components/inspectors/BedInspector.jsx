import React from "react";

const BED_SIZE_PRESETS = [
  { label: "90×200", w: 90, d: 200 },
  { label: "120×200", w: 120, d: 200 },
  { label: "160×200", w: 160, d: 200 },
  { label: "180×200", w: 180, d: 200 },
];

export default function BedInspector({ item, onUpdate, isDark, t }) {
  return (
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
              onUpdate(item.id, {
                bedStyle: opt.id,
                height: opt.defaultH,
              })
            }
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              item.bedStyle === opt.id
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
              onClick={() => onUpdate(item.id, { width: p.w, depth: p.d })}
              className={`rounded-md border py-1 text-[10px] font-semibold transition ${
                item.width === p.w && item.depth === p.d
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
  );
}
