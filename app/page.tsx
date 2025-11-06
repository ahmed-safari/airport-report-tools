// Airport Reports Tools - Professional Edition
// Advanced Excel processing with full customization

"use client";

import { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
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

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ExcelData = {
  [key: string]: any;
}[];

type ColumnMapping = {
  fullName?: string;
  nationality?: string;
  position?: string;
  documentNumber?: string;
  category?: string;
  terminal?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  arrivalFlight?: string;
  departDate?: string;
  departTime?: string;
  departFlight?: string;
  hotel?: string;
  remarks?: string;
};

type MessageTemplate = {
  id: string;
  name: string;
  template: string;
};

type ExportConfig = {
  groupBy: "date" | "terminal" | "flight" | "nationality";
  exportFormat: "single" | "individual";
};

type MessageConfig = {
  includeHeader: boolean;
  includePassengers: boolean;
  includePosition: boolean;
  includeNationality: boolean;
  includeFlightInfo: boolean;
  includeTerminal: boolean;
  includeHotel: boolean;
  includeBaggage: boolean;
  includeRemarks: boolean;
  customTemplate: string;
  useCustomTemplate: boolean;
};

type ProcessedMessage = {
  date: string;
  time: string;
  flight: string;
  nationality: string;
  terminal: string;
  hotel: string;
  passengers: Array<{
    name: string;
    position: string;
    remarks: string;
  }>;
  message: string;
};

type CellDifference = {
  sheet: string;
  cell: string;
  file1Value: any;
  file2Value: any;
};

type CleanupRule = {
  id: string;
  type: "replace" | "prefix" | "suffix";
  find: string;
  replace: string;
  applyTo: "all" | "fullName" | "nationality" | "position" | "remarks";
  enabled: boolean;
};

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

  // Processing states
  const [mode, setMode] = useState<"arrival" | "departure">("arrival");
  const [selectedDate, setSelectedDate] = useState<string | "all">("all");
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
    customTemplate: `🛬 {{header}}

👥 Passenger(s): {{passengerCount}}
{{passengers}}

🌍 Delegation: {{nationality}}
✈️ {{flightTime}}
🏢 Terminal: {{terminal}}
🏨 Hotel: {{hotel}}
💼 Luggage: {{baggage}}
📝 Remarks: {{remarks}}`,
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

  // ============================================================================
  // DATA CLEANUP FUNCTIONS
  // ============================================================================

  const applyCleanupRules = (
    value: string,
    field: keyof ColumnMapping
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
            // Support for wildcards (*)
            if (rule.find.includes("*")) {
              const pattern = rule.find.replace(/\*/g, ".*");
              const regex = new RegExp(pattern, "gi");
              cleaned = cleaned.replace(regex, rule.replace);
            } else {
              // Simple string replacement
              const regex = new RegExp(rule.find, "gi");
              cleaned = cleaned.replace(regex, rule.replace);
            }
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

      // Filter by date if selected
      let filteredData = [...excelData];
      if (selectedDate !== "all" && dateField) {
        filteredData = filteredData.filter((row) => {
          const dateValue = row[dateField];
          if (!dateValue) return false;

          let date: Date | null = null;
          if (typeof dateValue === "number") {
            date = new Date((dateValue - 25569) * 86400 * 1000);
          } else {
            date = new Date(dateValue);
          }

          return date && date.toISOString().split("T")[0] === selectedDate;
        });
      }

      // Group by flight, nationality, terminal, hotel
      const groups: Record<string, any[]> = {};

      filteredData.forEach((row) => {
        const flight = flightField ? row[flightField] || "TBD" : "TBD";
        const nationality = applyCleanupRules(
          columnMapping.nationality ? row[columnMapping.nationality] || "" : "",
          "nationality"
        );
        const terminal = columnMapping.terminal
          ? row[columnMapping.terminal] || "VIP"
          : "VIP";
        const hotel = columnMapping.hotel ? row[columnMapping.hotel] || "" : "";

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
            "fullName"
          ),
          position: applyCleanupRules(
            columnMapping.position ? row[columnMapping.position] || "" : "",
            "position"
          ),
          remarks: applyCleanupRules(
            columnMapping.remarks ? row[columnMapping.remarks] || "" : "",
            "remarks"
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

          // Individual passenger details
          const passengerNames = passengers.map((p: any) => p.name).join(", ");
          template = template.replace(
            /\{\{passengerNames\}\}/g,
            passengerNames
          );

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
      // Single file with all messages
      const content = messagesToExport
        .map((m) => m.message)
        .join("\n\n" + "─".repeat(50) + "\n\n");

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
    setComparisonComplete(false);

    try {
      const data1 = await file1.arrayBuffer();
      const data2 = await file2.arrayBuffer();

      const workbook1 = XLSX.read(data1);
      const workbook2 = XLSX.read(data2);

      const foundDifferences: CellDifference[] = [];

      const formatCellForDisplay = (cell: any) => {
        if (!cell || cell.v === undefined) return "";
        if (cell.t === "n") {
          const value = cell.v;
          if (value > 0 && value < 1) {
            const totalMinutes = value * 24 * 60;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);
            return `${String(hours).padStart(2, "0")}:${String(
              minutes
            ).padStart(2, "0")}`;
          }
          if (value >= 1 && value < 60000) {
            try {
              const date = XLSX.SSF.parse_date_code(value);
              if (date && date.y > 1900) {
                return `${String(date.m).padStart(2, "0")}/${String(
                  date.d
                ).padStart(2, "0")}/${String(date.y).slice(-2)}`;
              }
            } catch (e) {
              return value;
            }
          }
        }
        return cell.v;
      };

      const allSheets = new Set([
        ...workbook1.SheetNames,
        ...workbook2.SheetNames,
      ]);

      allSheets.forEach((sheetName) => {
        const sheet1 = workbook1.Sheets[sheetName];
        const sheet2 = workbook2.Sheets[sheetName];

        if (!sheet1 || !sheet2) return;

        const cells1 = Object.keys(sheet1).filter((key) => key[0] !== "!");
        const cells2 = Object.keys(sheet2).filter((key) => key[0] !== "!");
        const allCells = new Set([...cells1, ...cells2]);

        allCells.forEach((cell) => {
          const cellObj1 = sheet1[cell];
          const cellObj2 = sheet2[cell];

          const value1 = cellObj1?.v;
          const value2 = cellObj2?.v;

          if (
            value1 !== undefined &&
            value2 !== undefined &&
            value1 !== value2
          ) {
            foundDifferences.push({
              sheet: sheetName,
              cell,
              file1Value: formatCellForDisplay(cellObj1),
              file2Value: formatCellForDisplay(cellObj2),
            });
          }
        });
      });

      setDifferences(foundDifferences);
      setComparisonComplete(true);
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
          <p className="text-gray-600 text-sm sm:text-base">
            Professional Excel processing with advanced customization
          </p>
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
                <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
                  {/* Mode Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm sm:text-base font-semibold flex items-center gap-2">
                      <Plane className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Operation Mode
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      <Button
                        variant={mode === "arrival" ? "default" : "outline"}
                        onClick={() => setMode("arrival")}
                        className="w-full justify-center sm:justify-start gap-2 h-10 sm:h-11"
                      >
                        <PlaneLanding className="h-4 w-4" />
                        <span className="text-sm">Arrival Messages</span>
                      </Button>
                      <Button
                        variant={mode === "departure" ? "default" : "outline"}
                        onClick={() => setMode("departure")}
                        className="w-full justify-center sm:justify-start gap-2 h-10 sm:h-11"
                      >
                        <PlaneTakeoff className="h-4 w-4" />
                        <span className="text-sm">Departure Messages</span>
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* File Upload */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="excel-file"
                      className="text-sm sm:text-base font-semibold flex items-center gap-2"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Excel File
                    </Label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                      <Input
                        id="excel-file"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setExcelFile(file);
                            await readExcelFile(file);
                          }
                        }}
                        className="cursor-pointer text-sm"
                      />
                      {excelFile && (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 w-fit"
                        >
                          <Check className="h-3 w-3" />
                          <span className="text-xs">Loaded</span>
                        </Badge>
                      )}
                    </div>
                    {excelFile && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs sm:text-sm text-green-800 flex items-start gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span className="break-all">
                            <span className="font-semibold">
                              {excelFile.name}
                            </span>
                            <br />
                            <span className="text-green-600">
                              {excelData.length} rows • {columns.length} columns
                            </span>
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Date Filter */}
                  {availableDates.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <Label className="text-sm sm:text-base font-semibold flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Filter by Date
                        </Label>
                        <Select
                          value={selectedDate}
                          onValueChange={setSelectedDate}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              All Dates ({availableDates.length})
                            </SelectItem>
                            {availableDates.map((date) => (
                              <SelectItem key={date} value={date}>
                                {new Date(
                                  date + "T00:00:00"
                                ).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <Dialog
                      open={showMappingModal}
                      onOpenChange={setShowMappingModal}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={!excelData.length}
                          className="w-full gap-2 h-10 sm:h-11 text-sm"
                        >
                          <Map className="h-4 w-4" />
                          Map Columns
                        </Button>
                      </DialogTrigger>
                    </Dialog>

                    <Dialog
                      open={showConfigModal}
                      onOpenChange={setShowConfigModal}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={!excelData.length}
                          className="w-full gap-2 h-10 sm:h-11 text-sm"
                        >
                          <Settings className="h-4 w-4" />
                          Configure Output
                        </Button>
                      </DialogTrigger>
                    </Dialog>

                    <Dialog
                      open={showCleanupModal}
                      onOpenChange={setShowCleanupModal}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={!excelData.length}
                          className="w-full gap-2 h-10 sm:h-11 text-sm"
                        >
                          <Sparkles className="h-4 w-4" />
                          Data Cleanup
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={processMessages}
                    disabled={!excelData.length || isProcessing}
                    className="w-full h-12 sm:h-14 text-sm sm:text-base gap-2 bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all disabled:bg-gray-300 disabled:text-gray-500"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span>Generate Messages</span>
                      </>
                    )}
                  </Button>
                </CardContent>
              </TabsContent>
              <TabsContent
                value="compare"
                className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
              >
                <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
                  {/* Compare Tab Content */}
                  <div className="space-y-3">
                    <Label
                      htmlFor="file1"
                      className="text-sm sm:text-base font-semibold flex items-center gap-2"
                    >
                      <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      First File
                    </Label>
                    <Input
                      id="file1"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setFile1(e.target.files?.[0] || null)}
                      className="cursor-pointer text-sm"
                    />
                    {file1 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                        <p className="text-xs sm:text-sm text-green-800 flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="break-all">{file1.name}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="file2"
                      className="text-sm sm:text-base font-semibold flex items-center gap-2"
                    >
                      <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Second File
                    </Label>
                    <Input
                      id="file2"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setFile2(e.target.files?.[0] || null)}
                      className="cursor-pointer text-sm"
                    />
                    {file2 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                        <p className="text-xs sm:text-sm text-green-800 flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span className="break-all">{file2.name}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={compareExcelFiles}
                    disabled={!file1 || !file2 || isProcessing}
                    className="w-full h-12 sm:h-14 text-sm sm:text-base gap-2 bg-black hover:bg-gray-800 text-white shadow-lg hover:shadow-xl transition-all disabled:bg-gray-300 disabled:text-gray-500"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Comparing...</span>
                      </>
                    ) : (
                      <>
                        <GitCompare className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span>Compare Excel Sheets</span>
                      </>
                    )}
                  </Button>

                  {/* Comparison Results */}
                  {comparisonComplete && (
                    <Card className="border-2 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          {differences.length === 0 ? (
                            <>
                              <Check className="h-5 w-5 text-green-600" />
                              <span>Files are identical</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-5 w-5 text-orange-600" />
                              <span className="text-sm sm:text-base">
                                Found {differences.length} differences
                              </span>
                            </>
                          )}
                        </CardTitle>
                      </CardHeader>
                      {differences.length > 0 && (
                        <CardContent>
                          <ScrollArea className="h-96 w-full rounded-md border">
                            <div className="p-4">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-2 font-semibold">
                                      Sheet
                                    </th>
                                    <th className="text-left p-2 font-semibold">
                                      Cell
                                    </th>
                                    <th className="text-left p-2 font-semibold">
                                      Old Value
                                    </th>
                                    <th className="text-left p-2 font-semibold">
                                      New Value
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {differences.map((diff, idx) => (
                                    <tr
                                      key={idx}
                                      className="border-b hover:bg-muted/50"
                                    >
                                      <td className="p-2 text-sm">
                                        {diff.sheet}
                                      </td>
                                      <td className="p-2 text-sm font-mono">
                                        {diff.cell}
                                      </td>
                                      <td className="p-2 text-sm">
                                        {String(diff.file1Value)}
                                      </td>
                                      <td className="p-2 text-sm font-semibold text-blue-600">
                                        {String(diff.file2Value)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </ScrollArea>
                        </CardContent>
                      )}
                    </Card>
                  )}
                </CardContent>
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
                          <Label>Template Content</Label>
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
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p className="font-semibold">
                              Available variables:
                            </p>
                            <div className="grid grid-cols-2 gap-1 pl-2">
                              <span>{`{{header}}`} - Arrival/Departure</span>
                              <span>{`{{mode}}`} - arrival/departure</span>
                              <span>{`{{date}}`} - Date</span>
                              <span>{`{{time}}`} - Time</span>
                              <span>{`{{passengers}}`} - Numbered list</span>
                              <span>{`{{passengerCount}}`} - Count</span>
                              <span>{`{{passengerNames}}`} - Names</span>
                              <span>{`{{nationality}}`} - Delegation</span>
                              <span>{`{{flight}}`} - Flight number</span>
                              <span>{`{{flightTime}}`} - Flight | Time</span>
                              <span>{`{{terminal}}`} - Terminal</span>
                              <span>{`{{hotel}}`} - Hotel name</span>
                              <span>{`{{baggage}}`} - Luggage info</span>
                              <span>{`{{remarks}}`} - Remarks</span>
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
                              <SelectItem value="fullName">
                                Full Name
                              </SelectItem>
                              <SelectItem value="nationality">
                                Nationality
                              </SelectItem>
                              <SelectItem value="position">Position</SelectItem>
                              <SelectItem value="remarks">Remarks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs">
                            {rule.type === "replace"
                              ? "Find (supports *)"
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

                      {/* Example */}
                      {rule.find && (
                        <div className="text-xs bg-gray-50 p-2 rounded border">
                          <span className="text-gray-600">Example: </span>
                          {rule.type === "replace" && (
                            <span>
                              "
                              <span className="line-through text-red-600">
                                {rule.find.replace(/\*/g, "xyz")}
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
                    • Use <code className="bg-blue-100 px-1 rounded">*</code> as
                    wildcard in Find & Replace (e.g., "Ministerial*" matches
                    "Ministerial123")
                  </li>
                  <li>• Rules are applied in order from top to bottom</li>
                  <li>• Disable rules temporarily using the toggle switch</li>
                  <li>
                    • Prefix/Suffix rules only add text if it's not already
                    present
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
