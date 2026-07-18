#!/usr/bin/env node
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const XLSX = require(path.join(ROOT, "node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx/xlsx.js"));
const SEED = "lightbi-phase-7r41-sanitizer-v1-20260718";
const OUTPUT = path.join(ROOT, "sample-corpus/versions/1.4.0/fixtures");

const FIXTURES = [
  ["sample data/2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx", "management-ranking-sanitized.xlsx"],
  ["sample data/BHX_PHIEUXUAT.xlsx", "sales-issue-sanitized.xlsx"],
  ["sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx", "inventory-detail-sanitized.xlsx"],
  ["sample data/PLU ALL FRESH 22.03.2021.xlsx", "product-list-sanitized.xlsx"],
  ["sample data/TỒN DỰ KIẾN HUBLAN.xlsx", "inventory-projection-sanitized.xlsx"],
  ["sample data/bcctnhapTTKT_19122024.xlsx", "delivery-1912-sanitized.xlsx"],
  ["sample data/bcctnhapTTKT_23122024.xlsx", "delivery-2312-sanitized.xlsx"],
  ["sample data/bcctnhapTTKT_24122024.xlsx", "delivery-2412-sanitized.xlsx"],
  ["sample data/Sample - Superstore for Tableau 9.x versions.xls", "commerce-orders-synthetic.xlsx"],
  ["sample data/World Bank Indicators.xlsx", "public-indicators-synthetic.xlsx"],
  ["sample data/WorldCupPlayers.xlsx", "event-participants-synthetic.xlsx"],
  ["sample data/bank-additional-full.xlsx", "campaign-outcomes-synthetic.xlsx"],
  ["sample data/motodetail.xlsx", "service-detail-synthetic.xlsx"],
];

function hash(value) {
  return crypto.createHash("sha256").update(`${SEED}\u001f${value}`).digest("hex");
}

function selectRows(length, headerRow) {
  const data = Array.from({ length: Math.max(0, length - headerRow - 1) }, (_, index) => headerRow + index + 1);
  if (data.length <= 240) return new Set(data);
  const selected = new Set([
    ...data.slice(0, 100),
    ...data.slice(Math.max(0, Math.floor(data.length / 2) - 25), Math.floor(data.length / 2) + 25),
    ...data.slice(-50),
  ]);
  const ranked = data
    .filter((index) => !selected.has(index))
    .map((index) => ({ index, rank: hash(`row:${index}`) }))
    .sort((left, right) => left.rank.localeCompare(right.rank));
  for (const item of ranked.slice(0, 40)) selected.add(item.index);
  return selected;
}

function headerScore(row) {
  const populated = row.filter((value) => value !== "" && value !== null && value !== undefined);
  if (populated.length < 2) return -1;
  const strings = populated.filter((value) => typeof value === "string").length;
  const unique = new Set(populated.map((value) => String(value).trim().toLowerCase())).size;
  return strings * 3 + unique - populated.length * 0.2;
}

function inferHeader(rows) {
  let best = 0;
  let score = -Infinity;
  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const candidate = headerScore(rows[index] ?? []);
    if (candidate > score) {
      score = candidate;
      best = index;
    }
  }
  return best;
}

function syntheticString(column, value, rowIndex) {
  const normalized = String(value).trim();
  if (!normalized) return "";
  if (/^(true|false)$/i.test(normalized)) return rowIndex % 2 === 0 ? "true" : "false";
  if (/^[+-]?\d+(?:[.,]\d+)?%$/.test(normalized)) return `${(rowIndex * 7) % 101}%`;
  if (/^[+-]?\d+(?:[.,]\d+)?$/.test(normalized)) return String(1000 + ((rowIndex * 37) % 8000));
  if (/^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/.test(normalized)) {
    return `2024-${String((rowIndex % 12) + 1).padStart(2, "0")}-${String((rowIndex % 27) + 1).padStart(2, "0")}`;
  }
  if (/^#(?:value|ref|div\/0|n\/a|name|null|num)!?$/i.test(normalized)) return "#VALUE!";
  const bucket = Number.parseInt(hash(`${column}:${normalized}`).slice(0, 8), 16) % 23;
  return `V${String(bucket + 1).padStart(2, "0")}`;
}

function sanitizeValue(value, column, rowIndex, prohibited) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) return new Date(Date.UTC(2024, rowIndex % 12, (rowIndex % 27) + 1));
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    if (value === 0) return 0;
    if (/(?:^|\b)(date|ngày|ngay|thời gian|thoi gian)(?:\b|$)/i.test(column.replace(/\n/g, " "))) return 45000 + (rowIndex % 700);
    const sign = value < 0 ? -1 : 1;
    const magnitude = Math.max(1, Math.floor(Math.log10(Math.abs(value) + 1)));
    return sign * (magnitude * 100 + ((rowIndex * 17) % 97));
  }
  const raw = String(value).trim();
  if (raw.length >= 8 && !/^[+-]?\d+(?:[.,]\d+)?$/.test(raw) && !/^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}/.test(raw)) prohibited.add(raw);
  return syntheticString(column, value, rowIndex);
}

