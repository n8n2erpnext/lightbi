import React, { useMemo } from 'react';
import { Package, Truck, Building2, Calendar, Weight, BarChart3, AlertCircle } from 'lucide-react';

interface LogisticsDatasetSummaryProps {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
}

export const LogisticsDatasetSummary: React.FC<LogisticsDatasetSummaryProps> = ({ columns, rows, rowCount }) => {
  const summary = useMemo(() => {
    // Helpers for string normalization
    const normalize = (s: string) => s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D")
      .replace(/[^a-z0-9\s]/g, "");

    const findColumn = (keywords: string[]) => {
      for (const col of columns) {
        const normCol = normalize(col);
        if (keywords.some(k => normCol.includes(normalize(k)))) {
          return col;
        }
      }
      return null;
    };

    // 1. Route / Tuyến
    const routeCol = findColumn(["route", "tuyen", "tuyến"]);
    // 2. Shipment / Package / Mã tải / Kiện
    const shipmentCol = findColumn(["shipment", "package", "ma tai", "kien", "mã tải", "kiện"]);
    // 3. Weight / Trọng lượng
    const weightCol = findColumn(["weight", "trong luong", "trọng lượng", "khoi luong"]);
    // 4. Branch / Bưu cục / Đơn vị
    const branchCol = findColumn(["branch", "buu cuc", "bưu cục", "don vi", "đơn vị", "kho"]);
    // 5. Date / Thời gian
    const dateCol = findColumn(["date", "time", "ngay", "ngày", "thoi gian", "thời gian"]);

    const stats = {
      routeCount: 0,
      topRoutes: [] as { name: string, count: number }[],
      shipmentCount: 0,
      totalWeight: 0,
      topBranches: [] as { name: string, count: number }[],
      dateRange: null as { min: string, max: string } | null,
      missingFields: [] as string[]
    };

    // Route Stats
    if (routeCol) {
      const routes = rows.map(r => String(r[routeCol] || '')).filter(Boolean);
      const uniqueRoutes = new Set(routes);
      stats.routeCount = uniqueRoutes.size;
      
      const counts: Record<string, number> = {};
      routes.forEach(r => counts[r] = (counts[r] || 0) + 1);
      stats.topRoutes = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
    } else {
      stats.missingFields.push("Route/Tuyến");
    }

    // Shipment Stats
    if (shipmentCol) {
      const shipments = rows.map(r => String(r[shipmentCol] || '')).filter(Boolean);
      stats.shipmentCount = new Set(shipments).size;
    } else {
      stats.missingFields.push("Shipment/Kiện");
    }

    // Weight Stats
    if (weightCol) {
      let sum = 0;
      rows.forEach(r => {
        const val = parseFloat(String(r[weightCol] || '').replace(/,/g, ''));
        if (!isNaN(val)) sum += val;
      });
      stats.totalWeight = sum;
    } else {
      stats.missingFields.push("Weight/Trọng lượng");
    }

    // Branch Stats
    if (branchCol) {
      const branches = rows.map(r => String(r[branchCol] || '')).filter(Boolean);
      const counts: Record<string, number> = {};
      branches.forEach(b => counts[b] = (counts[b] || 0) + 1);
      stats.topBranches = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
    } else {
      stats.missingFields.push("Branch/Bưu cục");
    }

    // Date Stats
    if (dateCol) {
      const dates = rows.map(r => {
        const val = r[dateCol];
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      }).filter(Boolean) as Date[];
      
      if (dates.length > 0) {
        const min = new Date(Math.min(...dates.map(d => d.getTime())));
        const max = new Date(Math.max(...dates.map(d => d.getTime())));
        stats.dateRange = {
          min: min.toLocaleDateString(),
          max: max.toLocaleDateString()
        };
      }
    } else {
      stats.missingFields.push("Date/Thời gian");
    }

    return stats;
  }, [columns, rows]);

  return (
    <div className="bg-white border border-blue-100 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 leading-tight">Logistics Dataset Summary</h3>
          <p className="text-xs text-gray-500">Quick insights extracted from raw sample rows</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><Database className="w-3 h-3"/> Rows / Cols</div>
          <div className="font-semibold text-gray-900">{rowCount.toLocaleString()} <span className="text-gray-400 font-normal text-xs">× {columns.length}</span></div>
        </div>
        
        <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><Package className="w-3 h-3"/> Shipments</div>
          <div className="font-semibold text-gray-900">
            {summary.shipmentCount > 0 ? summary.shipmentCount.toLocaleString() : <span className="text-gray-400 font-normal italic text-xs">Not detected</span>}
          </div>
        </div>

        <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><Truck className="w-3 h-3"/> Unique Routes</div>
          <div className="font-semibold text-gray-900">
            {summary.routeCount > 0 ? summary.routeCount.toLocaleString() : <span className="text-gray-400 font-normal italic text-xs">Not detected</span>}
          </div>
        </div>

        <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><Weight className="w-3 h-3"/> Total Weight</div>
          <div className="font-semibold text-gray-900">
            {summary.totalWeight > 0 ? summary.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 2 }) : <span className="text-gray-400 font-normal italic text-xs">Not detected</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {summary.topRoutes.length > 0 && (
          <div className="border border-gray-100 rounded-md p-3">
            <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-blue-500"/> Top Routes</div>
            <div className="space-y-1.5">
              {summary.topRoutes.map((r, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 truncate mr-2">{r.name || '(Empty)'}</span>
                  <span className="font-medium text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.topBranches.length > 0 && (
          <div className="border border-gray-100 rounded-md p-3">
            <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-indigo-500"/> Top Branches / Hubs</div>
            <div className="space-y-1.5">
              {summary.topBranches.map((b, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 truncate mr-2">{b.name || '(Empty)'}</span>
                  <span className="font-medium text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.dateRange && (
          <div className="border border-gray-100 rounded-md p-3 md:col-span-2 flex items-center justify-between">
            <div className="text-xs font-medium text-gray-700 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-500"/> Detected Time Range</div>
            <div className="text-xs font-semibold text-gray-900">
              {summary.dateRange.min} — {summary.dateRange.max}
            </div>
          </div>
        )}
      </div>

      {summary.missingFields.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-md p-2 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 leading-tight">
            <strong>Missing dimensions:</strong> Could not auto-detect standard columns for {summary.missingFields.join(', ')}. Try mapping fields manually if needed.
          </p>
        </div>
      )}
    </div>
  );
};

// Internal icon dependency for rows
const Database = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
);
