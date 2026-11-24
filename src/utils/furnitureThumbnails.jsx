import React from "react";

export function AssetThumbnail({ type, patch = {}, isDark }) {
  const stroke = isDark ? "#d4d4d8" : "#3f3f46";
  const mutedFill = isDark ? "#27272a" : "#e4e4e7";
  const accentFill = isDark ? "#3b82f6" : "#2563eb";
  const softFill = isDark ? "#3f3f46" : "#f4f4f5";

  // 1. BED
  if (type === "bed") {
    const isFloor = patch.bedStyle === "floor";
    return (
      <svg viewBox="0 0 80 56" className="h-11 w-16">
        {!isFloor && (
          <rect
            x="16"
            y="8"
            width="48"
            height="40"
            rx="4"
            fill={mutedFill}
            stroke={stroke}
            strokeWidth="1.8"
          />
        )}
        <rect
          x={isFloor ? "18" : "19"}
          y={isFloor ? "10" : "12"}
          width={isFloor ? "44" : "42"}
          height={isFloor ? "36" : "33"}
          rx="3"
          fill={softFill}
          stroke={stroke}
          strokeWidth="1.6"
        />
        {/* Bantal */}
        <rect
          x="23"
          y="14"
          width="15"
          height="8"
          rx="2"
          fill={accentFill}
          fillOpacity="0.25"
          stroke={stroke}
          strokeWidth="1.4"
        />
        <rect
          x="42"
          y="14"
          width="15"
          height="8"
          rx="2"
          fill={accentFill}
          fillOpacity="0.25"
          stroke={stroke}
          strokeWidth="1.4"
        />
        {/* Garis selimut */}
        <line
          x1="19"
          y1="27"
          x2="61"
          y2="27"
          stroke={stroke}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  // 2. DESK
  if (type === "desk") {
    const shape = patch.deskShape || "rect";
    if (shape === "l-shape") {
      return (
        <svg viewBox="0 0 80 56" className="h-11 w-16">
          <path
            d="M16 12 H64 V44 H44 V26 H16 Z"
            fill={mutedFill}
            stroke={stroke}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    if (shape === "round") {
      return (
        <svg viewBox="0 0 80 56" className="h-11 w-16">
          <ellipse
            cx="40"
            cy="28"
            rx="24"
            ry="16"
            fill={mutedFill}
            stroke={stroke}
            strokeWidth="1.8"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 80 56" className="h-11 w-16">
        <rect
          x="14"
          y="15"
          width="52"
          height="26"
          rx="3"
          fill={mutedFill}
          stroke={stroke}
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  // 3. CHAIR
  if (type === "chair") {
    const style = patch.chairStyle || "standard";
    if (style === "stool") {
      return (
        <svg viewBox="0 0 80 56" className="h-11 w-16">
          <circle
            cx="40"
            cy="28"
            r="14"
            fill={mutedFill}
            stroke={stroke}
            strokeWidth="1.8"
          />
          <circle
            cx="40"
            cy="28"
            r="9"
            fill="none"
            stroke={stroke}
            strokeWidth="1.1"
            strokeDasharray="2 2"
          />
        </svg>
      );
    }
    if (style === "office") {
      return (
        <svg viewBox="0 0 80 56" className="h-11 w-16">
          {/* Roda bintang */}
          <line
            x1="22"
            y1="14"
            x2="58"
            y2="42"
            stroke={stroke}
            strokeWidth="1.4"
          />
          <line
            x1="58"
            y1="14"
            x2="22"
            y2="42"
            stroke={stroke}
            strokeWidth="1.4"
          />
          {/* Dudukan */}
          <rect
            x="26"
            y="16"
            width="28"
            height="24"
            rx="5"
            fill={mutedFill}
            stroke={stroke}
            strokeWidth="1.8"
          />
          {/* Sandaran */}
          <rect
            x="24"
            y="11"
            width="32"
            height="6"
            rx="3"
            fill={accentFill}
            fillOpacity="0.35"
            stroke={stroke}
            strokeWidth="1.6"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 80 56" className="h-11 w-16">
        <rect
          x="26"
          y="16"
          width="28"
          height="26"
          rx="4"
          fill={mutedFill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        <rect
          x="26"
          y="12"
          width="28"
          height="6"
          rx="2"
          fill={softFill}
          stroke={stroke}
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  // 4. WARDROBE
  if (type === "wardrobe") {
    const isSliding = patch.doorStyle === "sliding";
    return (
      <svg viewBox="0 0 80 56" className="h-11 w-16">
        <rect
          x="16"
          y="14"
          width="48"
          height="28"
          rx="2"
          fill={mutedFill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        <line
          x1="40"
          y1="14"
          x2="40"
          y2="42"
          stroke={stroke}
          strokeWidth="1.5"
        />
        {isSliding ? (
          <>
            <line
              x1="30"
              y1="38"
              x2="37"
              y2="38"
              stroke={accentFill}
              strokeWidth="2"
            />
            <line
              x1="43"
              y1="38"
              x2="50"
              y2="38"
              stroke={accentFill}
              strokeWidth="2"
            />
          </>
        ) : (
          <>
            <path
              d="M16 42 Q26 50 38 42"
              fill="none"
              stroke={accentFill}
              strokeWidth="1.4"
            />
            <path
              d="M64 42 Q54 50 42 42"
              fill="none"
              stroke={accentFill}
              strokeWidth="1.4"
            />
          </>
        )}
      </svg>
    );
  }

  // 5. SHELF
  if (type === "shelf") {
    const isConsole = patch.shelfStyle === "console";
    return (
      <svg viewBox="0 0 80 56" className="h-11 w-16">
        <rect
          x={isConsole ? "14" : "22"}
          y={isConsole ? "18" : "10"}
          width={isConsole ? "52" : "36"}
          height={isConsole ? "22" : "36"}
          rx="2"
          fill={mutedFill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        <line
          x1={isConsole ? "14" : "22"}
          y1="28"
          x2={isConsole ? "66" : "58"}
          y2="28"
          stroke={stroke}
          strokeWidth="1.5"
        />
        <line
          x1="40"
          y1={isConsole ? "18" : "10"}
          x2="40"
          y2={isConsole ? "40" : "46"}
          stroke={stroke}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  // 6. CARPET
  if (type === "carpet") {
    const isRound = patch.carpetShape === "round";
    if (isRound) {
      return (
        <svg viewBox="0 0 80 56" className="h-11 w-16">
          <ellipse
            cx="40"
            cy="28"
            rx="24"
            ry="17"
            fill={mutedFill}
            stroke={stroke}
            strokeWidth="1.8"
          />
          <ellipse
            cx="40"
            cy="28"
            rx="19"
            ry="12"
            fill="none"
            stroke={accentFill}
            strokeWidth="1.3"
            strokeDasharray="3 2"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 80 56" className="h-11 w-16">
        <rect
          x="14"
          y="12"
          width="52"
          height="32"
          rx="2"
          fill={mutedFill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        <rect
          x="19"
          y="16"
          width="42"
          height="24"
          rx="1"
          fill="none"
          stroke={accentFill}
          strokeWidth="1.3"
          strokeDasharray="3 2"
        />
      </svg>
    );
  }

  // 7. WINDOW
  if (type === "window") {
    const style = patch.windowStyle || "double";
    if (style === "vent") {
      return (
        <svg viewBox="0 0 80 56" className="h-11 w-16">
          <rect
            x="14"
            y="19"
            width="52"
            height="18"
            rx="2"
            fill={accentFill}
            fillOpacity="0.2"
            stroke={stroke}
            strokeWidth="1.8"
          />
          <line
            x1="31"
            y1="19"
            x2="31"
            y2="37"
            stroke={stroke}
            strokeWidth="1.4"
          />
          <line
            x1="49"
            y1="19"
            x2="49"
            y2="37"
            stroke={stroke}
            strokeWidth="1.4"
          />
        </svg>
      );
    }
    const isSingle = style === "single";
    return (
      <svg viewBox="0 0 80 56" className="h-11 w-16">
        <rect
          x={isSingle ? "25" : "16"}
          y="10"
          width={isSingle ? "30" : "48"}
          height="36"
          rx="2"
          fill={accentFill}
          fillOpacity="0.22"
          stroke={stroke}
          strokeWidth="1.8"
        />
        {!isSingle && (
          <line
            x1="40"
            y1="10"
            x2="40"
            y2="46"
            stroke={stroke}
            strokeWidth="1.8"
          />
        )}
      </svg>
    );
  }

  // 8. OUTLET
  if (type === "outlet") {
    const style = patch.outletStyle || "double";
    const isSingle = style === "single";
    return (
      <svg viewBox="0 0 80 56" className="h-11 w-16">
        <rect
          x={isSingle ? "26" : "18"}
          y="16"
          width={isSingle ? "28" : "44"}
          height="24"
          rx="3"
          fill={softFill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        {isSingle ? (
          <circle
            cx="40"
            cy="28"
            r="6"
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
          />
        ) : style === "switch" ? (
          <>
            <rect
              x="25"
              y="22"
              width="8"
              height="12"
              rx="1"
              fill={accentFill}
              fillOpacity="0.3"
              stroke={stroke}
              strokeWidth="1.4"
            />
            <circle
              cx="49"
              cy="28"
              r="6"
              fill="none"
              stroke={stroke}
              strokeWidth="1.5"
            />
          </>
        ) : (
          <>
            <circle
              cx="30"
              cy="28"
              r="5.5"
              fill="none"
              stroke={stroke}
              strokeWidth="1.5"
            />
            <circle
              cx="50"
              cy="28"
              r="5.5"
              fill="none"
              stroke={stroke}
              strokeWidth="1.5"
            />
          </>
        )}
      </svg>
    );
  }

  return null;
}
