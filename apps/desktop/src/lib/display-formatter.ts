import type { DisplayPreferences } from '../stores/display-preferences-store';

export type SemanticType = 'currency' | 'number' | 'date' | 'time' | 'datetime' | 'string' | 'unknown';

export function inferSemanticType(columnName: string, value: any): SemanticType {
  if (value === null || value === undefined) return 'unknown';
  
  if (typeof value === 'number') {
    const lower = columnName.toLowerCase();
    if (lower.includes('revenue') || lower.includes('cost') || lower.includes('price') || lower.includes('doanh thu') || lower.includes('tiền') || lower.includes('budget') || lower.includes('sales')) {
      return 'currency';
    }
    return 'number';
  }
  
  if (typeof value === 'string') {
    // Quick heuristic for date strings returned by DuckDB: YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      if (value.includes('T') || value.includes(' ')) return 'datetime';
      return 'date';
    }
    // Simple time check (e.g., 14:30:00)
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
      return 'time';
    }
  }
  
  return 'string';
}

function resolveLocaleForSeparators(locale: string, sepPref: DisplayPreferences['thousandsSeparator']): string {
  if (sepPref === 'locale') return locale;
  if (sepPref === 'comma') return 'en-US';
  if (sepPref === 'dot') return 'de-DE';
  if (sepPref === 'space') return 'fr-FR';
  return locale;
}

export interface FormatOptions {
  compact?: boolean;
}

export function formatValue(value: any, semanticType: SemanticType, prefs: DisplayPreferences, extraOptions?: FormatOptions): string {
  if (value === null || value === undefined || value === '') {
    return '-'; // Clear zero/null rule for MVP
  }

  // Handle Strings
  if (semanticType === 'string' || semanticType === 'unknown') {
    return String(value);
  }

  // Handle Numbers and Currency
  if (semanticType === 'number' || semanticType === 'currency') {
    let num = Number(value);
    if (isNaN(num)) return String(value);

    // Rule: Null/Empty handled above. Zero can be '0' or '0.00' based on decimal places.
    const isNegative = num < 0;
    const absNum = Math.abs(num);

    const actualLocale = resolveLocaleForSeparators(prefs.locale, prefs.thousandsSeparator);
    
    let options: Intl.NumberFormatOptions = {
      style: semanticType === 'currency' && prefs.currencyDisplay !== 'none' ? 'currency' : 'decimal',
    };

    if (extraOptions?.compact) {
      options.notation = 'compact';
      options.compactDisplay = 'short';
    }

    if (semanticType === 'currency' && prefs.currencyDisplay !== 'none') {
      // For MVP, default to USD if en-US, VND if vi-VN, SAR if ar-SA. 
      // In a real app, currency code might come from metadata.
      options.currency = prefs.locale === 'vi-VN' ? 'VND' : prefs.locale === 'ar-SA' ? 'SAR' : 'USD';
      options.currencyDisplay = prefs.currencyDisplay;
    }

    if (prefs.decimalPlaces !== 'auto') {
      options.minimumFractionDigits = prefs.decimalPlaces as number;
      options.maximumFractionDigits = prefs.decimalPlaces as number;
    }

    let formatted = new Intl.NumberFormat(actualLocale, options).format(absNum);

    // Negative styles
    if (isNegative) {
      if (prefs.negativeStyle === 'parentheses' || prefs.numberStyle === 'accounting') {
        formatted = `(${formatted})`;
      } else {
        formatted = `-${formatted}`;
      }
    }

    return formatted;
  }

  // Handle Dates and Times
  if (['date', 'time', 'datetime'].includes(semanticType)) {
    let d: Date;
    let isTimeOnly = false;

    if (semanticType === 'time') {
      isTimeOnly = true;
      // Prepend a dummy date and force UTC so time parsing doesn't shift
      d = new Date(`1970-01-01T${value}Z`);
    } else {
      d = new Date(value);
    }

    if (isNaN(d.getTime())) return String(value); // Unparseable date

    let options: Intl.DateTimeFormatOptions = {};
    
    // Timezone - For time-only, we enforce UTC to match our parse trick
    if (isTimeOnly) {
      options.timeZone = 'UTC';
    } else if (prefs.timezone !== 'auto') {
      options.timeZone = prefs.timezone;
    }

    // Formatting rules
    if (semanticType === 'date') {
      if (prefs.dateFormat === 'short') options.dateStyle = 'short';
      else if (prefs.dateFormat === 'long') options.dateStyle = 'long';
      else if (prefs.dateFormat === 'iso') {
        return d.toISOString().split('T')[0]; // Simple ISO short circuit
      } else {
         // locale default
         options.year = 'numeric';
         options.month = 'numeric';
         options.day = 'numeric';
      }
    } else if (semanticType === 'datetime') {
      if (prefs.datetimeFormat === 'compact') {
        options.dateStyle = 'short';
        options.timeStyle = 'short';
      } else if (prefs.datetimeFormat === 'detailed') {
        options.dateStyle = 'long';
        options.timeStyle = 'long';
      } else {
         // locale default
         options.year = 'numeric';
         options.month = 'numeric';
         options.day = 'numeric';
         options.hour = 'numeric';
         options.minute = 'numeric';
      }
      
      if (prefs.timeFormat === '12h') options.hour12 = true;
      else if (prefs.timeFormat === '24h') options.hour12 = false;
    }

    if (semanticType === 'time') {
      if (prefs.timeFormat === '12h') options.hour12 = true;
      else if (prefs.timeFormat === '24h') options.hour12 = false;
      
      options.hour = 'numeric';
      options.minute = 'numeric';
      options.second = 'numeric';
    }

    return new Intl.DateTimeFormat(prefs.locale, options).format(d);
  }

  return String(value);
}
