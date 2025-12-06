import {
  CompareColumnMapping,
  CompareConfig,
  GuestComparison,
  CleanupRule,
} from "./types";
import {
  formatExcelDate,
  formatExcelTime,
  applyCleanupRules,
  normalizeForComparison,
  getMappedValue,
} from "./excel-utils";
import { ALL_COMPARE_FIELDS } from "./constants";

interface CompareFilesOptions {
  json1: any[];
  json2: any[];
  mappingFile1: CompareColumnMapping;
  mappingFile2: CompareColumnMapping;
  compareConfig: CompareConfig;
  cleanupRules: CleanupRule[];
}

interface CompareResult {
  comparisons: GuestComparison[];
}

/**
 * Build all field data for a row with cleanup rules applied
 */
export const buildGuestData = (
  row: any,
  mapping: CompareColumnMapping,
  cleanupRules: CleanupRule[]
): Record<string, any> => {
  const data: Record<string, any> = {};
  const dateFields = ["arrivalDate", "departDate"];
  const timeFields = ["arrivalTime", "departTime"];

  ALL_COMPARE_FIELDS.forEach((f) => {
    const rawValue = getMappedValue(row, f, mapping);
    let formattedValue = rawValue;

    // Format dates and times from Excel format
    if (dateFields.includes(f)) {
      formattedValue = formatExcelDate(rawValue);
    } else if (timeFields.includes(f)) {
      formattedValue = formatExcelTime(rawValue);
    }

    // Apply cleanup rules to the value
    data[f] = applyCleanupRules(String(formattedValue), f, cleanupRules);
  });

  return data;
};

/**
 * Compare two Excel files and return guest comparisons
 */
export const compareExcelData = (
  options: CompareFilesOptions
): CompareResult => {
  const {
    json1,
    json2,
    mappingFile1,
    mappingFile2,
    compareConfig,
    cleanupRules,
  } = options;

  const normalize = normalizeForComparison;

  // Build index for file2 by document number and name
  const indexByDoc2: Record<string, any> = {};
  const indexByName2: Record<string, any> = {};

  json2.forEach((r) => {
    const doc = getMappedValue(r, "documentNumber", mappingFile2);
    const name = getMappedValue(r, "fullName", mappingFile2);
    if (doc) indexByDoc2[normalize(doc)] = r;
    if (name) indexByName2[normalize(name)] = r;
  });

  const comparisons: GuestComparison[] = [];
  const matchedInFile2 = new Set<any>();
  const fieldsToCompare = compareConfig.fieldsToCompare;

  // Process rows from file1
  json1.forEach((r1, idx) => {
    const doc1 = getMappedValue(r1, "documentNumber", mappingFile1);
    const name1 = getMappedValue(r1, "fullName", mappingFile1);

    // Skip rows where both name and document number are empty
    if (!name1 && !doc1) return;

    let match: any = null;

    // Match based on config
    if (
      compareConfig.matchBy === "documentNumber" ||
      compareConfig.matchBy === "both"
    ) {
      if (doc1 && indexByDoc2[normalize(doc1)]) {
        match = indexByDoc2[normalize(doc1)];
      }
    }
    if (
      !match &&
      (compareConfig.matchBy === "name" || compareConfig.matchBy === "both")
    ) {
      if (name1 && indexByName2[normalize(name1)]) {
        match = indexByName2[normalize(name1)];
      }
    }

    const file1GuestData = buildGuestData(r1, mappingFile1, cleanupRules);

    if (!match) {
      // Guest only in file1
      comparisons.push({
        id: `f1-${idx}`,
        name: name1 || "(no name)",
        documentNumber: doc1 || "",
        status: "only-file1",
        file1Data: file1GuestData,
        file2Data: {},
        differences: fieldsToCompare.filter((f) => file1GuestData[f]),
      });
    } else {
      matchedInFile2.add(match);
      const file2GuestData = buildGuestData(match, mappingFile2, cleanupRules);

      // Find differing fields
      const diffs: string[] = [];
      fieldsToCompare.forEach((f) => {
        const v1 = normalize(file1GuestData[f]);
        const v2 = normalize(file2GuestData[f]);
        if (v1 !== v2) {
          diffs.push(f);
        }
      });

      comparisons.push({
        id: `matched-${idx}`,
        name: name1 || "(no name)",
        documentNumber: doc1 || "",
        status: diffs.length > 0 ? "different" : "match",
        file1Data: file1GuestData,
        file2Data: file2GuestData,
        differences: diffs,
      });
    }
  });

  // Add guests only in file2
  json2.forEach((r2, idx) => {
    if (matchedInFile2.has(r2)) return;
    const doc2 = getMappedValue(r2, "documentNumber", mappingFile2);
    const name2 = getMappedValue(r2, "fullName", mappingFile2);

    // Skip rows where both name and document number are empty
    if (!name2 && !doc2) return;

    const file2GuestData = buildGuestData(r2, mappingFile2, cleanupRules);

    comparisons.push({
      id: `f2-${idx}`,
      name: name2 || "(no name)",
      documentNumber: doc2 || "",
      status: "only-file2",
      file1Data: {},
      file2Data: file2GuestData,
      differences: fieldsToCompare.filter((f) => file2GuestData[f]),
    });
  });

  return { comparisons };
};

