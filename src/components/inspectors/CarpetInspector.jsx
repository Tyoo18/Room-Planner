import React from "react";

const PATTERN_OPTIONS = [
  { id: "plain", labelKey: "carpetPatPlain", fallback: "Polos" },
  { id: "grid", labelKey: "carpetPatGrid", fallback: "Grid" },
  { id: "checker", labelKey: "carpetPatChecker", fallback: "Checker" },
  { id: "diamond", labelKey: "carpetPatDiamond", fallback: "Diamond" },
  { id: "stripes", labelKey: "carpetPatStripes", fallback: "Stripes" },
];

export default function CarpetInspector({ item, onUpdate, isDark, t }) {
  const activeShape = item.carpetShape || "rect";
  const activePattern = item.carpetPattern || "plain";

  const getBtnClass = (isActive) =>
    `rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
      isActive
        ? isDark
          ? "border-zinc-100 bg-zinc-100 text-zinc-900"
          : "border-zinc-900 bg-zinc-900 text-white"
        : isDark
          ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
    }`;

  return (
    <div className="space-y-2.5">
      {/* Bentuk Karpet */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { id: "rect", label: t.carpetRect },
          { id: "round", label: t.carpetRound },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onUpdate(item.id, { carpetShape: opt.id })}
            className={getBtnClass(activeShape === opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Pilihan Motif */}
      <div>
        <span className="mb-1 block text-[10px] font-semibold text-zinc-500">
          {t.carpetPatternLabel || "Motif"}
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {PATTERN_OPTIONS.map((pat) => (
            <button
              key={pat.id}
              type="button"
              onClick={() => onUpdate(item.id, { carpetPattern: pat.id })}
              className={getBtnClass(activePattern === pat.id)}
            >
              {t[pat.labelKey] || pat.fallback}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Bingkai Tepi */}
      <button
        type="button"
        onClick={() => onUpdate(item.id, { carpetBorder: !item.carpetBorder })}
        className={`w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
          item.carpetBorder
            ? "border-blue-600 bg-blue-600 text-white"
            : isDark
              ? "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
        }`}
      >
        {t.carpetBorderLabel}: {item.carpetBorder ? "ON" : "OFF"}
      </button>
    </div>
  );
}
