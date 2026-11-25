import React from "react";

export default function SofaInspector({ item, onUpdate, isDark, t }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {[
        { id: "sofa", label: t.sofaMinimal || "Sofa Minimalis" },
        { id: "beanbag", label: t.sofaBeanbag || "Beanbag" },
      ].map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onUpdate(item.id, { sofaStyle: opt.id })}
          className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
            (item.sofaStyle || "sofa") === opt.id
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
