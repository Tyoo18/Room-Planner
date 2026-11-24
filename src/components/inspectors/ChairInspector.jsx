import React from "react";

export default function ChairInspector({ item, onUpdate, isDark, t }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[
        { id: "standard", label: t.chairStandard },
        { id: "office", label: t.chairOffice },
        { id: "stool", label: t.chairStool },
      ].map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() =>
            onUpdate(item.id, {
              chairStyle: opt.id,
              height: opt.id === "stool" ? 45 : 85,
            })
          }
          className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
            item.chairStyle === opt.id
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
  );
}
