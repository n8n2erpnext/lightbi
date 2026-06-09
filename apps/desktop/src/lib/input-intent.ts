export type InputIntent =
  | { type: "question" }
  | { type: "link_candidate"; value: string };

export type LinkPreflightResult =
  | { status: "not_link" }
  | {
      status: "malformed";
      sourceHint?: "google_sheets" | "m365_excel" | "csv_url" | "excel_url";
      messageKey: string;
      expectedFormat?: string;
    }
  | {
      status: "unsupported";
      normalizedValue: string;
    }
  | {
      status: "supported";
      sourceType: "google_sheets" | "m365_excel" | "csv_url" | "excel_url";
      label: string;
      confidence: number;
      normalizedUrl: string;
    };

export function detectInputIntent(input: string): InputIntent {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { type: "question" };
  }

  // A value is link-like if: no spaces, contains a dot, and (contains a slash OR starts with http)
  if (
    !trimmed.includes(" ") &&
    trimmed.includes(".") &&
    (trimmed.includes("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://"))
  ) {
    return { type: "link_candidate", value: trimmed };
  }

  return { type: "question" };
}

export function preflightLinkInput(input: string): LinkPreflightResult {
  const intent = detectInputIntent(input);
  if (intent.type === "question") {
    return { status: "not_link" };
  }
  
  return inspectSupportedSource(intent.value);
}

function inspectSupportedSource(value: string): LinkPreflightResult {
  const lower = value.toLowerCase();

  // Normalize protocol
  let normalizedUrl = value;
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    normalizedUrl = `https://${value}`;
  }

  const normalizedLower = normalizedUrl.toLowerCase();

  // 1. Check Google Sheets
  if (normalizedLower.startsWith("https://docs.google.com/spreadsheets") || normalizedLower.startsWith("https://google.com/spreadsheets")) {
    return {
      status: "supported",
      sourceType: "google_sheets",
      label: "Google Sheets",
      confidence: 1.0,
      normalizedUrl
    };
  }

  // 2. Check CSV
  if (normalizedLower.includes(".csv")) {
    try {
      const urlObj = new URL(normalizedUrl);
      if (urlObj.pathname.endsWith(".csv")) {
        return {
          status: "supported",
          sourceType: "csv_url",
          label: "CSV URL",
          confidence: 1.0,
          normalizedUrl
        };
      }
    } catch {
      // Ignore URL parsing errors and fallback
    }
  }

  // 3. Check Excel
  if (normalizedLower.includes(".xlsx") || normalizedLower.includes(".xls")) {
    // Check Microsoft 365
    if (
      normalizedLower.includes("sharepoint.com") ||
      normalizedLower.includes("1drv.ms") ||
      normalizedLower.includes("office.com")
    ) {
      return {
        status: "supported",
        sourceType: "m365_excel",
        label: "Microsoft 365 Excel",
        confidence: 1.0,
        normalizedUrl
      };
    }

    try {
      const urlObj = new URL(normalizedUrl);
      if (urlObj.pathname.endsWith(".xlsx") || urlObj.pathname.endsWith(".xls")) {
        return {
          status: "supported",
          sourceType: "excel_url",
          label: "Excel URL",
          confidence: 1.0,
          normalizedUrl
        };
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  // If it matches domain but didn't pass specific path checks (e.g. sharepoint.com without excel extension)
  if (
    normalizedLower.includes("sharepoint.com") ||
    normalizedLower.includes("1drv.ms") ||
    normalizedLower.includes("office.com")
  ) {
    return {
      status: "supported",
      sourceType: "m365_excel",
      label: "Microsoft 365 Excel",
      confidence: 1.0,
      normalizedUrl
    };
  }

  return {
    status: "unsupported",
    normalizedValue: normalizedUrl
  };
}
