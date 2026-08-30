import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export type NativeExcelPivotAggregation = 'sum' | 'count';

export type NativeExcelPivotSpec = {
  dataSheetName: string;
  pivotSheetName: string;
  dataColumns: string[];
  dataRows: Record<string, unknown>[];
  rowFields: string[];
  columnFields?: string[];
  pageFields?: string[];
  valueField: string;
  aggregation: NativeExcelPivotAggregation;
  pivotTitle: string;
  tableName?: string;
  startRow?: number;
};

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function xmlEscape(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function excelColumn(index: number): string {
  let value = index + 1;
  let output = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    output = String.fromCharCode(65 + remainder) + output;
    value = Math.floor((value - 1) / 26);
  }
  return output;
}

function cellRef(columnCount: number, rowCount: number): string {
  if (columnCount < 1 || rowCount < 1) throw new Error('EXCEL_PIVOT_SOURCE_RANGE_REQUIRED');
  return `A1:${excelColumn(columnCount - 1)}${rowCount}`;
}

function readXml(files: Record<string, Uint8Array>, path: string): string {
  const value = files[path];
  if (!value) throw new Error(`EXCEL_PIVOT_OOXML_PART_MISSING:${path}`);
  return strFromU8(value);
}

function writeXml(files: Record<string, Uint8Array>, path: string, xml: string): void {
  files[path] = strToU8(xml);
}

function nextRelationshipId(xml: string): string {
  const ids = [...xml.matchAll(/Id="rId(\d+)"/g)].map(match => Number(match[1]));
  return `rId${(ids.length ? Math.max(...ids) : 0) + 1}`;
}

function appendRelationship(xml: string, relationship: string): string {
  if (!xml.includes('</Relationships>')) throw new Error('EXCEL_PIVOT_RELATIONSHIPS_INVALID');
  return xml.replace('</Relationships>', `${relationship}</Relationships>`);
}

function worksheetRelationships(files: Record<string, Uint8Array>, sheetNumber: number): { path: string; xml: string } {
  const path = `xl/worksheets/_rels/sheet${sheetNumber}.xml.rels`;
  const existing = files[path];
  return {
    path,
    xml: existing ? strFromU8(existing) : `${XML_HEADER}<Relationships xmlns="${REL_NS}"></Relationships>`,
  };
}

function uniqueValueKey(value: unknown): string {
  if (typeof value === 'string') return `s:${value.toLocaleLowerCase()}`;
  if (typeof value === 'number') return `n:${Object.is(value, -0) ? 0 : value}`;
  if (typeof value === 'boolean') return `b:${value ? 1 : 0}`;
  return `o:${String(value)}`;
}

function excelScalar(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return value.toISOString();
  try { return JSON.stringify(value); } catch { return String(value); }
}

type CacheField = {
  name: string;
  sharedItems: Array<string | number | boolean>;
  indexByKey: Map<string, number>;
};

function createCacheFields(spec: NativeExcelPivotSpec): CacheField[] {
  return spec.dataColumns.map(name => {
    const sharedItems: Array<string | number | boolean> = [];
    const indexByKey = new Map<string, number>();
    for (const row of spec.dataRows) {
      const scalar = excelScalar(row[name]);
      if (scalar == null) continue;
      const key = uniqueValueKey(scalar);
      if (indexByKey.has(key)) continue;
      indexByKey.set(key, sharedItems.length);
      sharedItems.push(scalar);
    }
    return { name, sharedItems, indexByKey };
  });
}

function renderSharedItem(value: string | number | boolean): string {
  if (typeof value === 'number') return `<n v="${value}"/>`;
  if (typeof value === 'boolean') return `<b v="${value ? 1 : 0}"/>`;
  return `<s v="${xmlEscape(value)}"/>`;
}

function renderCacheField(field: CacheField): string {
  const items = field.sharedItems.map(renderSharedItem).join('');
  return `<cacheField name="${xmlEscape(field.name)}" numFmtId="0"><sharedItems count="${field.sharedItems.length}">${items}</sharedItems></cacheField>`;
}

function renderCacheRecords(spec: NativeExcelPivotSpec, fields: CacheField[]): string {
  const body = spec.dataRows.map(row => {
    const cells = fields.map(field => {
      const scalar = excelScalar(row[field.name]);
      if (scalar == null) return '<m/>';
      const index = field.indexByKey.get(uniqueValueKey(scalar));
      if (index == null) throw new Error(`EXCEL_PIVOT_CACHE_VALUE_MISSING:${field.name}`);
      return `<x v="${index}"/>`;
    }).join('');
    return `<r>${cells}</r>`;
  }).join('');
  return `${XML_HEADER}<pivotCacheRecords xmlns="${MAIN_NS}" xmlns:r="${OFFICE_REL}" count="${spec.dataRows.length}">${body}</pivotCacheRecords>`;
}

