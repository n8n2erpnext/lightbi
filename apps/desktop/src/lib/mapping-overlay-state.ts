export type MappingActionType = "map_temporary" | "merge_temporary" | "ignore_mismatch" | "keep_raw_unchanged";

export interface MappingOverlayAction {
  actionType: MappingActionType;
  physicalColumn: string;
  targetSignal?: string;
  mergeWithColumn?: string;
}

export function applyMappingAction(
  currentActions: MappingOverlayAction[],
  newAction: MappingOverlayAction
): MappingOverlayAction[] {
  const filtered = currentActions.filter(a => a.physicalColumn !== newAction.physicalColumn);
  if (newAction.actionType !== "keep_raw_unchanged") {
     return [...filtered, newAction];
  }
  return filtered;
}
