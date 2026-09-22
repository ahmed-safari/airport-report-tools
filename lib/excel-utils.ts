import * as XLSX from "xlsx";
import { ColumnMapping, CompareColumnMapping, CleanupRule } from "./types";
import { COLUMN_PATTERNS, NAME_PART_PATTERNS } from "./constants";

// ============================================================================
// EXCEL READING & PARSING
// ============================================================================

export interface ReadExcelResult {
  data: any[];
  columns: string[];
}

const HEADER_PATTERNS = [
  ...NAME_PART_PATTERNS.map((entry) => entry.pattern),
  ...Object.values(COLUMN_PATTERNS),
];

/**
 * Some workbooks put a legend or title block above the real table.
 * Pick the row that looks most like column headers.
 */
export const findHeaderRowIndex = (rows: any[][]): number => {
  let bestIndex = 0;
  let bestScore = 0;
  const limit = Math.min(rows.length, 30);

  for (let index = 0; index < limit; index++) {
    const cells = (rows[index] || [])
      .map((cell) => String(cell ?? "").trim())
      .filter(Boolean);
    if (cells.length < 3) continue;

    let score = 0;
    cells.forEach((cell) => {
      if (HEADER_PATTERNS.some((pattern) => pattern.test(cell))) score += 2;
    });

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
};

export const sheetToRecords = (
  worksheet: XLSX.WorkSheet
): ReadExcelResult => {
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as any[][];

  if (!rows.length) return { data: [], columns: [] };

  const headerIndex = findHeaderRowIndex(rows);
  const headerRow = rows[headerIndex] || [];
  let lastColumn = headerRow.length - 1;
  while (lastColumn >= 0 && String(headerRow[lastColumn] ?? "").trim() === "") {
    lastColumn -= 1;
  }

  const columns: string[] = [];
  const seen = new Map<string, number>();
  for (let index = 0; index <= lastColumn; index++) {
    const label = String(headerRow[index] ?? "").trim() || `Column ${index + 1}`;
    const count = seen.get(label) || 0;
    seen.set(label, count + 1);
    columns.push(count === 0 ? label : `${label} ${count + 1}`);
  }

  const data = rows
    .slice(headerIndex + 1)
    .map((row) => {
      const record: Record<string, any> = {};
      columns.forEach((column, index) => {
        record[column] = row?.[index] ?? "";
      });
      return record;
    })
    .filter((record) =>
      columns.some((column) => String(record[column] ?? "").trim() !== "")
    );

  return { data, columns };
};

export const readExcelBuffer = async (
  buffer: ArrayBuffer
): Promise<ReadExcelResult> => {
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return sheetToRecords(worksheet);
};

/**
 * Normalize a sheet date to YYYY-MM-DD.
 * Accepts Excel serials, ISO dates, and day/month/year text such as 15/09/2026.
 */
export const toISODateString = (value: any): string => {
  if (value === undefined || value === null || value === "") return "";

  if (value instanceof Date && !isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "number" && value > 20000 && value < 80000) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  }

  const parts = text.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (parts) {
    let day = Number(parts[1]);
    let month = Number(parts[2]);
    let year = Number(parts[3]);
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) {
      const swap = day;
      day = month;
      month = swap;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return "";
  }

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
};

// ============================================================================
// AUTO-DETECTION OF COLUMNS
// ============================================================================

export const autoDetectColumns = (cols: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {};
  const claimed = new Set<string>();

  cols.forEach((col) => {
    const header = col.trim();
    for (const { key, pattern } of NAME_PART_PATTERNS) {
      if (pattern.test(header) && !mapping[key]) {
        mapping[key] = col;
        claimed.add(col);
        break;
      }
    }
  });

  cols.forEach((col) => {
    if (claimed.has(col)) return;
    Object.entries(COLUMN_PATTERNS).forEach(([key, pattern]) => {
      if (pattern.test(col) && !mapping[key as keyof ColumnMapping]) {
        mapping[key as keyof ColumnMapping] = col;
      }
    });
  });

  return mapping;
};

/**
 * Resolve a person's name from a full-name column, or from Title / First / Last.
 * Mapped parts are joined in that order. Empty parts are skipped, so two-part
 * names (Title + Last, or First + Last) work the same way as three-part names.
 * A non-empty full-name column takes priority.
 * Optional transform runs on each source cell before joining (for cleanup rules).
 */
export const resolvePersonName = (
  row: any,
  mapping: ColumnMapping,
  transform?: (value: string, column: string) => string
): string => {
  const read = (column?: string): string => {
    if (!column || !row) return "";
    const value = row[column];
    if (value === undefined || value === null) return "";
    const text = transform ? transform(String(value), column) : String(value);
    return text.trim();
  };

  const full = read(mapping.fullName);
  if (full) return full;

  return [read(mapping.nameTitle), read(mapping.firstName), read(mapping.lastName)]
    .filter(Boolean)
    .join(" ");
};

