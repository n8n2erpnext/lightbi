import type { MaterializedRuntimeData, RuntimeFilePayload } from "./full-file-runtime-parser";
import type { RuntimeDatasetSource } from "./runtime-dataset-source";

type WorkerResponse =
  | { status: "success"; result: MaterializedRuntimeData }
  | { status: "error"; message: string };

export async function materializeRuntimeDatasetSource(
  source: RuntimeDatasetSource,
  signal?: AbortSignal
): Promise<MaterializedRuntimeData> {
  signal?.throwIfAborted();
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
        resolve(event.data.result);
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
