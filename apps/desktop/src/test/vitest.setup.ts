import * as fs from 'node:fs';
import * as XLSX from 'xlsx';

// SheetJS 0.20+ no longer injects Node's filesystem into the ESM build.
// Production browser flows use File/ArrayBuffer APIs; corpus tests explicitly
// use readFile and therefore bind the Node adapter here.
XLSX.set_fs(fs);