function sanitizeSheet(sheet, prohibited) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "", blankrows: true });
  const headerRow = inferHeader(rows);
  const selected = selectRows(rows.length, headerRow);
  const output = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    if (rowIndex > headerRow && !selected.has(rowIndex)) continue;
    const row = rows[rowIndex] ?? [];
    if (rowIndex === headerRow) output.push(row.map((value) => String(value ?? "")));
    else if (rowIndex < headerRow) output.push(row.map((value, columnIndex) => value === "" ? "" : `Metadata_${rowIndex + 1}_${columnIndex + 1}`));
    else output.push(row.map((value, columnIndex) => sanitizeValue(value, String(rows[headerRow]?.[columnIndex] ?? `Column_${columnIndex + 1}`), rowIndex, prohibited)));
  }
  return XLSX.utils.aoa_to_sheet(output, { cellDates: true });
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function verifySafeWorkbook(file, prohibited) {
  const workbook = XLSX.readFile(file, { raw: true });
  const emitted = [];
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "", blankrows: true });
    for (const row of rows) for (const value of row) if (typeof value === "string") emitted.push(value);
  }
  if (emitted.some((value) => prohibited.has(value))) throw new Error(`Sanitization verification failed: prohibited value survived in ${path.basename(file)}`);
  const text = emitted.join("\n");
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text)) throw new Error(`Sanitization verification failed: email pattern in ${path.basename(file)}`);
  if (/(?:\+?84|0)\d{8,10}/.test(text)) throw new Error(`Sanitization verification failed: phone pattern in ${path.basename(file)}`);
  const props = workbook.Props ?? {};
  if ((props.Author && props.Author !== "LightBI") || props.Company) throw new Error(`Sanitization verification failed: document metadata in ${path.basename(file)}`);
}

function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const results = [];
  for (const [sourcePath, outputName] of FIXTURES) {
    const source = path.join(ROOT, sourcePath);
    if (!fs.existsSync(source)) throw new Error(`Required local historical fixture missing: ${sourcePath}`);
    const original = XLSX.readFile(source, { raw: true, cellDates: true, cellFormula: false });
    const safe = XLSX.utils.book_new();
    const prohibited = new Set();
    for (const sheetName of original.SheetNames) {
      const sheet = original.Sheets[sheetName];
      if (!sheet || original.Workbook?.Sheets?.find((item) => item.name === sheetName)?.Hidden) continue;
      XLSX.utils.book_append_sheet(safe, sanitizeSheet(sheet, prohibited), sheetName.slice(0, 31));
    }
    safe.Props = { Title: "LightBI repository-safe acceptance fixture", Subject: "Synthetic or privacy-sanitized acceptance evidence", Author: "LightBI", Company: "" };
    const destination = path.join(OUTPUT, outputName);
    XLSX.writeFile(safe, destination, { bookType: "xlsx", compression: true });
    verifySafeWorkbook(destination, prohibited);
    results.push({ path: path.relative(ROOT, destination), sha256: sha256(destination), sheets: safe.SheetNames.length });
  }
  process.stdout.write(`${JSON.stringify({ schemaVersion: "lightbi.phase-7r41-sanitizer-result.v1", seedSha256: hash("seed"), fixtures: results }, null, 2)}\n`);
}

main();
