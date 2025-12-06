import * as XLSX from "xlsx";
import { ColumnMapping, CompareColumnMapping, CleanupRule } from "./types";
import { COLUMN_PATTERNS } from "./constants";

// ============================================================================
// EXCEL READING & PARSING
// ============================================================================

export interface ReadExcelResult {
  data: any[];
  columns: string[];
}

export const readExcelBuffer = async (
  buffer: ArrayBuffer
): Promise<ReadExcelResult> => {
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const columns = jsonData.length > 0 ? Object.keys(jsonData[0] as any) : [];
  return { data: jsonData, columns };
};

// ============================================================================
// AUTO-DETECTION OF COLUMNS
// ============================================================================

export const autoDetectColumns = (cols: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {};

  cols.forEach((col) => {
    Object.entries(COLUMN_PATTERNS).forEach(([key, pattern]) => {
      if (pattern.test(col) && !mapping[key as keyof ColumnMapping]) {
        mapping[key as keyof ColumnMapping] = col;
      }
    });
  });

  return mapping;
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
    const dateValue = row[dateField];
    if (dateValue) {
      let date: Date | null = null;
      if (typeof dateValue === "number") {
        // Excel date number
        date = new Date((dateValue - 25569) * 86400 * 1000);
      } else {
        date = new Date(dateValue);
      }

      if (date && !isNaN(date.getTime())) {
        dates.add(date.toISOString().split("T")[0]);
      }
    }
  });

  return Array.from(dates).sort();
};
