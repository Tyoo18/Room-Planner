import BedInspector from "./BedInspector";
import DeskInspector from "./DeskInspector";
import ChairInspector from "./ChairInspector";
import WardrobeInspector from "./WardrobeInspector";
import ShelfInspector from "./ShelfInspector";
import CarpetInspector from "./CarpetInspector";
import DividerInspector from "./DividerInspector";
import SofaInspector from "./SofaInspector";

export const INSPECTOR_REGISTRY = {
  bed: BedInspector,
  desk: DeskInspector,
  chair: ChairInspector,
  wardrobe: WardrobeInspector,
  shelf: ShelfInspector,
  carpet: CarpetInspector,
  divider: DividerInspector,
  sofa: SofaInspector,
};
