import React from "react";
import {
  BedDouble,
  Monitor,
  DoorClosed,
  Armchair,
  Plus,
  Trash2,
  AlertTriangle,
  Lock,
  Unlock,
} from "lucide-react";
import { TRANSLATIONS } from "../utils/i18n";

export default function FurnitureCatalog({
  isRoomCreated,
  furnitures,
  selectedFurnitureId,
  conflictIds,
  onAddFurniture,
  onSelectFurniture,
  onToggleLockFurniture,
  onDeleteFurniture,
  theme = "light",
  lang = "id",
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
  const isDark = theme === "dark";

  const categories = [
    {
      type: "bed",
      title: t.catBed,
      icon: BedDouble,
      variants: [
        { label: t.bedFrame, patch: { bedStyle: "frame" } },
        { label: t.bedFloor, patch: { bedStyle: "floor" } },
      ],
    },
    {
      type: "desk",
      title: t.catDesk,
      icon: Monitor,
      variants: [
        { label: t.deskRect, patch: { deskShape: "rect" } },
        { label: t.deskL, patch: { deskShape: "l-shape" } },
        { label: t.deskRound, patch: { deskShape: "round" } },
      ],
    },
    {
      type: "wardrobe",
      title: t.catWardrobe,
      icon: DoorClosed,
      variants: [
        { label: t.wardrobeSwing, patch: { wardrobeDoorType: "swing" } },
        { label: t.wardrobeSliding, patch: { wardrobeDoorType: "sliding" } },
      ],
    },
    {
      type: "chair",
      title: t.catChair,
      icon: Armchair,
      variants: [
        { label: t.chairStandard, patch: { chairStyle: "standard" } },
        { label: t.chairOffice, patch: { chairStyle: "office" } },
        { label: t.chairStool, patch: { chairStyle: "stool" } },
      ],
    },
  ];

  const getItemLabel = (item) => {
    if (item.type === "bed") {
      return `${t.catBed} (${item.bedStyle === "floor" ? t.bedFloor : t.bedFrame})`;
    }
    if (item.type === "desk") {
      const shapeName =
        item.deskShape === "l-shape"
          ? t.deskL
          : item.deskShape === "round"
            ? t.deskRound
            : t.deskRect;
      return `${t.catDesk} ${shapeName}`;
    }
    if (item.type === "wardrobe") {
      if (item.wardrobeLayout === "grid") {
        const cols = item.wardrobeCols || 2;
        const rows = item.wardrobeRows || 3;
        return `${t.catWardrobe} Grid ${cols}×${rows} (${cols * rows}P)`;
      }
      return `${t.catWardrobe} ${item.doorCount}P`;
    }
    if (item.type === "chair") {
      return item.chairStyle === "office"
        ? t.chairOffice
        : item.chairStyle === "stool"
          ? t.chairStool
          : `${t.catChair} ${t.chairStandard}`;
    }
    return item.type;
  };

  return (
    <aside
      className={`flex h-full w-full flex-col border-r transition-colors md:w-64 ${
        isDark
          ? "border-zinc-800 bg-zinc-950 text-zinc-100"
          : "border-zinc-300 bg-zinc-50/80 text-zinc-900"
      }`}
    >
      {/* Header Panel Kiri */}
      <div
        className={`border-b px-3.5 py-3 ${
          isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
        }`}
      >
        <h2 className="text-xs font-semibold tracking-tight">
          {t.catalogTitle}
        </h2>
        <p
          className={`text-[11px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}
        >
          {t.catalogSubtitle}
        </p>
      </div>

      {/* Konten Scrollable */}
      <div
        className={`flex-1 space-y-4 overflow-y-auto p-3 ${
          isDark ? "dark-scroll" : "light-scroll"
        } ${!isRoomCreated ? "pointer-events-none opacity-45" : ""}`}
      >
        {/* Kategori Furnitur */}
        <div className="space-y-2.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.type}
                className={`rounded-xl border p-2.5 shadow-2xs ${
                  isDark
                    ? "border-zinc-800 bg-zinc-900"
                    : "border-zinc-300/90 bg-white"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-md ${
                      isDark
                        ? "bg-zinc-800 text-blue-400"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold">{cat.title}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {cat.variants.map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => onAddFurniture(cat.type, v.patch)}
                      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition ${
                        isDark
                          ? "border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:border-blue-500 hover:bg-blue-500/15 hover:text-blue-300"
                          : "border-zinc-300 bg-zinc-50 text-zinc-700 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      }`}
                    >
                      <Plus className="h-3 w-3 shrink-0" />
                      <span>{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Daftar Furnitur Terpasang di Kamar */}
        <div
          className={`rounded-xl border p-2.5 ${
            isDark
              ? "border-zinc-800 bg-zinc-900/70"
              : "border-zinc-300/90 bg-white"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold">{t.placedItemsTitle}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                isDark
                  ? "bg-zinc-800 text-zinc-300"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {furnitures.length}
            </span>
          </div>

          {furnitures.length === 0 ? (
            <p className="py-3 text-center text-[11px] text-zinc-500">
              {t.noFurnitureYet}
            </p>
          ) : (
            <div className="space-y-1.5">
              {furnitures.map((item) => {
                const isSelected = item.id === selectedFurnitureId;
                const hasConflict = conflictIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectFurniture(item.id)}
                    className={`flex cursor-pointer items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                        : isDark
                          ? "border-zinc-800 bg-zinc-950/70 text-zinc-200 hover:border-zinc-700"
                          : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-[11px] font-semibold">
                          {getItemLabel(item)}
                        </span>
                        {hasConflict && (
                          <AlertTriangle
                            className={`h-3 w-3 shrink-0 ${
                              isSelected ? "text-amber-200" : "text-red-500"
                            }`}
                          />
                        )}
                      </div>
                      <p
                        className={`text-[10px] ${
                          isSelected
                            ? "text-blue-100"
                            : isDark
                              ? "text-zinc-500"
                              : "text-zinc-500"
                        }`}
                      >
                        {item.width} × {item.depth} cm • {item.rotation}°
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLockFurniture(item.id);
                        }}
                        title={item.locked ? t.unlockItem : t.lockItem}
                        className={`rounded p-1 transition ${
                          item.locked
                            ? isSelected
                              ? "bg-amber-400/25 text-amber-200 hover:bg-amber-400/35"
                              : isDark
                                ? "text-amber-400 hover:bg-zinc-800"
                                : "text-amber-600 hover:bg-zinc-200"
                            : isSelected
                              ? "text-blue-200 hover:bg-blue-700 hover:text-white"
                              : isDark
                                ? "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                                : "text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                        }`}
                      >
                        {item.locked ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={item.locked}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFurniture(item.id);
                        }}
                        title={item.locked ? t.unlockItem : t.deleteItem}
                        className={`rounded p-1 transition disabled:cursor-not-allowed disabled:opacity-30 ${
                          isSelected
                            ? "text-blue-100 hover:bg-blue-700 hover:text-white"
                            : isDark
                              ? "text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                              : "text-zinc-400 hover:bg-zinc-200 hover:text-red-600"
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
