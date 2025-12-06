// Airport Reports Tools - Professional Edition
// Advanced Excel processing with full customization

"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { logUsage } from "@/lib/logger";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Icons
import {
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Users,
  Globe,
  Building2,
  Hotel,
  Luggage,
  FileText,
  Settings,
  Map,
  Download,
  Copy,
  Check,
  Upload,
  Calendar,
  Clock,
  User,
  Filter,
  ChevronDown,
  FileSpreadsheet,
  GitCompare,
  Sparkles,
  AlertCircle,
  Heart,
  Plus,
  Trash2,
  X,
} from "lucide-react";

// Types from lib
import type {
  ExcelData,
  ColumnMapping,
  SavedColumnMapping,
  MessageConfig,
  ExportConfig,
  ProcessedMessage,
  CellDifference,
  GuestComparison,
  CleanupRule,
  CompareColumnMapping,
  SavedCompareMapping,
  CompareConfig,
} from "@/lib/types";

// Constants from lib
import {
  DEFAULT_CUSTOM_TEMPLATE,
  DEFAULT_MESSAGE_CONFIG,
  DEFAULT_EXPORT_CONFIG,
  DEFAULT_CLEANUP_RULES,
  DEFAULT_COMPARE_CONFIG,
  FIELD_LABELS,
  ALL_COMPARE_FIELDS,
  COMMON_MAPPING_FIELDS,
  ARRIVAL_MAPPING_FIELDS,
  DEPARTURE_MAPPING_FIELDS,
  STORAGE_KEYS,
} from "@/lib/constants";

// Utility functions from lib
import {
  readExcelBuffer,
  autoDetectColumns,
  formatExcelDate,
  formatExcelTime,
  applyCleanupRules as applyCleanupRulesUtil,
  extractAvailableDates,
} from "@/lib/excel-utils";

import { processExcelToMessages } from "@/lib/message-processing";

import {
  compareExcelData,
  filterGuestComparisons,
  extractCompareDates,
  extractCompareTerminals,
  getComparisonStats,
} from "@/lib/comparison-utils";

