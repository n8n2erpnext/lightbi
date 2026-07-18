import type { MaterializedRuntimeData, RuntimeFilePayload } from "./full-file-runtime-parser";
import type { RuntimeDatasetSource, RuntimeSourceBindingV1 } from "./runtime-dataset-source";

type WorkerResponse =
  | { status: "success"; result: MaterializedRuntimeData }
  | { status: "error"; message: string };

export async function materializeRuntimeDatasetSource(
  source: RuntimeDatasetSource,
  signal?: AbortSignal,
  expectedBinding?: RuntimeSourceBindingV1,
): Promise<MaterializedRuntimeData> {
  signal?.throwIfAborted();
  if (expectedBinding) {
    const actual = source.binding;
    if (!actual) throw new Error("RUNTIME_SOURCE_BINDING_REQUIRED");
    if (actual.datasetId !== expectedBinding.datasetId || actual.sourceId !== expectedBinding.sourceId) throw new Error("RUNTIME_SOURCE_IDENTITY_MISMATCH");
    if (actual.sourceFingerprint !== expectedBinding.sourceFingerprint) throw new Error("RUNTIME_SOURCE_FINGERPRINT_MISMATCH");
    if (actual.inspectionGeneration !== expectedBinding.inspectionGeneration || actual.profileGeneration !== expectedBinding.profileGeneration) throw new Error("RUNTIME_SOURCE_GENERATION_MISMATCH");
    if (source.files.length !== 1) throw new Error("RUNTIME_SOURCE_FINGERPRINT_VERIFICATION_UNAVAILABLE");
    const actualHash = await crypto.subtle.digest("SHA-256", await source.files[0].file.arrayBuffer());
    const actualFingerprint = [...new Uint8Array(actualHash)].map(value => value.toString(16).padStart(2, "0")).join("");
    if (actualFingerprint !== expectedBinding.sourceFingerprint) throw new Error("RUNTIME_SOURCE_FILE_REPLACED");
  }
  const payloads: RuntimeFilePayload[] = await Promise.all(
    source.files.map(async item => ({
      name: item.file.name,
      buffer: await item.file.arrayBuffer(),
      sheetName: item.sheetName
    }))
  );
  signal?.throwIfAborted();

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./full-file-runtime.worker.ts", import.meta.url), {
      type: "module"
    });

    const cleanup = () => signal?.removeEventListener("abort", handleAbort);
    const handleAbort = () => {
      worker.terminate();
      cleanup();
      reject(new DOMException("Execution aborted.", "AbortError"));
    };

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      worker.terminate();
      cleanup();
      if (event.data.status === "success") {
        if (expectedBinding && event.data.result.rowCount !== source.sourceRowCount) {
          reject(new Error(event.data.result.rowCount < source.sourceRowCount ? "RUNTIME_MATERIALIZATION_ROW_COUNT_SHORT" : "RUNTIME_MATERIALIZATION_ROW_COUNT_EXCESS"));
        } else {
          resolve(event.data.result);
        }
      } else {
        reject(new Error(event.data.message));
      }
    };
    worker.onerror = event => {
      worker.terminate();
      cleanup();
      reject(new Error(event.message || "Full-file runtime worker failed."));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
    if (signal?.aborted) {
      handleAbort();
      return;
    }
    worker.postMessage({ payloads }, payloads.map(payload => payload.buffer));
  });
}