// ============================================================================
// EXCEL VALUE FORMATTING
// ============================================================================

/**
 * Format Excel date (number) to readable date string
 */
export const formatExcelDate = (value: any): string => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number") {
    // Excel stores dates as days since 1900-01-01
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return String(value);
};

/**
 * Format Excel time (fraction of day) to readable time string
 */
export const formatExcelTime = (value: any): string => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number" && value >= 0 && value < 1) {
    // Excel stores time as fraction of a day
    const totalMinutes = value * 24 * 60;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }
  if (typeof value === "number" && value >= 1) {
    // Might be a datetime, extract just time portion
    const timePart = value % 1;
    if (timePart > 0) {
      const totalMinutes = timePart * 24 * 60;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}`;
    }
  }
  return String(value);
};

/**
 * Detect if a value is likely an Excel date number (days since 1900)
 * Excel dates are typically > 25000 (dates after 1968)
 */
export const isExcelDateNumber = (value: any): boolean => {
  return typeof value === "number" && value > 25000;
};

/**
 * Detect if a value is likely an Excel time number (fraction of day)
 */
export const isExcelTimeNumber = (value: any): boolean => {
  return typeof value === "number" && value >= 0 && value < 1;
};

/**
 * Format Excel value intelligently based on its type
 */
export const formatExcelValue = (value: any, fieldName?: string): string => {
  if (value === undefined || value === null || value === "") return "";

  // Check if it's a date field based on name
  const dateFields = ["arrivalDate", "departDate", "date"];
  const timeFields = ["arrivalTime", "departTime", "time"];

  if (fieldName) {
    if (
      dateFields.some((f) => fieldName.toLowerCase().includes(f.toLowerCase()))
    ) {
      return formatExcelDate(value);
    }
    if (
      timeFields.some((f) => fieldName.toLowerCase().includes(f.toLowerCase()))
    ) {
      return formatExcelTime(value);
    }
  }

  // Auto-detect based on value
  if (isExcelDateNumber(value)) {
    return formatExcelDate(value);
  }
  if (isExcelTimeNumber(value)) {
    return formatExcelTime(value);
  }

  return String(value);
};

// ============================================================================
// HELPER FUNCTIONS FOR COMPARISON
// ============================================================================

/**
 * Normalize a value for comparison (lowercase, remove extra spaces, etc.)
 */
export const normalizeForComparison = (s: any): string => {
  if (s === undefined || s === null) return "";
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\-_,\.\/\\]/g, "")
    .trim();
};

/**
 * Get value from a row using a mapping
 */
export const getMappedValue = (
  row: any,
  field: string,
  mapping: CompareColumnMapping
): any => {
  if (field === "fullName") {
    return resolvePersonName(row, mapping);
  }
  const col = mapping[field as keyof CompareColumnMapping];
  if (col && row) return row[col] ?? "";
  return "";
};

// ============================================================================
// CLEANUP RULES APPLICATION
// ============================================================================

export const applyCleanupRules = (
  value: string,
  field: keyof ColumnMapping | string,
  cleanupRules: CleanupRule[]
): string => {
  if (!value || typeof value !== "string") return value;

  let cleaned = value;

  cleanupRules
    .filter((rule) => rule.enabled)
    .forEach((rule) => {
      // Check if rule applies to this field
      if (rule.applyTo !== "all" && rule.applyTo !== field) {
        return;
      }

      switch (rule.type) {
        case "replace":
          // Escape special regex characters in the find string
          const escapedFind = rule.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(escapedFind, "gi");
          cleaned = cleaned.replace(regex, rule.replace);
          break;

        case "prefix":
          if (!cleaned.startsWith(rule.find)) {
            cleaned = rule.find + cleaned;
          }
          break;

        case "suffix":
          if (!cleaned.endsWith(rule.find)) {
            cleaned = cleaned + rule.find;
          }
          break;

        case "trim":
          cleaned = cleaned.trim();
          break;

        case "capitalize":
          cleaned = cleaned
            .toLowerCase()
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          break;

        case "uppercase":
          cleaned = cleaned.toUpperCase();
          break;

        case "lowercase":
          cleaned = cleaned.toLowerCase();
          break;
      }
    });

  return cleaned.trim();
};

// ============================================================================
// DATE EXTRACTION
// ============================================================================

/**
 * Extract available dates from Excel data based on column mapping
 */
export const extractAvailableDates = (
  excelData: any[],
  columnMapping: ColumnMapping,
  mode: "arrival" | "departure"
): string[] => {
  const dateField =
    mode === "arrival" ? columnMapping.arrivalDate : columnMapping.departDate;
  if (!dateField) return [];

  const dates = new Set<string>();
  excelData.forEach((row) => {
    const iso = toISODateString(row[dateField]);
    if (iso) dates.add(iso);
  });

  return Array.from(dates).sort();
};
