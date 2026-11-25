import React from "react";

export default function DividerInspector({ item, onUpdate, isDark, t }) {
  const hasFeet = item.hasFeet !== false;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { id: "solid", label: t.dividerSolid || "Panel Polos" },
          { id: "slat", label: t.dividerSlat || "Kisi-Kisi" },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onUpdate(item.id, { dividerStyle: opt.id })}
            className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
              (item.dividerStyle || "solid") === opt.id
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

      <button
        type="button"
        onClick={() => onUpdate(item.id, { hasFeet: !hasFeet })}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
          hasFeet
            ? "border-blue-600 bg-blue-600 text-white"
            : isDark
              ? "border-zinc-700 bg-zinc-900 text-zinc-200"
              : "border-zinc-300 bg-zinc-100 text-zinc-800"
        }`}
      >
        {t.dividerFeetLabel || "Kaki Penyangga"}:{" "}
        {hasFeet ? "ON (Berdiri)" : "OFF (Fix Lantai)"}
      </button>
    </div>
  );
}