/**
 * Filter guest comparisons based on criteria
 */
export const filterGuestComparisons = (
  comparisons: GuestComparison[],
  filters: {
    dates: string[];
    terminals: string[];
    statuses: string[];
  }
): GuestComparison[] => {
  const { dates, terminals, statuses } = filters;

  return comparisons.filter((g) => {
    // Status filter
    if (statuses.length > 0 && !statuses.includes(g.status)) {
      return false;
    }

    // Get date and terminal values from either file
    const arrDate = g.file1Data?.arrivalDate || g.file2Data?.arrivalDate || "";
    const depDate = g.file1Data?.departDate || g.file2Data?.departDate || "";
    const term1 = g.file1Data?.terminal || "";
    const term2 = g.file2Data?.terminal || "";

    // Date filter
    if (dates.length > 0) {
      const hasMatchingDate = dates.some(
        (d) =>
          arrDate.toLowerCase().includes(d.toLowerCase()) ||
          depDate.toLowerCase().includes(d.toLowerCase())
      );
      if (!hasMatchingDate) return false;
    }

    // Terminal filter
    if (terminals.length > 0) {
      const hasMatchingTerminal = terminals.some(
        (t) =>
          term1.toLowerCase().includes(t.toLowerCase()) ||
          term2.toLowerCase().includes(t.toLowerCase())
      );
      if (!hasMatchingTerminal) return false;
    }

    return true;
  });
};

/**
 * Extract unique dates from comparisons
 */
export const extractCompareDates = (
  comparisons: GuestComparison[]
): string[] => {
  const dates = new Set<string>();
  comparisons.forEach((g) => {
    const arrDate = g.file1Data?.arrivalDate || g.file2Data?.arrivalDate;
    const depDate = g.file1Data?.departDate || g.file2Data?.departDate;
    if (arrDate) dates.add(arrDate);
    if (depDate) dates.add(depDate);
  });
  return Array.from(dates).sort();
};

/**
 * Extract unique terminals from comparisons
 */
export const extractCompareTerminals = (
  comparisons: GuestComparison[]
): string[] => {
  const terminals = new Set<string>();
  comparisons.forEach((g) => {
    const term1 = g.file1Data?.terminal;
    const term2 = g.file2Data?.terminal;
    if (term1) terminals.add(term1);
    if (term2) terminals.add(term2);
  });
  return Array.from(terminals).sort();
};

/**
 * Get comparison statistics
 */
export const getComparisonStats = (comparisons: GuestComparison[]) => {
  return {
    total: comparisons.length,
    matching: comparisons.filter((c) => c.status === "match").length,
    different: comparisons.filter((c) => c.status === "different").length,
    onlyFile1: comparisons.filter((c) => c.status === "only-file1").length,
    onlyFile2: comparisons.filter((c) => c.status === "only-file2").length,
  };
};
