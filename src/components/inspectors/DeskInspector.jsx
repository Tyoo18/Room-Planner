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
  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { id: "rect", label: t.deskRect },
          { id: "l-shape", label: t.deskL },
          { id: "round", label: t.deskRound },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onUpdate(item.id, { deskShape: opt.id })}
            className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
              item.deskShape === opt.id
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

      {item.deskShape === "l-shape" && (
        <div className="space-y-2 pt-1">
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
                  className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
                    item.lCorner === side.id
                      ? "border-blue-600 bg-blue-600 text-white"
                      : isDark
                        ? "border-zinc-700 bg-zinc-900 text-zinc-300"
                        : "border-zinc-300 bg-white text-zinc-700"
                  }`}
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
    </>
  );
}
