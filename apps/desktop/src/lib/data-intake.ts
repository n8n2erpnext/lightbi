export type DataSourceKind =
  | "local_file"
  | "online_link"
  | "system"
  | "sample";

export type DataIntakeNextStep =
  | "file_picker"
  | "url_input"
  | "connection_form"
  | "drill_down"
  | "load_sample";

export type DataIntakeRequest = {
  sourceKind: DataSourceKind;
  sourceType: string;
  label: string;
  requiresInput: boolean;
  nextStep: DataIntakeNextStep;
  file?: File;
  initialUrl?: string;
};

export function createDataIntakeRequest(menuItem: any): DataIntakeRequest {
  return {
    sourceKind: menuItem.sourceKind || "local_file",
    sourceType: menuItem.sourceType || menuItem.id,
    label: menuItem.label,
    requiresInput: menuItem.requiresInput || false,
    nextStep: menuItem.nextStep || "file_picker"
  };
}
