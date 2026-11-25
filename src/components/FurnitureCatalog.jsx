import React, { useState, useMemo } from "react";
import {
  Search,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import * as furnitureGeo from "../utils/furnitureGeometry";
import * as wallElMod from "../wallElements";
import { AssetThumbnail } from "../utils/furnitureThumbnails";
import { TRANSLATIONS } from "../utils/i18n";

const WALL_ORDER = ["back", "front", "left", "right"];

function getWallGroupTitle(wallId, lang) {
  const mapId = {
    back: "Tembok Belakang",
    front: "Tembok Depan",
    left: "Tembok Kiri",
    right: "Tembok Kanan",
  };
  const mapEn = {
    back: "Back Wall",
    front: "Front Wall",
    left: "Left Wall",
    right: "Right Wall",
  };
  return (lang === "en" ? mapEn : mapId)[wallId] || wallId;
}

export default function FurnitureCatalog({
  isRoomCreated,
  furnitures = [],
  selectedFurnitureId,
  conflictIds,
  onAddFurniture,
  onSelectFurniture,
  onToggleLockFurniture,
  onDeleteFurniture,
  wallElements = [],
  selectedWallElementId = null,
  wallElementConflictIds,
  onAddWallElement,
  onSelectWallElement,
  onToggleLockWallElement,
  onDeleteWallElement,
  selectedWalls = [],
  onSelectWallLayer,
  theme = "light",
  lang = "id",
  panelWidth = 276,
  setPanelWidth,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.id;
  const isDark = theme === "dark";

  const [activeTab, setActiveTab] = useState("assets");
  const [searchQuery, setSearchQuery] = useState("");

  // Accordion Assets: default hanya bagian paling atas ("sleep") yang kebuka
  const [openZones, setOpenZones] = useState({ sleep: true });

  // Tree collapse state di tab Layers
  const [openGroups, setOpenGroups] = useState({
    floor: true,
    back: true,
    front: true,
    left: true,
    right: true,
  });

  const toggleZone = (zoneId) => {
    setOpenZones((prev) => ({ ...prev, [zoneId]: !prev[zoneId] }));
  };

  const toggleGroup = (groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Susun zona katalog
  const allZones = useMemo(
    () => [
      {
        id: "sleep",
        title: t.zoneSleep || (lang === "en" ? "Sleep" : "Tidur"),
        categories: [
          {
            type: "bed",
            title: t.catBed || (lang === "en" ? "Bed" : "Kasur"),
            variants: [
              {
                label:
                  t.bedFrame || (lang === "en" ? "Bed Frame" : "Kasur Dipan"),
                patch: { bedStyle: "frame" },
              },
              {
                label:
                  t.bedFloor ||
                  (lang === "en" ? "Floor Mattress" : "Kasur Lesehan"),
                patch: { bedStyle: "floor" },
              },
            ],
          },
        ],
      },
      {
        id: "workSeating",
        title:
          t.zoneWorkSeating ||
          (lang === "en" ? "Work & Seating" : "Kerja & Duduk"),
        categories: [
          {
            type: "desk",
            title: t.catDesk || (lang === "en" ? "Desk" : "Meja"),
            variants: [
              {
                label: t.deskRect || (lang === "en" ? "Rectangle" : "Persegi"),
                patch: { deskShape: "rect" },
              },
              {
                label: t.deskLShape || (lang === "en" ? "L-Shape" : "Letter-L"),
                patch: { deskShape: "l-shape" },
              },
              {
                label:
                  t.deskRound ||
                  (lang === "en" ? "Round / Oval" : "Bulat / Oval"),
                patch: { deskShape: "round" },
              },
            ],
          },
          {
            type: "chair",
            title: t.catChair || (lang === "en" ? "Chair" : "Kursi"),
            variants: [
              {
                label:
                  t.chairStandard || (lang === "en" ? "Standard" : "Standar"),
                patch: { chairStyle: "standard" },
              },
              {
                label:
                  t.chairOffice ||
                  (lang === "en" ? "Office Chair" : "Kursi Kerja"),
                patch: { chairStyle: "office" },
              },
              {
                label:
                  t.chairStool || (lang === "en" ? "Stool" : "Kursi Bulat"),
                patch: { chairStyle: "stool" },
              },
            ],
          },
          {
            type: "sofa",
            title: t.catSofa || (lang === "en" ? "Sofa & Lounge" : "Sofa"),
            variants: [
              {
                label:
                  t.sofaMinimal || (lang === "en" ? "Minimalist" : "Minimalis"),
                patch: { sofaStyle: "sofa" },
              },
              {
                label: t.sofaBeanbag || "Beanbag",
                patch: { sofaStyle: "beanbag" },
              },
            ],
          },
        ],
      },
      {
        id: "storage",
        title: t.zoneStorage || (lang === "en" ? "Storage" : "Penyimpanan"),
        categories: [
          {
            type: "wardrobe",
            title: t.catWardrobe || (lang === "en" ? "Wardrobe" : "Lemari"),
            variants: [
              {
                label:
                  t.wardrobeHinged ||
                  (lang === "en" ? "Hinged Door" : "Pintu Tarik"),
                patch: { doorStyle: "hinged" },
              },
              {
                label:
                  t.wardrobeSliding ||
                  (lang === "en" ? "Sliding" : "Pintu Geser"),
                patch: { doorStyle: "sliding" },
              },
            ],
          },
          {
            type: "shelf",
            title: t.catShelf || (lang === "en" ? "Shelf" : "Rak"),
            variants: [
              {
                label:
                  t.shelfCube || (lang === "en" ? "Cube Shelf" : "Rak Kotak"),
                patch: { shelfStyle: "cube" },
              },
              {
                label:
                  t.shelfConsole ||
                  (lang === "en" ? "Console Shelf" : "Rak Pendek"),
                patch: { shelfStyle: "console" },
              },
            ],
          },
        ],
      },
      {
        id: "floorDecor",
        title:
          t.zoneFloorDecor ||
          (lang === "en" ? "Floor & Decor" : "Lantai & Dekor"),
        categories: [
          {
            type: "carpet",
            title: t.catCarpet || (lang === "en" ? "Carpet" : "Karpet"),
            variants: [
              {
                label:
                  t.carpetRect || (lang === "en" ? "Rectangle" : "Persegi"),
                patch: { carpetShape: "rect" },
              },
              {
                label:
                  t.carpetRound ||
                  (lang === "en" ? "Round / Oval" : "Bulat / Oval"),
                patch: { carpetShape: "round" },
              },
            ],
          },
          {
            type: "divider",
            title: t.catDivider || (lang === "en" ? "Room Divider" : "Partisi"),
            variants: [
              {
                label:
                  t.dividerSolid ||
                  (lang === "en" ? "Solid Panel" : "Panel Polos"),
                patch: { dividerStyle: "solid" },
              },
              {
                label:
                  t.dividerSlat ||
                  (lang === "en" ? "Slat Screen" : "Kisi-Kisi"),
                patch: { dividerStyle: "slat" },
              },
            ],
          },
        ],
      },
      {
        id: "wallAccess",
        title:
          t.zoneWallAccess ||
          (lang === "en" ? "Wall & Access" : "Dinding & Akses"),
        categories: [
          {
            type: "window",
            title: t.catWindow || (lang === "en" ? "Window" : "Jendela"),
            isWallElement: true,
            variants: [
              {
                label:
                  t.windowDouble || (lang === "en" ? "Double Sash" : "2 Daun"),
                patch: { windowStyle: "double" },
              },
              {
                label:
                  t.windowSingle || (lang === "en" ? "Single Sash" : "1 Daun"),
                patch: { windowStyle: "single" },
              },
              {
                label:
                  t.windowVent || (lang === "en" ? "Top Vent" : "Ventilasi"),
                patch: { windowStyle: "vent" },
              },
            ],
          },
          {
            type: "outlet",
            title: t.catOutlet || (lang === "en" ? "Outlet" : "Stopkontak"),
            isWallElement: true,
            variants: [
              {
                label:
                  t.outletDouble ||
                  (lang === "en" ? "Double Socket" : "2 Lubang"),
                patch: { outletStyle: "double" },
              },
              {
                label:
                  t.outletSingle ||
                  (lang === "en" ? "Single Socket" : "1 Lubang"),
                patch: { outletStyle: "single" },
              },
              {
                label:
                  t.outletSwitch ||
                  (lang === "en" ? "Switch + Socket" : "Saklar + Kontak"),
                patch: { outletStyle: "switch" },
              },
            ],
          },
          {
            type: "ac",
            title: t.catAC || (lang === "en" ? "Wall AC" : "AC Dinding"),
            isWallElement: true,
            variants: [
              {
                label: t.catAC || (lang === "en" ? "Wall AC" : "AC Dinding"),
                patch: {},
              },
            ],
          },
        ],
      },
    ],
    [t, lang],
  );

  // Filter pencarian di tab Assets
  const filteredZones = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allZones;

    return allZones
      .map((zone) => {
        const matchedCats = zone.categories
          .map((cat) => {
            const catMatch = cat.title.toLowerCase().includes(q);
            const matchedVariants = cat.variants.filter(
              (v) => catMatch || v.label.toLowerCase().includes(q),
            );
            return matchedVariants.length > 0
              ? { ...cat, variants: matchedVariants }
              : null;
          })
          .filter(Boolean);

        return matchedCats.length > 0
          ? { ...zone, categories: matchedCats }
          : null;
      })
      .filter(Boolean);
  }, [allZones, searchQuery]);

  // Susun hierarchy tree untuk tab Layers (Parents: Lantai + 4 Tembok)
  const layerTree = useMemo(() => {
    const getFurnName = furnitureGeo.getFurnitureLabel || ((item) => item.type);
    const getWallElName = wallElMod.getWallElementLabel || ((el) => el.type);

    const counters = new Map();

    const floorChildren = furnitures.map((item) => {
      const baseName = getFurnName(item, t);
      const nextCount = (counters.get(baseName) || 0) + 1;
      counters.set(baseName, nextCount);
      return {
        id: item.id,
        kind: "furniture",
        displayName: `${baseName} ${nextCount}`,
        locked: Boolean(item.locked),
        isSelected: item.id === selectedFurnitureId,
        hasConflict: Boolean(conflictIds?.has?.(item.id)),
      };
    });

    const wallElByWall = { back: [], front: [], left: [], right: [] };
    wallElements.forEach((el) => {
      const baseName = getWallElName(el, t);
      const nextCount = (counters.get(baseName) || 0) + 1;
      counters.set(baseName, nextCount);
      const node = {
        id: el.id,
        kind: "wallElement",
        displayName: `${baseName} ${nextCount}`,
        locked: Boolean(el.locked),
        isSelected: el.id === selectedWallElementId,
        hasConflict: Boolean(wallElementConflictIds?.has?.(el.id)),
      };
      if (wallElByWall[el.wall]) {
        wallElByWall[el.wall].push(node);
      }
    });

    const groups = [
      {
        id: "floor",
        title: lang === "en" ? "Room Floor" : "Lantai Kamar",
        isWall: false,
        children: floorChildren,
      },
      ...WALL_ORDER.map((wallId) => ({
        id: wallId,
        title: getWallGroupTitle(wallId, lang),
        isWall: true,
        isWallActive:
          !selectedFurnitureId &&
          !selectedWallElementId &&
          selectedWalls.length === 1 &&
          selectedWalls[0] === wallId,
        children: wallElByWall[wallId],
      })),
    ];

    return {
      groups,
      totalCount: furnitures.length + wallElements.length,
    };
  }, [
    furnitures,
    wallElements,
    selectedFurnitureId,
    selectedWallElementId,
    selectedWalls,
    conflictIds,
    wallElementConflictIds,
    t,
    lang,
  ]);

  // Resize handle sisi kanan panel kiri
  const handleResizePointerDown = (e) => {
    if (!setPanelWidth) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMove = (moveEvent) => {
      const nextWidth = Math.min(
        420,
        Math.max(225, startWidth + (moveEvent.clientX - startX)),
      );
      setPanelWidth(nextWidth);
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <aside
      style={{ "--left-panel-w": `${panelWidth}px` }}
      className={`relative flex h-full w-full flex-col border-r transition-colors md:w-(--left-panel-w) ${
        isDark
          ? "border-zinc-800 bg-zinc-900 text-zinc-100"
          : "border-zinc-200 bg-white text-zinc-900"
      }`}
    >
      {/* Handle Resize di Tepi Kanan */}
      {setPanelWidth && (
        <div
          onPointerDown={handleResizePointerDown}
          title={t.resizePanelHint}
          className="group absolute top-0 right-0 z-20 hidden h-full w-1.5 cursor-col-resize items-center justify-center md:flex"
        >
          <div className="h-10 w-0.5 rounded-full bg-transparent transition-colors group-hover:bg-blue-500/75" />
        </div>
      )}

      {/* Header Tab Figma Style: Assets | Layers */}
      <div
        className={`flex shrink-0 items-center justify-between border-b px-3 pt-2.5 pb-2 ${
          isDark ? "border-zinc-800" : "border-zinc-200"
        }`}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("assets")}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === "assets"
                ? isDark
                  ? "bg-zinc-800 text-zinc-100"
                  : "bg-zinc-100 text-zinc-900"
                : isDark
                  ? "text-zinc-400 hover:text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            {t.tabAssets || "Assets"}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("layers")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              activeTab === "layers"
                ? isDark
                  ? "bg-zinc-800 text-zinc-100"
                  : "bg-zinc-100 text-zinc-900"
                : isDark
                  ? "text-zinc-400 hover:text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>{t.tabLayers || "Layers"}</span>
            {layerTree.totalCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === "layers"
                    ? "bg-blue-600 text-white"
                    : isDark
                      ? "bg-zinc-800 text-zinc-400"
                      : "bg-zinc-200/80 text-zinc-600"
                }`}
              >
                {layerTree.totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: ASSETS (Accordion per Zona) */}
      {activeTab === "assets" && (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Search Bar */}
          <div
            className={`shrink-0 border-b px-3 py-2 ${
              isDark ? "border-zinc-800/80" : "border-zinc-100"
            }`}
          >
            <div
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                isDark
                  ? "border-zinc-800 bg-zinc-950/80 text-zinc-200 focus-within:border-blue-500"
                  : "border-zinc-200 bg-zinc-50 text-zinc-800 focus-within:border-blue-500"
              }`}
            >
              <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  t.searchAssetsPlaceholder ||
                  (lang === "en" ? "Search assets..." : "Cari aset...")
                }
                className="w-full bg-transparent text-xs outline-none placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* List Accordion */}
          <div
            className={`flex-1 divide-y overflow-y-auto ${
              isDark ? "divide-zinc-800/70" : "divide-zinc-100"
            } ${!isRoomCreated ? "pointer-events-none opacity-45" : ""}`}
          >
            {filteredZones.map((zone) => {
              const isExpanded =
                Boolean(searchQuery.trim()) || Boolean(openZones[zone.id]);
              const variantCount = zone.categories.reduce(
                (acc, c) => acc + c.variants.length,
                0,
              );

              return (
                <section key={zone.id} className="px-3 py-2">
                  {/* Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleZone(zone.id)}
                    className={`flex w-full items-center justify-between rounded-md py-1 text-left transition ${
                      isDark
                        ? "text-zinc-300 hover:text-zinc-100"
                        : "text-zinc-700 hover:text-zinc-950"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                      )}
                      <span className="text-[11px] font-bold tracking-wider uppercase">
                        {zone.title}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-medium ${
                        isDark ? "text-zinc-500" : "text-zinc-400"
                      }`}
                    >
                      {variantCount}
                    </span>
                  </button>

                  {/* Accordion Body: Grid Kartu */}
                  {isExpanded && (
                    <div className="mt-2 mb-1 grid grid-cols-[repeat(auto-fill,minmax(102px,1fr))] gap-2">
                      {zone.categories.flatMap((cat) =>
                        cat.variants.map((variant, idx) => {
                          const displayLabel =
                            cat.variants.length === 1
                              ? cat.title
                              : `${cat.title} · ${variant.label}`;

                          return (
                            <button
                              key={`${cat.type}_${idx}`}
                              type="button"
                              onClick={() => {
                                if (cat.isWallElement) {
                                  onAddWallElement?.(cat.type, variant.patch);
                                } else {
                                  onAddFurniture(cat.type, variant.patch);
                                }
                              }}
                              className={`group flex flex-col items-center justify-between rounded-xl border p-2 text-center transition ${
                                isDark
                                  ? "border-zinc-800 bg-zinc-950/60 hover:border-blue-500/70 hover:bg-zinc-800/80"
                                  : "border-zinc-200/90 bg-zinc-50/70 hover:border-blue-500 hover:bg-blue-50/40"
                              }`}
                            >
                              <div
                                className={`flex h-12 w-full items-center justify-center rounded-lg transition-transform group-hover:scale-105 ${
                                  isDark ? "bg-zinc-900/90" : "bg-white"
                                }`}
                              >
                                <AssetThumbnail
                                  type={cat.type}
                                  patch={variant.patch}
                                  isDark={isDark}
                                />
                              </div>
                              <span
                                className={`mt-1.5 line-clamp-2 text-[11px] leading-tight font-medium ${
                                  isDark ? "text-zinc-200" : "text-zinc-700"
                                }`}
                              >
                                {displayLabel}
                              </span>
                            </button>
                          );
                        }),
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LAYERS (Figma Tree: Lantai & Tembok sebagai Parent Group) */}
      {activeTab === "layers" && (
        <div className="flex-1 overflow-y-auto p-2">
          {!isRoomCreated ? (
            <div className="flex h-40 items-center justify-center px-4 text-center text-xs text-zinc-500">
              {t.emptyLayersHint ||
                (lang === "en"
                  ? "Create a room first to see layers."
                  : "Buat kamar terlebih dahulu untuk melihat layers.")}
            </div>
          ) : (
            <div className="space-y-1">
              {layerTree.groups.map((group) => {
                const hasChildren = group.children.length > 0;
                const isOpen = Boolean(openGroups[group.id]);

                const handleSelectParent = () => {
                  onSelectFurniture(null);
                  onSelectWallElement?.(null);
                  if (group.isWall) {
                    onSelectWallLayer?.(group.id);
                  }
                };

                return (
                  <div key={group.id}>
                    {/* Parent Node (Frame / Group) */}
                    <div
                      onClick={handleSelectParent}
                      className={`group flex cursor-pointer items-center justify-between rounded-md px-1.5 py-1.5 text-xs transition ${
                        group.isWallActive
                          ? isDark
                            ? "bg-blue-500/15 font-semibold text-blue-300"
                            : "bg-blue-50 font-semibold text-blue-700"
                          : isDark
                            ? "font-semibold text-zinc-200 hover:bg-zinc-800/75"
                            : "font-semibold text-zinc-800 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-1">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(group.id);
                            }}
                            className="rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                          >
                            {isOpen ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        ) : (
                          <span className="inline-block w-4" />
                        )}
                        <span className="truncate">{group.title}</span>
                      </div>

                      {hasChildren && (
                        <span
                          className={`px-1 text-[10px] font-medium ${
                            isDark ? "text-zinc-500" : "text-zinc-400"
                          }`}
                        >
                          {group.children.length}
                        </span>
                      )}
                    </div>

                    {/* Indented Child Layers */}
                    {hasChildren && isOpen && (
                      <div
                        className={`ml-3.5 space-y-0.5 border-l pl-2 ${
                          isDark ? "border-zinc-800" : "border-zinc-200"
                        }`}
                      >
                        {group.children.map((child) => {
                          const handleSelectChild = () => {
                            if (child.kind === "wallElement") {
                              onSelectWallElement?.(child.id);
                            } else {
                              onSelectFurniture(child.id);
                            }
                          };

                          const handleToggleLock = (e) => {
                            e.stopPropagation();
                            if (child.kind === "wallElement") {
                              onToggleLockWallElement?.(child.id);
                            } else {
                              onToggleLockFurniture(child.id);
                            }
                          };

                          const handleDelete = (e) => {
                            e.stopPropagation();
                            if (child.kind === "wallElement") {
                              onDeleteWallElement?.(child.id);
                            } else {
                              onDeleteFurniture(child.id);
                            }
                          };

                          return (
                            <div
                              key={child.id}
                              onClick={handleSelectChild}
                              className={`group flex cursor-pointer items-center justify-between gap-1.5 rounded-md px-2 py-1 text-xs transition ${
                                child.isSelected
                                  ? isDark
                                    ? "bg-blue-500/20 font-semibold text-blue-300"
                                    : "bg-blue-50 font-semibold text-blue-700"
                                  : isDark
                                    ? "text-zinc-300 hover:bg-zinc-800/75"
                                    : "text-zinc-700 hover:bg-zinc-100"
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-1.5">
                                {child.hasConflict && (
                                  <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />
                                )}
                                <span className="truncate">
                                  {child.displayName}
                                </span>
                              </div>

                              <div
                                className={`flex shrink-0 items-center gap-0.5 transition-opacity ${
                                  child.isSelected || child.locked
                                    ? "opacity-100"
                                    : "opacity-0 group-hover:opacity-100"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={handleToggleLock}
                                  title={
                                    child.locked ? t.unlockItem : t.lockItem
                                  }
                                  className={`rounded p-0.5 transition ${
                                    child.locked
                                      ? "text-amber-500"
                                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                  }`}
                                >
                                  {child.locked ? (
                                    <Lock className="h-3 w-3" />
                                  ) : (
                                    <Unlock className="h-3 w-3" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={child.locked}
                                  onClick={handleDelete}
                                  title={t.deleteItem}
                                  className="rounded p-0.5 text-zinc-400 transition hover:text-red-500 disabled:opacity-25"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
