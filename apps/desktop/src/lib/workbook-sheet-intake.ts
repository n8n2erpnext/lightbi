import { attachPersistedFile } from './home-workspace-persistence';
import type { PendingLocalFileBatch } from './home-multisource-candidate-review';
import { inspectLocalFile } from './local-file-inspector';
import { uploadProjectSourceFile } from './project-source-file-api';
import { createFileSourceCandidate } from './source-preflight';
import type { SourceCandidate, SourceInspectionResult } from './source-preflight';

export async function inspectLocalFileBatch(files: File[], signal: AbortSignal): Promise<SourceInspectionResult[]> {
  return Promise.all(files.map(file => {
    const candidate = createFileSourceCandidate(file);
    if ('status' in candidate) return Promise.resolve(candidate as SourceInspectionResult);
    const persisted = uploadProjectSourceFile(file).catch(error => {
      console.warn('Could not persist project source file:', error);
      return null;
    });
    const inspected = inspectLocalFile(candidate, { signal, workbookManifestOnly: true });
    return Promise.all([inspected, persisted])
      .then(([result, persistedFile]) => attachPersistedFile(result, persistedFile))
      .catch(error => {
        if (signal.aborted) throw error;
        return {
          status: 'not_found',
          sourceType: candidate.sourceType,
          label: file.name,
          message: error instanceof Error ? error.message : 'Error reading file.',
        } as SourceInspectionResult;
      });
  }));
}

export function createWorkbookSheetSelectionBatch(
  files: File[],
  results: SourceInspectionResult[],
): PendingLocalFileBatch | null {
  if (!results.some(result => result.status === 'accessible' && result.metadata.requires_sheet_selection)) return null;
  const selectedSheets = Object.fromEntries(results.map((result, index) => {
    if (result.status !== 'accessible' || !result.metadata.requires_sheet_selection || !result.metadata.sheets) return [index, []];
    const recommended = Object.entries(result.metadata.sheets)
      .filter(([, sheet]) => sheet.suitability === 'tabular')
      .map(([name]) => name);
    return [index, recommended.slice(0, 1)];
  }));
  return { files, status: 'ready', results, families: [], selectedFamilyId: null, step: 'sheet_selection', selectedSheets };
}

export function toggleWorkbookSheet(batch: PendingLocalFileBatch, fileIndex: number, sheetName: string): PendingLocalFileBatch {
  const existing = batch.selectedSheets?.[fileIndex] ?? [];
  const selected = existing.includes(sheetName) ? existing.filter(name => name !== sheetName) : [...existing, sheetName];
  return { ...batch, selectedSheets: { ...batch.selectedSheets, [fileIndex]: selected } };
}

export async function expandWorkbookSheetSelection(
  batch: PendingLocalFileBatch,
  selectAll: boolean,
  signal: AbortSignal,
): Promise<{ files: File[]; results: SourceInspectionResult[] }> {
  const expanded: { file: File; result: SourceInspectionResult }[] = [];
  for (let fileIndex = 0; fileIndex < batch.files.length; fileIndex++) {
    const originalFile = batch.files[fileIndex];
    const manifest = batch.results[fileIndex];
    if (!manifest || manifest.status !== 'accessible') continue;
    if (!manifest.metadata.requires_sheet_selection) {
      expanded.push({ file: originalFile, result: manifest });
      continue;
    }
    const availableNames = manifest.metadata.sheet_names ?? Object.keys(manifest.metadata.sheets ?? {});
    const sheetNames = selectAll
      ? availableNames.filter(name => manifest.metadata.sheets?.[name]?.suitability !== 'empty')
      : (batch.selectedSheets?.[fileIndex] ?? []);
    const extensionIndex = originalFile.name.lastIndexOf('.');
    const base = extensionIndex > 0 ? originalFile.name.slice(0, extensionIndex) : originalFile.name;
    const extension = extensionIndex > 0 ? originalFile.name.slice(extensionIndex) : '.xlsx';
    for (const sheetName of sheetNames) {
      signal.throwIfAborted();
      const virtualName = sheetNames.length === 1 ? originalFile.name : `${base} — ${sheetName}${extension}`;
      const virtualFile = sheetNames.length === 1
        ? originalFile
        : new File([originalFile], virtualName, { type: originalFile.type, lastModified: originalFile.lastModified });
      const candidate = createFileSourceCandidate(virtualFile);
      if ('status' in candidate) {
        expanded.push({ file: virtualFile, result: candidate });
        continue;
      }
      const inspected = await inspectSelectedSheet(candidate, sheetName, signal, manifest);
      expanded.push({ file: virtualFile, result: inspected });
    }
  }
  return { files: expanded.map(item => item.file), results: expanded.map(item => item.result) };
}

async function inspectSelectedSheet(
  candidate: SourceCandidate,
  sheetName: string,
  signal: AbortSignal,
  manifest: Extract<SourceInspectionResult, { status: 'accessible' }>,
): Promise<SourceInspectionResult> {
  const inspected = await inspectLocalFile(candidate, { signal, selectedSheetNames: [sheetName] });
  const result = attachPersistedFile(inspected, manifest.metadata.persisted_file ?? null);
  if (result.status !== 'accessible' || result.metadata.default_sheet) return result;
  const failure = result.metadata.sheets?.[sheetName]?.profile_error ?? 'No tabular data region could be confirmed.';
  return {
    status: 'invalid_format',
    sourceType: candidate.sourceType,
    label: `${candidate.label} · ${sheetName}`,
    message: `Sheet could not be analyzed safely: ${failure}`,
  };
}