function renderCacheDefinition(spec: NativeExcelPivotSpec, fields: CacheField[], sourceRef: string): string {
  return `${XML_HEADER}<pivotCacheDefinition xmlns="${MAIN_NS}" xmlns:r="${OFFICE_REL}" r:id="rId1" refreshOnLoad="1" createdVersion="8" refreshedVersion="8" minRefreshableVersion="3" recordCount="${spec.dataRows.length}"><cacheSource type="worksheet"><worksheetSource ref="${sourceRef}" sheet="${xmlEscape(spec.dataSheetName)}"/></cacheSource><cacheFields count="${fields.length}">${fields.map(renderCacheField).join('')}</cacheFields></pivotCacheDefinition>`;
}

function renderPivotField(fieldIndex: number, fields: CacheField[], rowIndexes: number[], columnIndexes: number[], pageIndexes: number[], valueIndex: number): string {
  const field = fields[fieldIndex];
  const base = 'compact="0" outline="0" showAll="0" defaultSubtotal="0"';
  const axis = rowIndexes.includes(fieldIndex) ? 'axisRow' : columnIndexes.includes(fieldIndex) ? 'axisCol' : pageIndexes.includes(fieldIndex) ? 'axisPage' : null;
  if (axis === 'axisRow' || axis === 'axisCol') {
    const items = field.sharedItems.map((_, index) => `<item x="${index}"/>`).join('');
    return `<pivotField axis="${axis}" ${base}><items count="${field.sharedItems.length + 1}">${items}</items></pivotField>`;
  }
  if (axis === 'axisPage') {
    const items = field.sharedItems.map((_, index) => `<item x="${index}"/>`).join('');
    return `<pivotField axis="axisPage" ${base}><items count="${field.sharedItems.length}">${items}</items></pivotField>`;
  }
  return `<pivotField${fieldIndex === valueIndex ? ' dataField="1"' : ''} ${base}/>`;
}

function stableUid(seed: string): string {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0').toUpperCase();
  return `{${hex}-4C42-4947-4854-${hex}${hex.slice(0, 4)}}`;
}

function renderPivotTable(spec: NativeExcelPivotSpec, fields: CacheField[]): string {
  const indexByName = new Map(fields.map((field, index) => [field.name, index]));
  const rows = spec.rowFields.map(name => indexByName.get(name)).filter((value): value is number => value != null);
  const columns = (spec.columnFields ?? []).map(name => indexByName.get(name)).filter((value): value is number => value != null);
  const pages = (spec.pageFields ?? []).map(name => indexByName.get(name)).filter((value): value is number => value != null);
  const valueIndex = indexByName.get(spec.valueField);
  if (!rows.length) throw new Error('EXCEL_PIVOT_ROW_FIELD_REQUIRED');
  if (valueIndex == null) throw new Error('EXCEL_PIVOT_VALUE_FIELD_REQUIRED');
  const firstDataRow = pages.length ? 3 : 2;
  const startRow = Math.max(3, spec.startRow ?? 4);
  const location = `A${startRow}:E${startRow + 12}`;
  const pivotFields = fields.map((_, index) => renderPivotField(index, fields, rows, columns, pages, valueIndex)).join('');
  const pageFields = pages.length ? `<pageFields count="${pages.length}">${pages.map(index => `<pageField fld="${index}" hier="-1"/>`).join('')}</pageFields>` : '';
  const subtotal = spec.aggregation === 'count' ? ' subtotal="count"' : '';
  const caption = `${spec.aggregation === 'count' ? 'Count' : 'Sum'} of ${spec.valueField}`;
  return `${XML_HEADER}<pivotTableDefinition xmlns="${MAIN_NS}" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="xr" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" xr:uid="${stableUid(JSON.stringify(spec))}" name="LightBI_Pivot" cacheId="10" applyNumberFormats="0" applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0" applyWidthHeightFormats="1" dataCaption="Values" updatedVersion="8" minRefreshableVersion="3" useAutoFormatting="1" itemPrintTitles="1" createdVersion="8" indent="0" compact="0" compactData="0" multipleFieldFilters="0"><location ref="${location}" firstHeaderRow="1" firstDataRow="${firstDataRow}" firstDataCol="1"/><pivotFields count="${fields.length}">${pivotFields}</pivotFields><rowFields count="${rows.length}">${rows.map(index => `<field x="${index}"/>`).join('')}</rowFields><rowItems count="1"><i t="grand"><x/></i></rowItems><colFields count="${columns.length}">${columns.map(index => `<field x="${index}"/>`).join('')}</colFields><colItems count="1"><i t="grand"><x/></i></colItems>${pageFields}<dataFields count="1"><dataField name="${xmlEscape(caption)}" fld="${valueIndex}" baseField="0" baseItem="0"${subtotal}/></dataFields><pivotTableStyleInfo name="PivotStyleLight16" showRowHeaders="1" showColHeaders="1" showRowStripes="0" showColStripes="0" showLastColumn="1"/></pivotTableDefinition>`;
}

function renderTable(spec: NativeExcelPivotSpec, sourceRef: string): string {
  const name = spec.tableName ?? 'LightBI_Data';
  return `${XML_HEADER}<table xmlns="${MAIN_NS}" id="1" name="${xmlEscape(name)}" displayName="${xmlEscape(name)}" ref="${sourceRef}" totalsRowShown="0" headerRowCount="1"><autoFilter ref="${sourceRef}"/><tableColumns count="${spec.dataColumns.length}">${spec.dataColumns.map((column, index) => `<tableColumn id="${index + 1}" name="${xmlEscape(column)}"/>`).join('')}</tableColumns><tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>`;
}

