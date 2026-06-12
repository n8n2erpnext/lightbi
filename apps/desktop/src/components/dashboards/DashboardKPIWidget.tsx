import React from 'react';
import { useDisplayPreferences } from '../../stores/display-preferences-store';
import { formatValue } from '../../lib/display-formatter';

export interface DashboardKPIWidgetProps {
  title: string;
  value: number | null | undefined;
  valueType?: 'number' | 'currency';
  trend?: {
    value: number | null | undefined;
    label: string;
    isPositive?: boolean;
  };
  className?: string;
  // We use logical colSpan for the compact logic calculation, assuming 20 cols total
  colSpan: number; 
}

export const DashboardKPIWidget: React.FC<DashboardKPIWidgetProps> = ({ 
  title, 
  value, 
  valueType = 'number', 
  trend,
  className = '',
  colSpan
}) => {
  const { preferences } = useDisplayPreferences();
  
  // Compact rule: if colSpan is 5 or less (out of 20 columns), it's considered compact.
  const isCompact = colSpan <= 5;

  return (
    <div className={`${className} bg-white border border-gray-200 rounded-md p-3.5 shadow-sm flex flex-col justify-center`}>
      <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
      <div className="text-xl font-semibold text-gray-900 mt-1">
        {formatValue(value, valueType, preferences, { compact: isCompact })}
      </div>
      {trend && (
        <div className={`text-[11px] font-medium mt-1 flex items-center ${trend.isPositive !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend.isPositive !== false ? '+' : ''}{formatValue(trend.value, 'number', preferences, { compact: false })}% {trend.label}
        </div>
      )}
    </div>
  );
};
