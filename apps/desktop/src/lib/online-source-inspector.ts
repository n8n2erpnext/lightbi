import type { SourceCandidate, SourceInspectionResult } from './source-preflight';
import { getApiBaseUrl } from './api-base';
import { inspectLocalFile } from './local-file-inspector';
import { externalFetch } from './native-capabilities';

function googleSheetsCsvExportUrl(url: string): string {
  const idMatch = url.match(/\/spreadsheets\/d\/([^/?#]+)/i);
  const spreadsheetId = idMatch?.[1];
  if (!spreadsheetId) throw new Error("Google Sheets URL is missing a sheet ID.");

  const gidMatch = url.match(/[?&#]gid=([^&#]+)/i);
  const gid = gidMatch?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

function googleSheetsGvizCsvUrl(url: string): string {
  const idMatch = url.match(/\/spreadsheets\/d\/([^/?#]+)/i);
  const spreadsheetId = idMatch?.[1];
  if (!spreadsheetId) throw new Error("Google Sheets URL is missing a sheet ID.");

  const gidMatch = url.match(/[?&#]gid=([^&#]+)/i);
  const gid = gidMatch?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`;
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split('/').filter(Boolean).pop();
    return name || fallback;
  } catch {
    return fallback;
  }
}

async function fetchText(url: string): Promise<string> {
  const response = await externalFetch(url);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("ACCESS_DENIED");
    }
    throw new Error(`FETCH_FAILED_${response.status}`);
  }
  return response.text();
}

async function fetchCsvThroughBackend(url: string): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/api/online-source/fetch-csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });
  if (!response.ok) {
    let message = `FETCH_FAILED_${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.message === "string") message = body.message;
    } catch {
      // keep status-based message
    }
    if (response.status === 401 || response.status === 403) throw new Error("ACCESS_DENIED");
    throw new Error(message);
  }
  return response.text();
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await externalFetch(url);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("ACCESS_DENIED");
    }
    throw new Error(`FETCH_FAILED_${response.status}`);
  }
  return response.arrayBuffer();
}

async function fetchMicrosoftExcelThroughBackend(url: string): Promise<ArrayBuffer> {
  const response = await fetch(`${getApiBaseUrl()}/api/online-source/fetch-excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    let message = `FETCH_FAILED_${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.message === "string") message = body.message;
    } catch {
      // keep status-based message
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("ACCESS_DENIED");
    }
    throw new Error(message);
  }

  return response.arrayBuffer();
}

async function inspectRemoteCsv(candidate: SourceCandidate, fetchUrl: string, name: string, useBackend = false): Promise<SourceInspectionResult> {
  const text = useBackend ? await fetchCsvThroughBackend(fetchUrl) : await fetchText(fetchUrl);
  const fileName = name.toLowerCase().endsWith('.csv') ? name : `${name}.csv`;
  const file = new File([text], fileName, { type: 'text/csv' });
  return inspectDownloadedOnlineFile(candidate, file, 'local_csv');
}

async function inspectDownloadedOnlineFile(
  candidate: SourceCandidate,
  file: File,
  localSourceType: 'local_csv' | 'local_xlsx' | 'local_xls'
): Promise<SourceInspectionResult> {
  // Online sources must cross the exact same canonical full-file boundary as
  // local imports. Keeping a separate lightweight profiler here caused the UI
  // to understand a sheet while runtime correctly refused to execute it.
  const inspected = await inspectLocalFile({
    sourceType: localSourceType,
    label: file.name,
    rawUrl: candidate.rawUrl,
    normalizedUrl: candidate.normalizedUrl,
    file
  });

  if (inspected.status === 'accessible') {
    return {
      ...inspected,
      sourceType: candidate.sourceType,
      label: candidate.label,
      normalizedUrl: candidate.normalizedUrl,
      file
    };
  }

  return {
    ...inspected,
    sourceType: candidate.sourceType,
    label: candidate.label
  } as SourceInspectionResult;
}

async function inspectRemoteExcel(candidate: SourceCandidate): Promise<SourceInspectionResult> {
  const buffer = candidate.sourceType === "m365_excel"
    ? await fetchMicrosoftExcelThroughBackend(candidate.normalizedUrl)
    : await fetchArrayBuffer(candidate.normalizedUrl);
  const name = filenameFromUrl(candidate.normalizedUrl, candidate.label);
  const isLegacyExcel = name.toLowerCase().endsWith('.xls');
  const fileName = /\.xlsx?$/i.test(name) ? name : `${name}.xlsx`;
  const file = new File([buffer.slice(0)], fileName, {
    type: isLegacyExcel
      ? 'application/vnd.ms-excel'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  return inspectDownloadedOnlineFile(candidate, file, isLegacyExcel ? 'local_xls' : 'local_xlsx');
}

export async function inspectOnlineSource(candidate: SourceCandidate): Promise<SourceInspectionResult> {
  try {
    if (candidate.sourceType === "google_sheets") {
      const exportUrl = googleSheetsCsvExportUrl(candidate.normalizedUrl);
      try {
        return await inspectRemoteCsv(candidate, exportUrl, "Google Sheet", true);
      } catch (error: any) {
        if (error?.message === "ACCESS_DENIED") throw error;
        const gvizUrl = googleSheetsGvizCsvUrl(candidate.normalizedUrl);
        return await inspectRemoteCsv(candidate, gvizUrl, "Google Sheet", true);
      }
    }

    if (candidate.sourceType === "csv_url") {
      return await inspectRemoteCsv(candidate, candidate.normalizedUrl, filenameFromUrl(candidate.normalizedUrl, "CSV URL"));
    }

    if (candidate.sourceType === "excel_url" || candidate.sourceType === "m365_excel") {
      return await inspectRemoteExcel(candidate);
    }

    return {
      status: "unsupported",
      message: "This online source type is not supported by the online inspector."
    };
  } catch (error: any) {
    if (error?.message === "ACCESS_DENIED") {
      return {
        status: "access_denied",
        sourceType: candidate.sourceType,
        label: candidate.label,
        message: `${candidate.label} requires authentication or is not shared publicly.`
      };
    }

    if (candidate.sourceType === "google_sheets" && /failed to fetch/i.test(error?.message ?? "")) {
      return {
        status: "access_denied",
        sourceType: candidate.sourceType,
        label: candidate.label,
        message: "This Google Sheet is not shared publicly, requires sign-in, or is blocked by browser access rules."
      };
    }

    return {
      status: "not_found",
      sourceType: candidate.sourceType,
      label: candidate.label,
      message: `Could not inspect ${candidate.label}. ${error?.message ?? "Unknown error"}`
    };
  }
}
