/// <reference lib="webworker" />

import {
  materializeRuntimeFilePayloads,
  type RuntimeFilePayload
} from "./full-file-runtime-parser";

self.onmessage = (event: MessageEvent<{ payloads: RuntimeFilePayload[] }>) => {
  try {
    const result = materializeRuntimeFilePayloads(event.data.payloads);
    self.postMessage({ status: "success", result });
  } catch (error) {
    self.postMessage({
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
};

export {};