function addContentType(xml: string, partName: string, contentType: string): string {
  if (xml.includes(`PartName="${partName}"`)) return xml;
  return xml.replace('</Types>', `<Override PartName="${partName}" ContentType="${contentType}"/></Types>`);
}

function freezeHeader(xml: string): string {
  const simple = '<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
  if (!xml.includes(simple)) return xml;
  return xml.replace(simple, '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/></sheetView></sheetViews>');
}

export function injectNativeExcelPivot(baseWorkbook: ArrayBuffer, spec: NativeExcelPivotSpec): ArrayBuffer {
  if (!spec.dataRows.length) throw new Error('EXCEL_PIVOT_DATA_REQUIRED');
  if (!spec.dataColumns.length) throw new Error('EXCEL_PIVOT_COLUMNS_REQUIRED');
  const files = unzipSync(new Uint8Array(baseWorkbook));
  const sourceRef = cellRef(spec.dataColumns.length, spec.dataRows.length + 1);
  const fields = createCacheFields(spec);

  let contentTypes = readXml(files, '[Content_Types].xml');
  contentTypes = addContentType(contentTypes, '/xl/tables/table1.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml');
  contentTypes = addContentType(contentTypes, '/xl/pivotTables/pivotTable1.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.pivotTable+xml');
  contentTypes = addContentType(contentTypes, '/xl/pivotCache/pivotCacheDefinition1.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml');
  contentTypes = addContentType(contentTypes, '/xl/pivotCache/pivotCacheRecords1.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheRecords+xml');
  writeXml(files, '[Content_Types].xml', contentTypes);

  let workbookRels = readXml(files, 'xl/_rels/workbook.xml.rels');
  const cacheRelId = nextRelationshipId(workbookRels);
  workbookRels = appendRelationship(workbookRels, `<Relationship Id="${cacheRelId}" Type="${OFFICE_REL}/pivotCacheDefinition" Target="pivotCache/pivotCacheDefinition1.xml"/>`);
  writeXml(files, 'xl/_rels/workbook.xml.rels', workbookRels);

  let workbookXml = readXml(files, 'xl/workbook.xml');
  if (!workbookXml.includes(`name="${spec.dataSheetName}"`) || !workbookXml.includes(`name="${spec.pivotSheetName}"`)) throw new Error('EXCEL_PIVOT_SHEET_IDENTITY_MISMATCH');
  workbookXml = workbookXml.replace('</workbook>', `<pivotCaches><pivotCache cacheId="10" r:id="${cacheRelId}"/></pivotCaches></workbook>`);
  writeXml(files, 'xl/workbook.xml', workbookXml);

  let dataSheetXml = freezeHeader(readXml(files, 'xl/worksheets/sheet1.xml'));
  dataSheetXml = dataSheetXml.replace('</worksheet>', '<tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>');
  writeXml(files, 'xl/worksheets/sheet1.xml', dataSheetXml);
  const dataRels = worksheetRelationships(files, 1);
  writeXml(files, dataRels.path, appendRelationship(dataRels.xml, `<Relationship Id="rId1" Type="${OFFICE_REL}/table" Target="../tables/table1.xml"/>`));

  let pivotSheetXml = readXml(files, 'xl/worksheets/sheet2.xml');
  pivotSheetXml = pivotSheetXml.replace('</worksheet>', '<pivotTableParts count="1"><pivotTablePart r:id="rId1"/></pivotTableParts></worksheet>');
  writeXml(files, 'xl/worksheets/sheet2.xml', pivotSheetXml);
  const pivotRels = worksheetRelationships(files, 2);
  writeXml(files, pivotRels.path, appendRelationship(pivotRels.xml, `<Relationship Id="rId1" Type="${OFFICE_REL}/pivotTable" Target="../pivotTables/pivotTable1.xml"/>`));

  writeXml(files, 'xl/tables/table1.xml', renderTable(spec, sourceRef));
  writeXml(files, 'xl/pivotTables/pivotTable1.xml', renderPivotTable(spec, fields));
  writeXml(files, 'xl/pivotTables/_rels/pivotTable1.xml.rels', `${XML_HEADER}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL}/pivotCacheDefinition" Target="../pivotCache/pivotCacheDefinition1.xml"/></Relationships>`);
  writeXml(files, 'xl/pivotCache/pivotCacheDefinition1.xml', renderCacheDefinition(spec, fields, sourceRef));
  writeXml(files, 'xl/pivotCache/_rels/pivotCacheDefinition1.xml.rels', `${XML_HEADER}<Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="${OFFICE_REL}/pivotCacheRecords" Target="pivotCacheRecords1.xml"/></Relationships>`);
  writeXml(files, 'xl/pivotCache/pivotCacheRecords1.xml', renderCacheRecords(spec, fields));

  const zipped = zipSync(files, { level: 6 });
  return zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
}
