import React from "react";

export default function CarpetInspector({ item, onUpdate, isDark, t }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { id: "rect", label: t.carpetRect },
          { id: "round", label: t.carpetRound },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onUpdate(item.id, { carpetShape: opt.id })}
            className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
              (item.carpetShape || "rect") === opt.id
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
        onClick={() => onUpdate(item.id, { carpetBorder: !item.carpetBorder })}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
          item.carpetBorder
            ? "border-blue-600 bg-blue-600 text-white"
            : isDark
              ? "border-zinc-700 bg-zinc-900 text-zinc-300"
              : "border-zinc-300 bg-white text-zinc-700"
        }`}
      >
        {t.carpetBorderLabel}: {item.carpetBorder ? "ON" : "OFF"}
      </button>
    </div>
  );
}