// Tab Components
import { MessagesTab } from "@/components/tabs/MessagesTab";
import { CompareTab } from "@/components/tabs/CompareTab";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AirportReportsTools() {
  // File states
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelData, setExcelData] = useState<ExcelData>([]);
  const [columns, setColumns] = useState<string[]>([]);

  // UI states
  const [activeTab, setActiveTab] = useState<"compare" | "messages">(
    "messages"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Processing states
  const [mode, setMode] = useState<"arrival" | "departure">("arrival");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([]);
  const [selectedFlights, setSelectedFlights] = useState<string[]>([]);
  const [selectedNationalities, setSelectedNationalities] = useState<string[]>(
    []
  );
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [messageConfig, setMessageConfig] = useState<MessageConfig>({
    includeHeader: true,
    includePassengers: true,
    includePosition: true,
    includeNationality: true,
    includeFlightInfo: true,
    includeTerminal: true,
    includeHotel: true,
    includeBaggage: true,
    includeRemarks: true,
    customTemplate: DEFAULT_CUSTOM_TEMPLATE,
    useCustomTemplate: false,
  });

  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    groupBy: "date",
    exportFormat: "single",
  });

  // Cleanup rules
  const [cleanupRules, setCleanupRules] = useState<CleanupRule[]>([
    {
      id: "1",
      type: "replace",
      find: "Ministerial*",
      replace: "Ministerial",
      applyTo: "all",
      enabled: true,
    },
  ]);

  // Saved column mapping templates
  const [savedColumnMappings, setSavedColumnMappings] = useState<
    SavedColumnMapping[]
  >([]);
  const [newMappingName, setNewMappingName] = useState("");

  // Results
  const [processedMessages, setProcessedMessages] = useState<
    ProcessedMessage[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  // Compare states
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [differences, setDifferences] = useState<CellDifference[]>([]);
  const [comparisonComplete, setComparisonComplete] = useState(false);
  const [guestComparisons, setGuestComparisons] = useState<GuestComparison[]>(
    []
  );
  const [file1Data, setFile1Data] = useState<any[]>([]);
  const [file2Data, setFile2Data] = useState<any[]>([]);

  // Compare mapping state
  const [showCompareMappingModal, setShowCompareMappingModal] = useState(false);
  const [compareMappingFile1, setCompareMappingFile1] =
    useState<CompareColumnMapping>({});
  const [compareMappingFile2, setCompareMappingFile2] =
    useState<CompareColumnMapping>({});
  const [columnsFile1, setColumnsFile1] = useState<string[]>([]);
  const [columnsFile2, setColumnsFile2] = useState<string[]>([]);
  const [compareConfig, setCompareConfig] = useState<CompareConfig>({
    matchBy: "both",
    fieldsToCompare: [
      "fullName",
      "nationality",
      "position",
      "documentNumber",
      "terminal",
      "hotel",
      "remarks",
      "arrivalDate",
      "arrivalTime",
      "arrivalFlight",
      "departDate",
      "departTime",
      "departFlight",
    ],
  });
  const [savedCompareMappings, setSavedCompareMappings] = useState<
    SavedCompareMapping[]
  >([]);
  const [newCompareMappingName, setNewCompareMappingName] = useState("");

  // Compare filters (arrays for multi-select)
  const [compareFilterDates, setCompareFilterDates] = useState<string[]>([]);
  const [compareFilterTerminals, setCompareFilterTerminals] = useState<
    string[]
  >([]);
  const [compareFilterStatuses, setCompareFilterStatuses] = useState<string[]>(
    []
  );

  // ============================================================================
  // LOCAL STORAGE PERSISTENCE
  // ============================================================================

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("airportTools_mode");
      const savedMessageConfig = localStorage.getItem(
        "airportTools_messageConfig"
      );
      const savedExportConfig = localStorage.getItem(
        "airportTools_exportConfig"
      );
      const savedCleanupRules = localStorage.getItem(
        "airportTools_cleanupRules"
      );
      const savedColumnMappingsData = localStorage.getItem(
        "airportTools_savedColumnMappings"
      );
      const savedCompareMappingsData = localStorage.getItem(
        "airportTools_savedCompareMappings"
      );
      const savedCompareConfig = localStorage.getItem(
        "airportTools_compareConfig"
      );

      if (savedMode) {
        setMode(savedMode as "arrival" | "departure");
      }
      if (savedMessageConfig) {
        setMessageConfig(JSON.parse(savedMessageConfig));
      }
      if (savedExportConfig) {
        setExportConfig(JSON.parse(savedExportConfig));
      }
      if (savedCleanupRules) {
        setCleanupRules(JSON.parse(savedCleanupRules));
      }
      if (savedColumnMappingsData) {
        setSavedColumnMappings(JSON.parse(savedColumnMappingsData));
      }
      if (savedCompareMappingsData) {
        setSavedCompareMappings(JSON.parse(savedCompareMappingsData));
      }
      if (savedCompareConfig) {
        setCompareConfig(JSON.parse(savedCompareConfig));
      }
    } catch (error) {
      console.error("Error loading settings from localStorage:", error);
    }
  }, []);

  // Save mode to localStorage
  useEffect(() => {
    localStorage.setItem("airportTools_mode", mode);
    setSettingsSaved(true);
    const timer = setTimeout(() => setSettingsSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [mode]);

  // Save messageConfig to localStorage
  useEffect(() => {
    localStorage.setItem(
      "airportTools_messageConfig",
      JSON.stringify(messageConfig)
    );
    setSettingsSaved(true);
    const timer = setTimeout(() => setSettingsSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [messageConfig]);

  // Save exportConfig to localStorage
  useEffect(() => {
    localStorage.setItem(
      "airportTools_exportConfig",
      JSON.stringify(exportConfig)
    );
    setSettingsSaved(true);
    const timer = setTimeout(() => setSettingsSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [exportConfig]);

  // Save cleanupRules to localStorage
  useEffect(() => {
    localStorage.setItem(
      "airportTools_cleanupRules",
      JSON.stringify(cleanupRules)
    );
    setSettingsSaved(true);
    const timer = setTimeout(() => setSettingsSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [cleanupRules]);

  // Save savedColumnMappings to localStorage
  useEffect(() => {
    localStorage.setItem(
      "airportTools_savedColumnMappings",
      JSON.stringify(savedColumnMappings)
    );
  }, [savedColumnMappings]);

  // Save savedCompareMappings to localStorage
  useEffect(() => {
    localStorage.setItem(
      "airportTools_savedCompareMappings",
      JSON.stringify(savedCompareMappings)
    );
  }, [savedCompareMappings]);

  // Save compareConfig to localStorage
  useEffect(() => {
    localStorage.setItem(
      "airportTools_compareConfig",
      JSON.stringify(compareConfig)
    );
  }, [compareConfig]);

  // ============================================================================
  // COLUMN MAPPING TEMPLATE FUNCTIONS
  // ============================================================================

  const saveCurrentColumnMapping = () => {
    if (!newMappingName.trim()) return;

    const newMapping: SavedColumnMapping = {
      id: Date.now().toString(),
      name: newMappingName.trim(),
      mapping: { ...columnMapping },
    };

    setSavedColumnMappings((prev) => [...prev, newMapping]);
    setNewMappingName("");
  };

  const loadColumnMapping = (savedMapping: SavedColumnMapping) => {
    setColumnMapping(savedMapping.mapping);
  };

  const deleteColumnMapping = (id: string) => {
    setSavedColumnMappings((prev) => prev.filter((m) => m.id !== id));
  };

  // ============================================================================
  // EXCEL PROCESSING FUNCTIONS
  // ============================================================================

  const readExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length > 0) {
        const cols = Object.keys(jsonData[0] as any);
        setColumns(cols);
        setExcelData(jsonData as ExcelData);

        // Auto-detect columns
        autoDetectColumns(cols);

        // Log file upload
        logUsage("File Upload", file.name, {
          rowCount: jsonData.length,
          columnCount: cols.length,
          columns: cols,
        });
      }
    } catch (err) {
      setError(
        "Failed to read Excel file. Please ensure it's a valid Excel file."
      );
      console.error(err);
    }
  };

  const autoDetectColumns = (cols: string[]) => {
    const mapping: ColumnMapping = {};

    const patterns = {
      fullName: /name|الاسم|full.*name/i,
      nationality: /delegation|nationality|country|الوفد|الدولة/i,
      position: /position|المسمى|title/i,
      documentNumber: /document|passport|رقم.*الجواز|doc.*no/i,
      category: /category|الكشف|القائمة/i,
      terminal: /terminal|الصالة/i,
      arrivalDate: /arrival.*date|تاريخ.*الوصول/i,
      arrivalTime: /arrival.*time|وقت.*الوصول/i,
      arrivalFlight: /arrival.*flight|رحلة.*الوصول/i,
      departDate: /dep.*date|departure.*date|تاريخ.*المغادرة/i,
      departTime: /dep.*time|departure.*time|وقت.*المغادرة/i,
      departFlight: /dep.*flight|departure.*flight|رحلة.*المغادرة/i,
      hotel: /hotel|الفندق/i,
      remarks: /remarks|ملاحظات|notes/i,
    };

    cols.forEach((col) => {
      Object.entries(patterns).forEach(([key, pattern]) => {
        if (pattern.test(col) && !mapping[key as keyof ColumnMapping]) {
          mapping[key as keyof ColumnMapping] = col;
        }
      });
    });

    setColumnMapping(mapping);
  };

  // Get available dates from data
  const availableDates = useMemo(() => {
    if (!excelData.length || !columnMapping) return [];

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
  }, [excelData, columnMapping, mode]);

  // Get available terminals from data
  const availableTerminals = useMemo(() => {
    if (!excelData.length || !columnMapping?.terminal) return [];

    const terminals = new Set<string>();
    excelData.forEach((row) => {
      const value = row[columnMapping.terminal!];
      if (value && String(value).trim()) {
        terminals.add(String(value).trim());
      }
    });

    return Array.from(terminals).sort();
  }, [excelData, columnMapping]);

  // Get available flights from data
  const availableFlights = useMemo(() => {
    if (!excelData.length || !columnMapping) return [];

    const flightField =
      mode === "arrival"
        ? columnMapping.arrivalFlight
        : columnMapping.departFlight;
    if (!flightField) return [];

    const flights = new Set<string>();
    excelData.forEach((row) => {
      const value = row[flightField];
      if (value && String(value).trim()) {
        flights.add(String(value).trim());
      }
    });

    return Array.from(flights).sort();
  }, [excelData, columnMapping, mode]);

  // Get available nationalities/delegations from data
  const availableNationalities = useMemo(() => {
    if (!excelData.length || !columnMapping?.nationality) return [];

    const nationalities = new Set<string>();
    excelData.forEach((row) => {
      const value = row[columnMapping.nationality!];
      if (value && String(value).trim()) {
        nationalities.add(String(value).trim());
      }
    });

    return Array.from(nationalities).sort();
  }, [excelData, columnMapping]);

  // ============================================================================
  // DATA CLEANUP FUNCTIONS
  // ============================================================================

  const applyCleanupRules = (
    value: string,
    field: keyof ColumnMapping | string
  ): string => {
    if (!value || typeof value !== "string") return value;

    let cleaned = value;

    cleanupRules
      .filter((rule) => rule.enabled)
      .forEach((rule) => {
        // Check if rule applies to this field
        // If applyTo is "all", apply to everything
        // If applyTo matches the field name, apply it
        if (rule.applyTo !== "all" && rule.applyTo !== field) {
          return;
        }

        switch (rule.type) {
          case "replace":
            // Escape special regex characters in the find string to treat them literally
            const escapedFind = rule.find.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            );
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
            // Capitalize first letter of each word
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
  // MESSAGE PROCESSING
  // ============================================================================

  const processMessages = () => {
    if (!excelData.length || !columnMapping) {
      setError("Please upload a file and map columns first");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const messages: ProcessedMessage[] = [];
      const dateField =
        mode === "arrival"
          ? columnMapping.arrivalDate
          : columnMapping.departDate;
      const timeField =
        mode === "arrival"
          ? columnMapping.arrivalTime
          : columnMapping.departTime;
      const flightField =
        mode === "arrival"
          ? columnMapping.arrivalFlight
          : columnMapping.departFlight;

      // Filter by date if selected (if no dates selected, show all)
      let filteredData = [...excelData];
      if (selectedDates.length > 0 && dateField) {
        filteredData = filteredData.filter((row) => {
          const dateValue = row[dateField];
          if (!dateValue) return false;

          let date: Date | null = null;
          if (typeof dateValue === "number") {
            date = new Date((dateValue - 25569) * 86400 * 1000);
          } else {
            date = new Date(dateValue);
          }

          return (
            date && selectedDates.includes(date.toISOString().split("T")[0])
          );
        });
      }

      // Filter by terminal if selected
      if (selectedTerminals.length > 0 && columnMapping.terminal) {
        filteredData = filteredData.filter((row) => {
          const value = row[columnMapping.terminal!];
          return value && selectedTerminals.includes(String(value).trim());
        });
      }

      // Filter by flight if selected
      if (selectedFlights.length > 0 && flightField) {
        filteredData = filteredData.filter((row) => {
          const value = row[flightField];
          return value && selectedFlights.includes(String(value).trim());
        });
      }

      // Filter by nationality if selected
      if (selectedNationalities.length > 0 && columnMapping.nationality) {
        filteredData = filteredData.filter((row) => {
          const value = row[columnMapping.nationality!];
          return value && selectedNationalities.includes(String(value).trim());
        });
      }

      // Group by flight, nationality, terminal, hotel
      const groups: Record<string, any[]> = {};

      filteredData.forEach((row) => {
        const flight = applyCleanupRules(
          flightField ? row[flightField] || "TBD" : "TBD",
          flightField || "flight"
        );
        const nationality = applyCleanupRules(
          columnMapping.nationality ? row[columnMapping.nationality] || "" : "",
          columnMapping.nationality || "nationality"
        );
        const terminal = applyCleanupRules(
          columnMapping.terminal ? row[columnMapping.terminal] || "VIP" : "VIP",
          columnMapping.terminal || "terminal"
        );
        const hotel = applyCleanupRules(
          columnMapping.hotel ? row[columnMapping.hotel] || "" : "",
          columnMapping.hotel || "hotel"
        );

        const key = `${flight}|${nationality}|${terminal}|${hotel}`;

        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(row);
      });

      // Create messages for each group
      Object.entries(groups).forEach(([key, groupRows]) => {
        const [flight, nationality, terminal, hotel] = key.split("|");
        const firstRow = groupRows[0];

        // Get date and time
        let date = "";
        let time = "TBD";

        if (dateField && firstRow[dateField]) {
          const dateValue = firstRow[dateField];
          let dateObj: Date | null = null;
          if (typeof dateValue === "number") {
            dateObj = new Date((dateValue - 25569) * 86400 * 1000);
          } else {
            dateObj = new Date(dateValue);
          }
          if (dateObj && !isNaN(dateObj.getTime())) {
            date = dateObj.toISOString().split("T")[0];
          }
        }

        if (timeField && firstRow[timeField]) {
          const timeValue = firstRow[timeField];
          if (typeof timeValue === "number") {
            // Excel time as fraction of day
            const totalMinutes = timeValue * 24 * 60;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);
            time = `${String(hours).padStart(2, "0")}:${String(
              minutes
            ).padStart(2, "0")}`;
          } else if (typeof timeValue === "string") {
            time = timeValue;
          }
        }

        // Get passengers
        const passengers = groupRows.map((row) => ({
          name: applyCleanupRules(
            columnMapping.fullName
              ? row[columnMapping.fullName] || "N/A"
              : "N/A",
            columnMapping.fullName || "fullName"
          ),
          position: applyCleanupRules(
            columnMapping.position ? row[columnMapping.position] || "" : "",
            columnMapping.position || "position"
          ),
          remarks: applyCleanupRules(
            columnMapping.remarks ? row[columnMapping.remarks] || "" : "",
            columnMapping.remarks || "remarks"
          ),
          documentNumber: applyCleanupRules(
            columnMapping.documentNumber
              ? row[columnMapping.documentNumber] || ""
              : "",
            columnMapping.documentNumber || "documentNumber"
          ),
          category: applyCleanupRules(
            columnMapping.category ? row[columnMapping.category] || "" : "",
            columnMapping.category || "category"
          ),
        }));

        // Build message using custom template or default
        let finalMessage = "";

        if (messageConfig.useCustomTemplate && messageConfig.customTemplate) {
          // Use custom template with variables
          let template = messageConfig.customTemplate;

          // Basic info replacements
          const headerText = mode === "arrival" ? "Arrival" : "Departure";
          template = template.replace(/\{\{header\}\}/g, headerText);
          template = template.replace(/\{\{mode\}\}/g, mode);
          template = template.replace(
            /\{\{date\}\}/g,
            date ? new Date(date + "T00:00:00").toLocaleDateString() : "TBD"
          );
          template = template.replace(/\{\{time\}\}/g, time);

          // Passengers list
          const passengersList = passengers
            .map((p: any, idx: number) => {
              let line = `${idx + 1}) ${p.name}`;
              if (messageConfig.includePosition && p.position) {
                line += ` - ${p.position}`;
              }
              return line;
            })
            .join("\n");
          template = template.replace(/\{\{passengers\}\}/g, passengersList);
          template = template.replace(
            /\{\{passengerCount\}\}/g,
            passengers.length.toString()
          );

          // Passengers with full details
          const passengersDetailedList = passengers
            .map((p: any, idx: number) => {
              let line = `${idx + 1}) ${p.name}`;
              if (p.position) line += ` - ${p.position}`;
              if (p.documentNumber) line += ` | Doc: ${p.documentNumber}`;
              if (p.category) line += ` | Cat: ${p.category}`;
              return line;
            })
            .join("\n");
          template = template.replace(
            /\{\{passengersDetailed\}\}/g,
            passengersDetailedList
          );

          // Individual passenger details
          const passengerNames = passengers.map((p: any) => p.name).join(", ");
          template = template.replace(
            /\{\{passengerNames\}\}/g,
            passengerNames
          );

          // Positions list
          const positions = passengers
            .filter((p: any) => p.position)
            .map((p: any) => p.position)
            .join(", ");
          template = template.replace(/\{\{positions\}\}/g, positions || "-");

          // Document numbers
          const documentNumbers = passengers
            .filter((p: any) => p.documentNumber)
            .map((p: any) => `${p.name}: ${p.documentNumber}`)
            .join("\n");
          template = template.replace(
            /\{\{documentNumbers\}\}/g,
            documentNumbers || "-"
          );

          // Categories
          const categories = [
            ...new Set(passengers.map((p: any) => p.category).filter(Boolean)),
          ].join(", ");
          template = template.replace(/\{\{category\}\}/g, categories || "-");
          template = template.replace(/\{\{categories\}\}/g, categories || "-");

          // Nationality/Delegation
          template = template.replace(
            /\{\{nationality\}\}/g,
            nationality || "N/A"
          );
          template = template.replace(
            /\{\{delegation\}\}/g,
            nationality || "N/A"
          );

          // Flight info
          template = template.replace(/\{\{flight\}\}/g, flight);
          template = template.replace(
            /\{\{flightTime\}\}/g,
            `${flight} | ${time}`
          );
          template = template.replace(
            /\{\{flightInfo\}\}/g,
            `Flight: ${flight} | ${time}`
          );

          // Terminal
          template = template.replace(/\{\{terminal\}\}/g, terminal);

          // Hotel
          template = template.replace(/\{\{hotel\}\}/g, hotel || "-");

          // Baggage
          template = template.replace(/\{\{baggage\}\}/g, "-");
          template = template.replace(/\{\{luggage\}\}/g, "-");

          // Remarks
          const remarksWithContent = passengers.filter((p: any) => p.remarks);
          if (remarksWithContent.length > 0) {
            const remarksText = remarksWithContent
              .map((p: any) => `${p.name}:\n${p.remarks}`)
              .join("\n\n");
            template = template.replace(/\{\{remarks\}\}/g, remarksText);
          } else {
            template = template.replace(/\{\{remarks\}\}/g, "-");
          }

          finalMessage = template;
        } else {
          // Build default message with emojis
          const messageParts: string[] = [];

          if (messageConfig.includeHeader) {
            const headerEmoji = mode === "arrival" ? "🛬" : "🛫";
            const headerText = mode === "arrival" ? "Arrival" : "Departure";
            messageParts.push(`${headerEmoji} ${headerText}\n`);
          }

          if (messageConfig.includePassengers) {
            messageParts.push(`👥 Passenger(s):`);
            passengers.forEach((p: any, idx: number) => {
              let line = `${idx + 1}) *${p.name.trim()}*`;
              if (messageConfig.includePosition && p.position) {
                line += ` - ${p.position}`;
              }
              messageParts.push(line);
            });
            messageParts.push("");
          }

          if (messageConfig.includeNationality && nationality) {
            messageParts.push(`🌍 Delegation: ${nationality}`);
          }

          if (messageConfig.includeFlightInfo) {
            messageParts.push(`✈️ Flight: ${flight} | ${time}`);
          }

          if (messageConfig.includeTerminal) {
            messageParts.push(`🏢 Terminal: ${terminal}`);
          }

          if (messageConfig.includeHotel && mode === "arrival") {
            const hotelDisplay = hotel || "-";
            messageParts.push(`🏨 Hotel: ${hotelDisplay}`);
          }

          if (messageConfig.includeBaggage && mode === "arrival") {
            messageParts.push(`💼 Luggage: -`);
          }

          if (messageConfig.includeRemarks) {
            const remarksWithContent = passengers.filter((p: any) => p.remarks);
            if (remarksWithContent.length > 0) {
              messageParts.push(`📝 Remarks:`);
              remarksWithContent.forEach((p: any) => {
                messageParts.push(`${p.name}:\n${p.remarks}`);
              });
            } else {
              messageParts.push(`📝 Remarks: -`);
            }
          }

          finalMessage = messageParts.join("\n");
        }

        messages.push({
          date,
          time,
          flight,
          nationality,
          terminal,
          hotel,
          passengers,
          message: finalMessage,
        });
      });

      // Sort by date and time
      messages.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });

      setProcessedMessages(messages);
      setShowPreviewModal(true);

      // Log message generation
      logUsage("Generate Messages", excelFile?.name, {
        mode,
        messageCount: messages.length,
        dates: selectedDates,
        useCustomTemplate: messageConfig.useCustomTemplate,
      });
    } catch (err) {
      setError(
        "Failed to process messages. Please check your column mappings."
      );
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // DOWNLOAD FUNCTIONS
  // ============================================================================

  const downloadMessages = async () => {
    if (!processedMessages.length) return;

    let messagesToExport = [...processedMessages];

    // Apply filters based on export config - filter out messages that don't match selected criteria
    // Note: The include flags determine what metadata to show, not what to filter
    // For now, we export all messages but could add filtering logic here if needed

    // Group messages based on groupBy setting
    const grouped: Record<string, ProcessedMessage[]> = {};

    messagesToExport.forEach((msg) => {
      let key = "";
      switch (exportConfig.groupBy) {
        case "date":
          key = msg.date || "no-date";
          break;
        case "terminal":
          key = msg.terminal || "no-terminal";
          break;
        case "flight":
          key = msg.flight || "no-flight";
          break;
        case "nationality":
          key = msg.nationality || "no-nationality";
          break;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(msg);
    });

    if (exportConfig.exportFormat === "single") {
      // Single file with all messages, grouped by date with separators
      const messagesByDate: Record<string, ProcessedMessage[]> = {};
      messagesToExport.forEach((msg) => {
        const dateKey = msg.date || "no-date";
        if (!messagesByDate[dateKey]) {
          messagesByDate[dateKey] = [];
        }
        messagesByDate[dateKey].push(msg);
      });

      // Sort dates
      const sortedDates = Object.keys(messagesByDate).sort();

      // Build content with date separators
      const contentParts: string[] = [];
      sortedDates.forEach((dateKey, dateIndex) => {
        if (dateIndex > 0) {
          // Add date separator between different dates
          contentParts.push("\n" + "═".repeat(50));
          contentParts.push(
            `📅 ${new Date(dateKey + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}`
          );
          contentParts.push("═".repeat(50) + "\n");
        } else if (sortedDates.length > 1) {
          // Add header for first date only if there are multiple dates
          contentParts.push("═".repeat(50));
          contentParts.push(
            `📅 ${new Date(dateKey + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}`
          );
          contentParts.push("═".repeat(50) + "\n");
        }

        const dateMessages = messagesByDate[dateKey]
          .map((m) => m.message)
          .join("\n\n" + "─".repeat(50) + "\n\n");
        contentParts.push(dateMessages);
      });

      const content = contentParts.join("\n");

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().split("T")[0];
      a.download = `${mode}_all_messages_${timestamp}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Individual files based on groupBy
      const entries = Object.entries(grouped);
      for (const [groupKey, messages] of entries) {
        const content = messages
          .map((m) => m.message)
          .join("\n\n" + "─".repeat(50) + "\n\n");

        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Clean up the key for filename (remove special characters)
        const cleanKey = groupKey.replace(/[^a-zA-Z0-9-_]/g, "_");
        a.download = `${mode}_${exportConfig.groupBy}_${cleanKey}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Add small delay between downloads to prevent browser blocking
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    setShowExportModal(false);

    // Log export
    logUsage("Export Messages", excelFile?.name, {
      exportFormat: exportConfig.exportFormat,
      groupBy: exportConfig.groupBy,
      messageCount: messagesToExport.length,
      fileCount:
        exportConfig.exportFormat === "single"
          ? 1
          : Object.keys(grouped).length,
    });
  };

  // ============================================================================
  // EXCEL COMPARISON
  // ============================================================================

  const compareExcelFiles = async () => {
    if (!file1 || !file2) {
      setError("Please select both files to compare");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setDifferences([]);
    setGuestComparisons([]);
    setComparisonComplete(false);

    try {
      const data1 = await file1.arrayBuffer();
      const data2 = await file2.arrayBuffer();

      const workbook1 = XLSX.read(data1);
      const workbook2 = XLSX.read(data2);

      // Use first sheet from each file
      const sheet1 = workbook1.Sheets[workbook1.SheetNames[0]];
      const sheet2 = workbook2.Sheets[workbook2.SheetNames[0]];

      const json1: any[] = XLSX.utils.sheet_to_json(sheet1, { defval: "" });
      const json2: any[] = XLSX.utils.sheet_to_json(sheet2, { defval: "" });

      // Store raw data for filtering
      setFile1Data(json1);
      setFile2Data(json2);

      const normalize = (s: any) => {
        if (s === undefined || s === null) return "";
        return String(s)
          .toLowerCase()
          .replace(/\s+/g, " ")
          .replace(/[\-_,\.\/\\]/g, "")
          .trim();
      };

      // Helper to get value safely from a row given mapping and field
      const getMappedValue = (
        row: any,
        field: string,
        mapping: CompareColumnMapping
      ) => {
        const col = mapping[field as keyof CompareColumnMapping];
        if (col && row) return row[col] ?? "";
        return "";
      };

      // Format Excel date (number) to readable date string
      const formatExcelDate = (value: any): string => {
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

      // Format Excel time (fraction of day) to readable time string
      const formatExcelTime = (value: any): string => {
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
            return `${String(hours).padStart(2, "0")}:${String(
              minutes
            ).padStart(2, "0")}`;
          }
        }
        return String(value);
      };

      // Build all field data for a row with cleanup rules applied
      const buildGuestData = (
        row: any,
        mapping: CompareColumnMapping
      ): Record<string, any> => {
        const data: Record<string, any> = {};
        const allFields = [
          "fullName",
          "documentNumber",
          "nationality",
          "position",
          "terminal",
          "hotel",
          "remarks",
          "category",
          "arrivalDate",
          "arrivalTime",
          "arrivalFlight",
          "departDate",
          "departTime",
          "departFlight",
        ];
        const dateFields = ["arrivalDate", "departDate"];
        const timeFields = ["arrivalTime", "departTime"];

        allFields.forEach((f) => {
          const rawValue = getMappedValue(row, f, mapping);
          let formattedValue = rawValue;

          // Format dates and times from Excel format
          if (dateFields.includes(f)) {
            formattedValue = formatExcelDate(rawValue);
          } else if (timeFields.includes(f)) {
            formattedValue = formatExcelTime(rawValue);
          }

          // Apply cleanup rules to the value
          data[f] = applyCleanupRules(String(formattedValue), f);
        });
        return data;
      };

      // Build index for file2 by document number and name
      const indexByDoc2: Record<string, any> = {};
      const indexByName2: Record<string, any> = {};

      json2.forEach((r) => {
        const doc = getMappedValue(r, "documentNumber", compareMappingFile2);
        const name = getMappedValue(r, "fullName", compareMappingFile2);
        if (doc) indexByDoc2[normalize(doc)] = r;
        if (name) indexByName2[normalize(name)] = r;
      });

      const comparisons: GuestComparison[] = [];
      const matchedInFile2 = new Set<any>();
      const fieldsToCompare = compareConfig.fieldsToCompare;

      // Process rows from file1
      json1.forEach((r1, idx) => {
        const doc1 = getMappedValue(r1, "documentNumber", compareMappingFile1);
        const name1 = getMappedValue(r1, "fullName", compareMappingFile1);

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

        const file1GuestData = buildGuestData(r1, compareMappingFile1);

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
          const file2GuestData = buildGuestData(match, compareMappingFile2);

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
        const doc2 = getMappedValue(r2, "documentNumber", compareMappingFile2);
        const name2 = getMappedValue(r2, "fullName", compareMappingFile2);

        // Skip rows where both name and document number are empty
        if (!name2 && !doc2) return;

        const file2GuestData = buildGuestData(r2, compareMappingFile2);

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

      setGuestComparisons(comparisons);
      setComparisonComplete(true);

      // Log comparison
      logUsage("Compare Files", `${file1.name} vs ${file2.name}`, {
        file1: file1.name,
        file2: file2.name,
        totalGuests: comparisons.length,
        onlyInFile1: comparisons.filter((c) => c.status === "only-file1")
          .length,
        onlyInFile2: comparisons.filter((c) => c.status === "only-file2")
          .length,
        withDifferences: comparisons.filter((c) => c.status === "different")
          .length,
        matching: comparisons.filter((c) => c.status === "match").length,
      });
    } catch (err) {
      setError(
        "Error comparing files. Please ensure both files are valid Excel files."
      );
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================================
  // RENDER UI
  // ============================================================================

  return (
    <div className="min-h-screen bg-white p-3 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 py-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <div className="bg-black p-2 sm:p-2.5 rounded-xl shadow-lg">
              <Plane className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black">
              Airport Report Tools
            </h1>
          </div>
          <div className="flex items-center justify-center gap-3">
            <p className="text-gray-600 text-sm sm:text-base">
              Professional Excel processing with advanced customization
            </p>
            {settingsSaved && (
              <div className="flex items-center gap-1 text-xs text-green-600 animate-fade-in">
                <Check className="h-3 w-3" />
                <span>Saved</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to reset all settings to default? This will clear your custom templates, cleanup rules, and preferences."
                  )
                ) {
                  localStorage.removeItem("airportTools_mode");
                  localStorage.removeItem("airportTools_messageConfig");
                  localStorage.removeItem("airportTools_exportConfig");
                  localStorage.removeItem("airportTools_cleanupRules");
                  window.location.reload();
                }
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Reset all settings to default"
            >
              <X className="h-3 w-3 mr-1" />
              Reset Settings
            </Button>
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-2 border-gray-200">
          <CardHeader className="pb-3 sm:pb-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger
                  value="messages"
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Message Generator</span>
                  <span className="sm:hidden">Messages</span>
                </TabsTrigger>
                <TabsTrigger
                  value="compare"
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"
                >
                  <GitCompare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Compare Files</span>
                  <span className="sm:hidden">Compare</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="messages"
                className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
              >
                <MessagesTab
                  excelFile={excelFile}
                  setExcelFile={setExcelFile}
                  excelData={excelData}
                  setExcelData={setExcelData}
                  columns={columns}
                  setColumns={setColumns}
                  mode={mode}
                  setMode={setMode}
                  selectedDates={selectedDates}
                  setSelectedDates={setSelectedDates}
                  selectedTerminals={selectedTerminals}
                  setSelectedTerminals={setSelectedTerminals}
                  selectedFlights={selectedFlights}
                  setSelectedFlights={setSelectedFlights}
                  selectedNationalities={selectedNationalities}
                  setSelectedNationalities={setSelectedNationalities}
                  columnMapping={columnMapping}
                  setColumnMapping={setColumnMapping}
                  messageConfig={messageConfig}
                  exportConfig={exportConfig}
                  cleanupRules={cleanupRules}
                  isProcessing={isProcessing}
                  showMappingModal={showMappingModal}
                  setShowMappingModal={setShowMappingModal}
                  showConfigModal={showConfigModal}
                  setShowConfigModal={setShowConfigModal}
                  showCleanupModal={showCleanupModal}
                  setShowCleanupModal={setShowCleanupModal}
                  savedColumnMappings={savedColumnMappings}
                  availableDates={availableDates}
                  availableTerminals={availableTerminals}
                  availableFlights={availableFlights}
                  availableNationalities={availableNationalities}
                  readExcelFile={readExcelFile}
                  processMessages={processMessages}
                />
              </TabsContent>

              <TabsContent
                value="compare"
                className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
              >
                <CompareTab
                  file1={file1}
                  setFile1={setFile1}
                  file2={file2}
                  setFile2={setFile2}
                  columnsFile1={columnsFile1}
                  setColumnsFile1={setColumnsFile1}
                  columnsFile2={columnsFile2}
                  setColumnsFile2={setColumnsFile2}
                  compareMappingFile1={compareMappingFile1}
                  setCompareMappingFile1={setCompareMappingFile1}
                  compareMappingFile2={compareMappingFile2}
                  setCompareMappingFile2={setCompareMappingFile2}
                  compareConfig={compareConfig}
                  setCompareConfig={setCompareConfig}
                  cleanupRules={cleanupRules}
                  savedCompareMappings={savedCompareMappings}
                  setSavedCompareMappings={setSavedCompareMappings}
                  newCompareMappingName={newCompareMappingName}
                  setNewCompareMappingName={setNewCompareMappingName}
                  compareFilterDates={compareFilterDates}
                  setCompareFilterDates={setCompareFilterDates}
                  compareFilterTerminals={compareFilterTerminals}
                  setCompareFilterTerminals={setCompareFilterTerminals}
                  compareFilterStatuses={compareFilterStatuses}
                  setCompareFilterStatuses={setCompareFilterStatuses}
                  guestComparisons={guestComparisons}
                  comparisonComplete={comparisonComplete}
                  isProcessing={isProcessing}
                  showCompareMappingModal={showCompareMappingModal}
                  setShowCompareMappingModal={setShowCompareMappingModal}
                  showCleanupModal={showCleanupModal}
                  setShowCleanupModal={setShowCleanupModal}
                  compareExcelFiles={compareExcelFiles}
                />
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-start gap-2 sm:gap-3 text-red-800">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm sm:text-base">Error</p>
                  <p className="text-xs sm:text-sm mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] sm:max-h-[85vh]">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Sparkles className="h-5 w-5" />
                <span>Generated Messages ({processedMessages.length})</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Review, copy, and export your generated messages
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[50vh] w-full pr-2 sm:pr-4">
              <div className="space-y-3 sm:space-y-4">
                {processedMessages.map((msg, idx) => (
                  <Card key={idx} className="relative shadow-md">
                    <CardHeader className="pb-2 sm:pb-3">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">
                              {new Date(
                                msg.date + "T00:00:00"
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">{msg.time}</span>
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Plane className="h-3 w-3" />
                            <span className="text-xs">{msg.flight}</span>
                          </Badge>
                          {msg.terminal && (
                            <Badge variant="outline" className="gap-1">
                              <Building2 className="h-3 w-3" />
                              <span className="text-xs">{msg.terminal}</span>
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(msg.message);
                            setCopiedIndex(idx);
                            setTimeout(() => setCopiedIndex(null), 2000);
                          }}
                          className="gap-1.5 h-8 text-xs sm:text-sm w-full sm:w-auto"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <pre className="whitespace-pre-wrap text-xs sm:text-sm font-sans leading-relaxed">
                        {msg.message}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
                className="text-sm h-9 sm:h-10"
              >
                Close
              </Button>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const allMessages = processedMessages
                      .map((m) => m.message)
                      .join("\n\n" + "─".repeat(50) + "\n\n");
                    navigator.clipboard.writeText(allMessages);
                  }}
                  className="gap-2 text-sm h-9 sm:h-10"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy All</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(true)}
                  className="gap-2 text-sm h-9 sm:h-10 hidden sm:flex"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Options</span>
                </Button>
                <Button
                  onClick={downloadMessages}
                  className="gap-2 text-sm h-9 sm:h-10"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Column Mapping Modal */}
        <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] sm:max-h-[85vh]">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Map className="h-5 w-5" />
                <span>Map Excel Columns</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Map your Excel columns to the required fields for processing
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[60vh] pr-2 sm:pr-4">
              <div className="space-y-3 sm:space-y-4">
                {/* Saved Mapping Templates Section */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Saved Mapping Templates
                  </Label>

                  {/* Load existing templates */}
                  {savedColumnMappings.length > 0 && (
                    <div className="space-y-2">
                      {savedColumnMappings.map((savedMapping) => (
                        <div
                          key={savedMapping.id}
                          className="flex items-center justify-between bg-white rounded-md p-2 border"
                        >
                          <span className="text-sm font-medium">
                            {savedMapping.name}
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadColumnMapping(savedMapping)}
                              className="h-7 text-xs"
                            >
                              Load
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                deleteColumnMapping(savedMapping.id)
                              }
                              className="h-7 text-xs text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Save new template */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Template name..."
                      value={newMappingName}
                      onChange={(e) => setNewMappingName(e.target.value)}
                      className="text-sm h-8"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveCurrentColumnMapping}
                      disabled={!newMappingName.trim()}
                      className="h-8 text-xs gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Save Current
                    </Button>
                  </div>

                  {savedColumnMappings.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No saved templates. Configure your mappings below and save
                      them for future use.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Column Mapping Fields */}
                {[
                  {
                    key: "fullName",
                    label: "Full Name",
                    icon: User,
                    required: true,
                  },
                  {
                    key: "nationality",
                    label: "Nationality/Delegation",
                    icon: Globe,
                    required: false,
                  },
                  {
                    key: "position",
                    label: "Position/Title",
                    icon: User,
                    required: false,
                  },
                  {
                    key: "documentNumber",
                    label: "Document Number",
                    icon: FileText,
                    required: false,
                  },
                  {
                    key: "category",
                    label: "Category",
                    icon: Filter,
                    required: false,
                  },
                  {
                    key: "terminal",
                    label: "Terminal",
                    icon: Building2,
                    required: false,
                  },
                  ...(mode === "arrival"
                    ? [
                        {
                          key: "arrivalDate",
                          label: "Arrival Date",
                          icon: Calendar,
                          required: true,
                        },
                        {
                          key: "arrivalTime",
                          label: "Arrival Time",
                          icon: Clock,
                          required: false,
                        },
                        {
                          key: "arrivalFlight",
                          label: "Arrival Flight",
                          icon: PlaneLanding,
                          required: true,
                        },
                      ]
                    : [
                        {
                          key: "departDate",
                          label: "Departure Date",
                          icon: Calendar,
                          required: true,
                        },
                        {
                          key: "departTime",
                          label: "Departure Time",
                          icon: Clock,
                          required: false,
                        },
                        {
                          key: "departFlight",
                          label: "Departure Flight",
                          icon: PlaneTakeoff,
                          required: true,
                        },
                      ]),
                  {
                    key: "hotel",
                    label: "Hotel",
                    icon: Hotel,
                    required: false,
                  },
                  {
                    key: "remarks",
                    label: "Remarks",
                    icon: FileText,
                    required: false,
                  },
                ].map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.key} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {field.label}
                        {field.required && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </Label>
                      <Select
                        value={
                          columnMapping[field.key as keyof ColumnMapping] ||
                          "none"
                        }
                        onValueChange={(value) => {
                          setColumnMapping((prev) => ({
                            ...prev,
                            [field.key]: value === "none" ? undefined : value,
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="-- Not mapped --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Not mapped --</SelectItem>
                          {columns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowMappingModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowMappingModal(false)}>
                Save Mappings
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Configuration Modal */}
        <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configure Message Output
              </DialogTitle>
              <DialogDescription>
                Customize which information to include in generated messages
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[60vh] pr-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="sections">
                  <AccordionTrigger className="text-base font-semibold">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Include Sections
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {[
                        {
                          key: "includeHeader",
                          label: "Header",
                          icon: FileText,
                        },
                        {
                          key: "includePassengers",
                          label: "Passengers List",
                          icon: Users,
                        },
                        {
                          key: "includePosition",
                          label: "Positions",
                          icon: User,
                        },
                        {
                          key: "includeNationality",
                          label: "Nationality",
                          icon: Globe,
                        },
                        {
                          key: "includeFlightInfo",
                          label: "Flight Info",
                          icon: Plane,
                        },
                        {
                          key: "includeTerminal",
                          label: "Terminal",
                          icon: Building2,
                        },
                        ...(mode === "arrival"
                          ? [
                              {
                                key: "includeHotel",
                                label: "Hotel",
                                icon: Hotel,
                              },
                              {
                                key: "includeBaggage",
                                label: "Baggage",
                                icon: Luggage,
                              },
                            ]
                          : []),
                        {
                          key: "includeRemarks",
                          label: "Remarks",
                          icon: FileText,
                        },
                      ].map((field) => {
                        const Icon = field.icon;
                        return (
                          <div
                            key={field.key}
                            className="flex items-center justify-between"
                          >
                            <Label
                              htmlFor={field.key}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Icon className="h-4 w-4" />
                              {field.label}
                            </Label>
                            <Switch
                              id={field.key}
                              checked={
                                messageConfig[
                                  field.key as keyof MessageConfig
                                ] as boolean
                              }
                              onCheckedChange={(checked) => {
                                setMessageConfig((prev) => ({
                                  ...prev,
                                  [field.key]: checked,
                                }));
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="template">
                  <AccordionTrigger className="text-base font-semibold">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Custom Template
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="use-custom-template"
                          className="cursor-pointer"
                        >
                          Use custom template
                        </Label>
                        <Switch
                          id="use-custom-template"
                          checked={messageConfig.useCustomTemplate}
                          onCheckedChange={(checked) => {
                            setMessageConfig((prev) => ({
                              ...prev,
                              useCustomTemplate: checked,
                            }));
                          }}
                        />
                      </div>

                      {messageConfig.useCustomTemplate && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Template Content</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMessageConfig((prev) => ({
                                  ...prev,
                                  customTemplate: DEFAULT_CUSTOM_TEMPLATE,
                                }));
                              }}
                              className="h-7 text-xs gap-1"
                            >
                              <X className="h-3 w-3" />
                              Reset to Default
                            </Button>
                          </div>
                          <Textarea
                            value={messageConfig.customTemplate}
                            onChange={(e) => {
                              setMessageConfig((prev) => ({
                                ...prev,
                                customTemplate: e.target.value,
                              }));
                            }}
                            placeholder="Enter your custom template..."
                            className="font-mono text-sm min-h-[200px]"
                          />
                          <div className="text-xs text-muted-foreground space-y-2">
                            <p className="font-semibold">
                              Available variables:
                            </p>
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium text-gray-700 mb-1">
                                  Basic Info:
                                </p>
                                <div className="grid grid-cols-2 gap-1 pl-2">
                                  <span>
                                    {`{{header}}`} - Arrival/Departure
                                  </span>
                                  <span>{`{{mode}}`} - arrival/departure</span>
                                  <span>{`{{date}}`} - Date</span>
                                  <span>{`{{time}}`} - Time</span>
                                </div>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 mb-1">
                                  Passengers:
                                </p>
                                <div className="grid grid-cols-2 gap-1 pl-2">
                                  <span>
                                    {`{{passengers}}`} - Numbered list
                                  </span>
                                  <span>
                                    {`{{passengersDetailed}}`} - Full details
                                  </span>
                                  <span>{`{{passengerCount}}`} - Count</span>
                                  <span>
                                    {`{{passengerNames}}`} - Names only
                                  </span>
                                  <span>
                                    {`{{positions}}`} - Positions list
                                  </span>
                                  <span>
                                    {`{{documentNumbers}}`} - Doc numbers
                                  </span>
                                  <span>{`{{category}}`} - Category</span>
                                  <span>
                                    {`{{categories}}`} - All categories
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 mb-1">
                                  Flight & Location:
                                </p>
                                <div className="grid grid-cols-2 gap-1 pl-2">
                                  <span>{`{{nationality}}`} - Delegation</span>
                                  <span>
                                    {`{{delegation}}`} - Same as above
                                  </span>
                                  <span>{`{{flight}}`} - Flight number</span>
                                  <span>
                                    {`{{flightTime}}`} - Flight | Time
                                  </span>
                                  <span>
                                    {`{{flightInfo}}`} - Full flight info
                                  </span>
                                  <span>{`{{terminal}}`} - Terminal</span>
                                  <span>{`{{hotel}}`} - Hotel name</span>
                                </div>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 mb-1">
                                  Other:
                                </p>
                                <div className="grid grid-cols-2 gap-1 pl-2">
                                  <span>{`{{baggage}}`} - Luggage info</span>
                                  <span>{`{{luggage}}`} - Same as above</span>
                                  <span>{`{{remarks}}`} - Remarks</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </ScrollArea>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowConfigModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowConfigModal(false)}>
                Save Configuration
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Export Options Modal */}
        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Options
              </DialogTitle>
              <DialogDescription>
                Configure how messages should be exported
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Group By</Label>
                <Select
                  value={exportConfig.groupBy}
                  onValueChange={(value: any) => {
                    setExportConfig((prev) => ({
                      ...prev,
                      groupBy: value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="terminal">Terminal</SelectItem>
                    <SelectItem value="flight">Flight</SelectItem>
                    <SelectItem value="nationality">Nationality</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Export Format</Label>
                <Select
                  value={exportConfig.exportFormat}
                  onValueChange={(value: any) => {
                    setExportConfig((prev) => ({
                      ...prev,
                      exportFormat: value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">
                      Single file (all messages)
                    </SelectItem>
                    <SelectItem value="individual">
                      Individual files (by group)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={downloadMessages} className="gap-2">
                <Download className="h-4 w-4" />
                Export Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Data Cleanup Modal */}
        <Dialog open={showCleanupModal} onOpenChange={setShowCleanupModal}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Data Cleanup Rules
              </DialogTitle>
              <DialogDescription>
                Define rules to clean and transform your data before processing.
                Rules are applied in order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Rules List */}
              <div className="space-y-3">
                {cleanupRules.map((rule, index) => (
                  <Card key={rule.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={rule.enabled ? "default" : "secondary"}
                          >
                            Rule {index + 1}
                          </Badge>
                          <Switch
                            checked={rule.enabled}
                            onCheckedChange={(checked) => {
                              setCleanupRules((prev) =>
                                prev.map((r) =>
                                  r.id === rule.id
                                    ? { ...r, enabled: checked }
                                    : r
                                )
                              );
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCleanupRules((prev) =>
                              prev.filter((r) => r.id !== rule.id)
                            );
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Rule Type</Label>
                          <Select
                            value={rule.type}
                            onValueChange={(value: any) => {
                              setCleanupRules((prev) =>
                                prev.map((r) =>
                                  r.id === rule.id ? { ...r, type: value } : r
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="replace">
                                Find & Replace
                              </SelectItem>
                              <SelectItem value="trim">Trim Spaces</SelectItem>
                              <SelectItem value="capitalize">
                                Capitalize Words
                              </SelectItem>
                              <SelectItem value="uppercase">
                                UPPERCASE
                              </SelectItem>
                              <SelectItem value="lowercase">
                                lowercase
                              </SelectItem>
                              <SelectItem value="prefix">Add Prefix</SelectItem>
                              <SelectItem value="suffix">Add Suffix</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Apply To</Label>
                          <Select
                            value={rule.applyTo}
                            onValueChange={(value: any) => {
                              setCleanupRules((prev) =>
                                prev.map((r) =>
                                  r.id === rule.id
                                    ? { ...r, applyTo: value }
                                    : r
                                )
                              );
                            }}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Fields</SelectItem>
                              {columns.map((col) => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Only show input fields for types that need them */}
                      {(rule.type === "replace" ||
                        rule.type === "prefix" ||
                        rule.type === "suffix") && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">
                              {rule.type === "replace"
                                ? "Find Text"
                                : rule.type === "prefix"
                                ? "Prefix"
                                : "Suffix"}
                            </Label>
                            <Input
                              value={rule.find}
                              onChange={(e) => {
                                setCleanupRules((prev) =>
                                  prev.map((r) =>
                                    r.id === rule.id
                                      ? { ...r, find: e.target.value }
                                      : r
                                  )
                                );
                              }}
                              placeholder={
                                rule.type === "replace"
                                  ? "e.g., Ministerial*"
                                  : "e.g., Mr. "
                              }
                              className="text-sm"
                            />
                          </div>

                          {rule.type === "replace" && (
                            <div className="space-y-2">
                              <Label className="text-xs">Replace With</Label>
                              <Input
                                value={rule.replace}
                                onChange={(e) => {
                                  setCleanupRules((prev) =>
                                    prev.map((r) =>
                                      r.id === rule.id
                                        ? { ...r, replace: e.target.value }
                                        : r
                                    )
                                  );
                                }}
                                placeholder="e.g., Ministerial"
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Example */}
                      {(rule.type === "replace" ||
                        rule.type === "prefix" ||
                        rule.type === "suffix") &&
                        rule.find && (
                          <div className="text-xs bg-gray-50 p-2 rounded border">
                            <span className="text-gray-600">Example: </span>
                            {rule.type === "replace" && (
                              <span>
                                "
                                <span className="line-through text-red-600">
                                  {rule.find}
                                </span>
                                " → "
                                <span className="text-green-600">
                                  {rule.replace}
                                </span>
                                "
                              </span>
                            )}
                            {rule.type === "prefix" && (
                              <span>
                                "John" → "
                                <span className="text-green-600">
                                  {rule.find}John
                                </span>
                                "
                              </span>
                            )}
                            {rule.type === "suffix" && (
                              <span>
                                "John" → "
                                <span className="text-green-600">
                                  John{rule.find}
                                </span>
                                "
                              </span>
                            )}
                          </div>
                        )}

                      {/* Examples for transformation rules */}
                      {(rule.type === "trim" ||
                        rule.type === "capitalize" ||
                        rule.type === "uppercase" ||
                        rule.type === "lowercase") && (
                        <div className="text-xs bg-gray-50 p-2 rounded border">
                          <span className="text-gray-600">Example: </span>
                          {rule.type === "trim" && (
                            <span>
                              "<span className="bg-yellow-100"> John Doe </span>
                              " → "
                              <span className="text-green-600">John Doe</span>"
                            </span>
                          )}
                          {rule.type === "capitalize" && (
                            <span>
                              "<span className="text-red-600">john doe</span>" →
                              "<span className="text-green-600">John Doe</span>"
                            </span>
                          )}
                          {rule.type === "uppercase" && (
                            <span>
                              "<span className="text-red-600">John Doe</span>" →
                              "<span className="text-green-600">JOHN DOE</span>"
                            </span>
                          )}
                          {rule.type === "lowercase" && (
                            <span>
                              "<span className="text-red-600">John Doe</span>" →
                              "<span className="text-green-600">john doe</span>"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Add Rule Button */}
              <Button
                variant="outline"
                onClick={() => {
                  const newRule: CleanupRule = {
                    id: Date.now().toString(),
                    type: "replace",
                    find: "",
                    replace: "",
                    applyTo: "all",
                    enabled: true,
                  };
                  setCleanupRules((prev) => [...prev, newRule]);
                }}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add New Rule
              </Button>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-blue-900 mb-1">Tips:</p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>
                    • Find & Replace matches exact text (e.g., "Ministerial*"
                    will match literal asterisks)
                  </li>
                  <li>
                    • Transformation rules (Trim, Capitalize, UPPERCASE,
                    lowercase) don't need input values
                  </li>
                  <li>• Rules are applied in order from top to bottom</li>
                  <li>• Disable rules temporarily using the toggle switch</li>
                  <li>
                    • Prefix/Suffix rules only add text if it's not already
                    present
                  </li>
                  <li>
                    • Apply rules to "All Fields" or select specific columns
                    from your Excel file
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCleanupModal(false)}
              >
                Close
              </Button>
              <div className="text-sm text-gray-600">
                {cleanupRules.filter((r) => r.enabled).length} active rule(s)
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <footer className="text-center py-6 sm:py-8">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1.5">
              Made with{" "}
              <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-red-500 text-red-500" />{" "}
              by <span className="font-semibold text-black">Ahmed</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
