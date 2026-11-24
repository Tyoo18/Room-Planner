import BedInspector from "./BedInspector";
import DeskInspector from "./DeskInspector";
import WardrobeInspector from "./WardrobeInspector";
import ShelfInspector from "./ShelfInspector";
import ChairInspector from "./ChairInspector";
import CarpetInspector from "./CarpetInspector";

export const INSPECTOR_REGISTRY = {
  bed: BedInspector,
  desk: DeskInspector,
  wardrobe: WardrobeInspector,
  shelf: ShelfInspector,
  chair: ChairInspector,
  carpet: CarpetInspector,
};
