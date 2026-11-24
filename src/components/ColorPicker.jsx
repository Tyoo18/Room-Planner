import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { X, Pipette } from "lucide-react";
import { TRANSLATIONS } from "../utils/i18n";

const SWATCH_HEXES = [
  "#F5F3EE",
  "#FFFFFF",
  "#D8D2C7",
  "#A3B19B",
  "#55624C",
  "#8FA6B8",
  "#2F3E4E",
  "#C67D63",
  "#E6D5B8",
  "#383A3E",
];

function hexToHsv(hex) {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { h: 0, s: 0, v: 95 };

  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

function hsvToHex(h, s, v) {
  const sNorm = s / 100;
  const vNorm = v / 100;
  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vNorm - c;

  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (val) =>
    Math.round((val + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export default function ColorPicker({
  label,
  color,
  onChange,
  theme = "light",
  lang = "id",
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
  const isDark = theme === "dark";

  const [isOpen, setIsOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [hexInput, setHexInput] = useState(color.replace("#", ""));
  const [floatingPos, setFloatingPos] = useState({ top: 100, left: 100 });

  const triggerRef = useRef(null);
  const satBoxRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    setHsv(hexToHsv(color));
    setHexInput(color.replace("#", "").toUpperCase());
  }, [color]);

  const updatePopoverPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = popoverRef.current?.offsetWidth || 256;
    const popoverHeight = popoverRef.current?.offsetHeight || 345;
    const edgeMargin = 24;

    if (window.innerWidth >= 768) {
      const sidebarEl = triggerRef.current.closest("aside");
      const anchorLeft = sidebarEl
        ? sidebarEl.getBoundingClientRect().left
        : rect.left;
      const left = Math.max(edgeMargin, anchorLeft - popoverWidth - 14);
      const idealTop = rect.top - popoverHeight * 0.45;
      const top = Math.max(
        edgeMargin,
        Math.min(idealTop, window.innerHeight - popoverHeight - edgeMargin),
      );
      setFloatingPos({ top, left });
    } else {
      const left = Math.max(edgeMargin, (window.innerWidth - popoverWidth) / 2);
      const top = Math.max(
        edgeMargin,
        Math.min(
          rect.top - popoverHeight - 12,
          window.innerHeight - popoverHeight - edgeMargin,
        ),
      );
      setFloatingPos({ top, left });
    }
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePopoverPosition();
    }
  }, [isOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", updatePopoverPosition);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, updatePopoverPosition]);

  const updateSatVal = (clientX, clientY) => {
    if (!satBoxRef.current) return;
    const rect = satBoxRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const newS = Math.round((x / rect.width) * 100);
    const newV = Math.round(100 - (y / rect.height) * 100);
    const nextHsv = { ...hsv, s: newS, v: newV };
    setHsv(nextHsv);
    onChange(hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v));
  };

  const handleMouseDownSat = (e) => {
    updateSatVal(e.clientX, e.clientY);
    const onMove = (moveEvent) =>
      updateSatVal(moveEvent.clientX, moveEvent.clientY);
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const handleHueChange = (newH) => {
    const nextHsv = { ...hsv, h: Number(newH) };
    setHsv(nextHsv);
    onChange(hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v));
  };

  const handleHexTyping = (val) => {
    const cleaned = val
      .replace(/[^0-9A-Fa-f]/g, "")
      .slice(0, 6)
      .toUpperCase();
    setHexInput(cleaned);
    if (cleaned.length === 6) {
      onChange(`#${cleaned}`);
    }
  };

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) return;
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        onChange(result.sRGBHex.toUpperCase());
      }
    } catch {
      // Batal eyedropper
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={`text-xs font-medium ${isDark ? "text-zinc-300" : "text-zinc-700"}`}
      >
        {label}
      </span>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-xs transition ${
          isOpen
            ? isDark
              ? "border-blue-500 bg-blue-500/15 text-blue-400 ring-2 ring-blue-500/20"
              : "border-blue-600 bg-blue-50/60 text-blue-700 ring-2 ring-blue-600/15"
            : isDark
              ? "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800"
              : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-400 hover:bg-zinc-50"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-sm border shadow-inner ${
            isDark ? "border-white/25" : "border-zinc-400/60"
          }`}
          style={{ backgroundColor: color }}
        />
        <span>{color.toUpperCase()}</span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              top: `${floatingPos.top}px`,
              left: `${floatingPos.left}px`,
            }}
            className={`fixed z-50 w-64 rounded-xl border p-3 shadow-2xl ${
              isDark
                ? "border-zinc-700 bg-zinc-900 text-zinc-100"
                : "border-zinc-300 bg-white text-zinc-900"
            }`}
          >
            {/* Header Popover */}
            <div
              className={`mb-2 flex items-center justify-between border-b pb-1.5 ${
                isDark ? "border-zinc-800" : "border-zinc-200"
              }`}
            >
              <span
                className={`text-xs font-semibold ${isDark ? "text-zinc-200" : "text-zinc-800"}`}
              >
                {label}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`rounded-md p-1 transition ${
                  isDark
                    ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Kotak Saturation & Brightness */}
            <div
              ref={satBoxRef}
              onMouseDown={handleMouseDownSat}
              className={`relative h-32 w-full cursor-crosshair overflow-hidden rounded-lg border ${
                isDark ? "border-zinc-700" : "border-zinc-300"
              }`}
              style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
            >
              <div className="absolute inset-0 bg-linear-to-r from-white to-transparent" />
              <div className="absolute inset-0 bg-linear-to-t from-black to-transparent" />
              <div
                className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/40"
                style={{
                  left: `${hsv.s}%`,
                  top: `${100 - hsv.v}%`,
                  backgroundColor: color,
                }}
              />
            </div>

            {/* Eyedropper + Hue Slider */}
            <div className="mt-2.5 flex items-center gap-2">
              {typeof window !== "undefined" && "EyeDropper" in window && (
                <button
                  type="button"
                  onClick={handleEyeDropper}
                  title={t.pickScreenColor}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                    isDark
                      ? "border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Pipette className="h-3.5 w-3.5" />
                </button>
              )}
              <input
                type="range"
                min="0"
                max="360"
                value={hsv.h}
                onChange={(e) => handleHueChange(e.target.value)}
                className={`h-2.5 w-full cursor-pointer appearance-none rounded-full border ${
                  isDark ? "border-zinc-700" : "border-zinc-300"
                }`}
                style={{
                  background:
                    "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
                }}
              />
            </div>

            {/* Input Hex */}
            <div className="mt-2.5 flex items-center gap-2">
              <span
                className={`rounded-md border px-2 py-1 text-xs font-medium ${
                  isDark
                    ? "border-zinc-700 bg-zinc-800 text-zinc-400"
                    : "border-zinc-300 bg-zinc-100 text-zinc-600"
                }`}
              >
                Hex
              </span>
              <div
                className={`flex flex-1 items-center rounded-md border px-2 py-1 shadow-xs focus-within:border-blue-500 ${
                  isDark
                    ? "border-zinc-700 bg-zinc-950"
                    : "border-zinc-300 bg-white"
                }`}
              >
                <span className="text-xs text-zinc-500">#</span>
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleHexTyping(e.target.value)}
                  className={`w-full bg-transparent pl-1 text-xs font-semibold focus:outline-none ${
                    isDark ? "text-zinc-100" : "text-zinc-900"
                  }`}
                  placeholder="FFFFFF"
                />
              </div>
            </div>

            {/* Palet Warna Cat Kamar */}
            <div
              className={`mt-2.5 border-t pt-2 ${
                isDark ? "border-zinc-800" : "border-zinc-200"
              }`}
            >
              <p
                className={`mb-1.5 text-[11px] font-medium ${
                  isDark ? "text-zinc-400" : "text-zinc-500"
                }`}
              >
                {t.paletteTitle}
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {SWATCH_HEXES.map((hex, idx) => (
                  <button
                    key={hex}
                    type="button"
                    title={t.swatches[idx]}
                    onClick={() => onChange(hex)}
                    className={`h-6 w-full rounded-md border transition hover:scale-105 ${
                      color.toUpperCase() === hex
                        ? "border-blue-500 ring-2 ring-blue-500/35"
                        : isDark
                          ? "border-zinc-700"
                          : "border-zinc-300"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
