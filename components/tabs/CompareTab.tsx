"use client";

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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PlaneLanding,
  PlaneTakeoff,
  FileText,
  Map,
  Check,
  Calendar,
  Upload,
  GitCompare,
  Sparkles,
  Filter,
  Plus,
  Trash2,
  X,
  User,
  Building2,
} from "lucide-react";

import type {
  GuestComparison,
  CleanupRule,
  CompareColumnMapping,
  SavedCompareMapping,
  CompareConfig,
} from "@/lib/types";

interface CompareTabProps {
  // File states
  file1: File | null;
  setFile1: (file: File | null) => void;
  file2: File | null;
  setFile2: (file: File | null) => void;

  // Column states
  columnsFile1: string[];
  setColumnsFile1: (cols: string[]) => void;
  columnsFile2: string[];
  setColumnsFile2: (cols: string[]) => void;

  // Mapping states
  compareMappingFile1: CompareColumnMapping;
  setCompareMappingFile1: (
    mapping:
      | CompareColumnMapping
      | ((prev: CompareColumnMapping) => CompareColumnMapping)
  ) => void;
  compareMappingFile2: CompareColumnMapping;
  setCompareMappingFile2: (
    mapping:
      | CompareColumnMapping
      | ((prev: CompareColumnMapping) => CompareColumnMapping)
  ) => void;

  // Config
  compareConfig: CompareConfig;
  setCompareConfig: (
    config: CompareConfig | ((prev: CompareConfig) => CompareConfig)
  ) => void;
  cleanupRules: CleanupRule[];

  // Saved mappings
  savedCompareMappings: SavedCompareMapping[];
  setSavedCompareMappings: (
    mappings:
      | SavedCompareMapping[]
      | ((prev: SavedCompareMapping[]) => SavedCompareMapping[])
  ) => void;
  newCompareMappingName: string;
  setNewCompareMappingName: (name: string) => void;

  // Filter states
  compareFilterDates: string[];
  setCompareFilterDates: (
    dates: string[] | ((prev: string[]) => string[])
  ) => void;
  compareFilterTerminals: string[];
  setCompareFilterTerminals: (
    terminals: string[] | ((prev: string[]) => string[])
  ) => void;
  compareFilterStatuses: string[];
  setCompareFilterStatuses: (
    statuses: string[] | ((prev: string[]) => string[])
  ) => void;

  // Results
  guestComparisons: GuestComparison[];
  comparisonComplete: boolean;

  // UI states
  isProcessing: boolean;
  showCompareMappingModal: boolean;
  setShowCompareMappingModal: (show: boolean) => void;
  showCleanupModal: boolean;
  setShowCleanupModal: (show: boolean) => void;

  // Functions
  compareExcelFiles: () => Promise<void>;
}

export function CompareTab({
  file1,
  setFile1,
  file2,
  setFile2,
  columnsFile1,
  setColumnsFile1,
  columnsFile2,
  setColumnsFile2,
  compareMappingFile1,
  setCompareMappingFile1,
  compareMappingFile2,
  setCompareMappingFile2,
  compareConfig,
  setCompareConfig,
  savedCompareMappings,
  setSavedCompareMappings,
  newCompareMappingName,
  setNewCompareMappingName,
  compareFilterDates,
  setCompareFilterDates,
  compareFilterTerminals,
  setCompareFilterTerminals,
  compareFilterStatuses,
  setCompareFilterStatuses,
  guestComparisons,
  comparisonComplete,
  isProcessing,
  showCompareMappingModal,
  setShowCompareMappingModal,
  showCleanupModal,
  setShowCleanupModal,
  compareExcelFiles,
}: CompareTabProps) {
  const handleFile1Change = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile1(f);
    if (f) {
      try {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.SheetNames[0];
        const ws = wb.Sheets[sheet];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const cols = json.length ? Object.keys(json[0] as any) : [];
        setColumnsFile1(cols);
      } catch (err) {
        console.error("Failed to read file1 columns", err);
        setColumnsFile1([]);
      }
    } else {
      setColumnsFile1([]);
    }
  };

  const handleFile2Change = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile2(f);
    if (f) {
      try {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.SheetNames[0];
        const ws = wb.Sheets[sheet];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        const cols = json.length ? Object.keys(json[0] as any) : [];
        setColumnsFile2(cols);
      } catch (err) {
        console.error("Failed to read file2 columns", err);
        setColumnsFile2([]);
      }
    } else {
      setColumnsFile2([]);
    }
  };

  // Field label mapping
  const fieldLabels: Record<string, string> = {
    fullName: "Name",
    documentNumber: "Document #",
    nationality: "Nationality",
    position: "Position",
    terminal: "Terminal",
    hotel: "Hotel",
    remarks: "Remarks",
    arrivalDate: "Arrival Date",
    arrivalTime: "Arrival Time",
    arrivalFlight: "Arrival Flight",
    departDate: "Depart Date",
    departTime: "Depart Time",
    departFlight: "Depart Flight",
  };

  return (
    <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6">
      {/* File Upload Section */}
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
          onChange={handleFile1Change}
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
          onChange={handleFile2Change}
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

      <Separator />

      {/* Map Columns Button */}
      <div className="pt-1">
        <Dialog
          open={showCompareMappingModal}
          onOpenChange={setShowCompareMappingModal}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              disabled={!file1 || !file2}
              className="w-full gap-2 h-10 sm:h-11 text-sm"
            >
              <Map className="h-4 w-4" />
              Map Compare Columns
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] sm:max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Map Compare Columns
              </DialogTitle>
              <DialogDescription>
                Map columns from each file for comparison. Only mapped and
                selected fields will be compared.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-2 sm:pr-4">
              <div className="space-y-6">
                {/* Saved Presets */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Saved Mapping Presets
                  </Label>
                  {savedCompareMappings.length > 0 && (
                    <div className="space-y-2">
                      {savedCompareMappings.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between bg-white rounded-md p-2 border"
                        >
                          <span className="text-sm font-medium">
                            {preset.name}
                          </span>
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCompareMappingFile1(preset.mappingFile1);
                              }}
                              className="h-7 text-xs"
                              title="Load this preset's mapping for File 1"
                            >
                              → File 1
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCompareMappingFile2(preset.mappingFile1);
                              }}
                              className="h-7 text-xs"
                              title="Load this preset's mapping for File 2"
                            >
                              → File 2
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setCompareMappingFile1(preset.mappingFile1);
                                setCompareMappingFile2(preset.mappingFile2);
                                setCompareConfig((prev) => ({
                                  ...prev,
                                  fieldsToCompare: preset.fieldsToCompare,
                                }));
                              }}
                              className="h-7 text-xs"
                              title="Load both file mappings and settings"
                            >
                              Load All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setSavedCompareMappings((prev) =>
                                  prev.filter((p) => p.id !== preset.id)
                                )
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
                  <div className="flex gap-2">
                    <Input
                      placeholder="Preset name..."
                      value={newCompareMappingName}
                      onChange={(e) => setNewCompareMappingName(e.target.value)}
                      className="text-sm h-8"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!newCompareMappingName.trim()) return;
                        setSavedCompareMappings((prev) => [
                          ...prev,
                          {
                            id: Date.now().toString(),
                            name: newCompareMappingName.trim(),
                            mappingFile1: { ...compareMappingFile1 },
                            mappingFile2: { ...compareMappingFile2 },
                            fieldsToCompare: [...compareConfig.fieldsToCompare],
                          },
                        ]);
                        setNewCompareMappingName("");
                      }}
                      disabled={!newCompareMappingName.trim()}
                      className="h-8 text-xs gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Save Current
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Match Settings */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Match Passengers By
                  </Label>
                  <Select
                    value={compareConfig.matchBy}
                    onValueChange={(v: "name" | "documentNumber" | "both") =>
                      setCompareConfig((prev) => ({ ...prev, matchBy: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">
                        Document Number or Name
                      </SelectItem>
                      <SelectItem value="documentNumber">
                        Document Number Only
                      </SelectItem>
                      <SelectItem value="name">Name Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Fields to Compare */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">
                    Fields to Compare
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: "fullName", label: "Name" },
                      { key: "nationality", label: "Nationality" },
                      { key: "position", label: "Position" },
                      { key: "documentNumber", label: "Document #" },
                      { key: "terminal", label: "Terminal" },
                      { key: "hotel", label: "Hotel" },
                      { key: "remarks", label: "Remarks" },
                      { key: "arrivalDate", label: "Arrival Date" },
                      { key: "arrivalTime", label: "Arrival Time" },
                      { key: "arrivalFlight", label: "Arrival Flight" },
                      { key: "departDate", label: "Depart Date" },
                      { key: "departTime", label: "Depart Time" },
                      { key: "departFlight", label: "Depart Flight" },
                    ].map((f) => (
                      <div key={f.key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`compare-field-${f.key}`}
                          checked={compareConfig.fieldsToCompare.includes(
                            f.key
                          )}
                          onCheckedChange={(checked) => {
                            setCompareConfig((prev) => ({
                              ...prev,
                              fieldsToCompare: checked
                                ? [...prev.fieldsToCompare, f.key]
                                : prev.fieldsToCompare.filter(
                                    (x) => x !== f.key
                                  ),
                            }));
                          }}
                        />
                        <Label
                          htmlFor={`compare-field-${f.key}`}
                          className="text-sm cursor-pointer"
                        >
                          {f.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Column Mappings */}
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">
                    Column Mappings
                  </Label>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Headers */}
                    <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600">
                      <span>Field</span>
                      <span
                        className="truncate"
                        title={file1?.name || "File 1"}
                      >
                        📄 {file1?.name || "File 1"}
                      </span>
                      <span
                        className="truncate"
                        title={file2?.name || "File 2"}
                      >
                        📄 {file2?.name || "File 2"}
                      </span>
                    </div>

                    {/* Common Fields */}
                    {[
                      { key: "fullName", label: "Full Name", required: true },
                      { key: "documentNumber", label: "Document Number" },
                      { key: "nationality", label: "Nationality" },
                      { key: "position", label: "Position" },
                      { key: "terminal", label: "Terminal" },
                      { key: "hotel", label: "Hotel" },
                      { key: "remarks", label: "Remarks" },
                    ].map((f) => (
                      <div
                        key={f.key}
                        className="grid grid-cols-3 gap-2 items-center"
                      >
                        <Label className="flex items-center gap-2 text-sm">
                          {f.label}
                          {f.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </Label>
                        <Select
                          value={
                            compareMappingFile1[
                              f.key as keyof CompareColumnMapping
                            ] || "none"
                          }
                          onValueChange={(v) =>
                            setCompareMappingFile1((prev) => ({
                              ...prev,
                              [f.key]: v === "none" ? undefined : v,
                            }))
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              -- Not mapped --
                            </SelectItem>
                            {columnsFile1.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={
                            compareMappingFile2[
                              f.key as keyof CompareColumnMapping
                            ] || "none"
                          }
                          onValueChange={(v) =>
                            setCompareMappingFile2((prev) => ({
                              ...prev,
                              [f.key]: v === "none" ? undefined : v,
                            }))
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              -- Not mapped --
                            </SelectItem>
                            {columnsFile2.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}

                    {/* Arrival Fields */}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        Arrival Fields
                      </p>
                    </div>
                    {[
                      { key: "arrivalDate", label: "Arrival Date" },
                      { key: "arrivalTime", label: "Arrival Time" },
                      { key: "arrivalFlight", label: "Arrival Flight" },
                    ].map((f) => (
                      <div
                        key={f.key}
                        className="grid grid-cols-3 gap-2 items-center"
                      >
                        <Label className="text-sm">{f.label}</Label>
                        <Select
                          value={
                            compareMappingFile1[
                              f.key as keyof CompareColumnMapping
                            ] || "none"
                          }
                          onValueChange={(v) =>
                            setCompareMappingFile1((prev) => ({
                              ...prev,
                              [f.key]: v === "none" ? undefined : v,
                            }))
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              -- Not mapped --
                            </SelectItem>
                            {columnsFile1.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={
                            compareMappingFile2[
                              f.key as keyof CompareColumnMapping
                            ] || "none"
                          }
                          onValueChange={(v) =>
                            setCompareMappingFile2((prev) => ({
                              ...prev,
                              [f.key]: v === "none" ? undefined : v,
                            }))
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              -- Not mapped --
                            </SelectItem>
                            {columnsFile2.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}

                    {/* Departure Fields */}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">
                        Departure Fields
                      </p>
                    </div>
                    {[
                      { key: "departDate", label: "Departure Date" },
                      { key: "departTime", label: "Departure Time" },
                      { key: "departFlight", label: "Departure Flight" },
                    ].map((f) => (
                      <div
                        key={f.key}
                        className="grid grid-cols-3 gap-2 items-center"
                      >
                        <Label className="text-sm">{f.label}</Label>
                        <Select
                          value={
                            compareMappingFile1[
                              f.key as keyof CompareColumnMapping
                            ] || "none"
                          }
                          onValueChange={(v) =>
                            setCompareMappingFile1((prev) => ({
                              ...prev,
                              [f.key]: v === "none" ? undefined : v,
                            }))
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              -- Not mapped --
                            </SelectItem>
                            {columnsFile1.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={
                            compareMappingFile2[
                              f.key as keyof CompareColumnMapping
                            ] || "none"
                          }
                          onValueChange={(v) =>
                            setCompareMappingFile2((prev) => ({
                              ...prev,
                              [f.key]: v === "none" ? undefined : v,
                            }))
                          }
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              -- Not mapped --
                            </SelectItem>
                            {columnsFile2.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCompareMappingModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={() => setShowCompareMappingModal(false)}>
                Save Mapping
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Data Cleanup Button */}
      <Dialog open={showCleanupModal} onOpenChange={setShowCleanupModal}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            disabled={!file1 || !file2}
            className="w-full gap-2 h-10 sm:h-11 text-sm"
          >
            <Sparkles className="h-4 w-4" />
            Data Cleanup Rules
          </Button>
        </DialogTrigger>
      </Dialog>

      {/* Compare Button */}
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
            <span>Compare Files</span>
          </>
        )}
      </Button>

      {/* Comparison Results */}
      {comparisonComplete && (
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <GitCompare className="h-5 w-5" />
              <span>Comparison Results</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {file1?.name} vs {file2?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {guestComparisons.filter((g) => g.status === "match").length}
                </p>
                <p className="text-xs text-green-600">Matching</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-700">
                  {
                    guestComparisons.filter((g) => g.status === "different")
                      .length
                  }
                </p>
                <p className="text-xs text-orange-600">Different</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-700">
                  {
                    guestComparisons.filter((g) => g.status === "only-file1")
                      .length
                  }
                </p>
                <p className="text-xs text-red-600">Only in File 1</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {
                    guestComparisons.filter((g) => g.status === "only-file2")
                      .length
                  }
                </p>
                <p className="text-xs text-blue-600">Only in File 2</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Status Filter */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-sm gap-1">
                    <Filter className="h-3.5 w-3.5" />
                    Status{" "}
                    {compareFilterStatuses.length > 0 &&
                      `(${compareFilterStatuses.length})`}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Filter by Status</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {[
                      {
                        value: "match",
                        label: "Matching",
                        color: "text-green-600",
                      },
                      {
                        value: "different",
                        label: "Different",
                        color: "text-orange-600",
                      },
                      {
                        value: "only-file1",
                        label: "Only in File 1",
                        color: "text-red-600",
                      },
                      {
                        value: "only-file2",
                        label: "Only in File 2",
                        color: "text-blue-600",
                      },
                    ].map((s) => (
                      <div
                        key={s.value}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`status-${s.value}`}
                          checked={compareFilterStatuses.includes(s.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCompareFilterStatuses((prev) => [
                                ...prev,
                                s.value,
                              ]);
                            } else {
                              setCompareFilterStatuses((prev) =>
                                prev.filter((x) => x !== s.value)
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`status-${s.value}`}
                          className={`cursor-pointer ${s.color}`}
                        >
                          {s.label}
                        </Label>
                      </div>
                    ))}
                    <div className="pt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setCompareFilterStatuses([
                            "match",
                            "different",
                            "only-file1",
                            "only-file2",
                          ])
                        }
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCompareFilterStatuses([])}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Terminal Filter */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-sm gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    Terminal{" "}
                    {compareFilterTerminals.length > 0 &&
                      `(${compareFilterTerminals.length})`}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Filter by Terminal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {[
                      ...new Set([
                        ...guestComparisons
                          .map((g) => g.file1Data.terminal)
                          .filter(Boolean),
                        ...guestComparisons
                          .map((g) => g.file2Data.terminal)
                          .filter(Boolean),
                      ]),
                    ].map((t) => (
                      <div key={t} className="flex items-center space-x-2">
                        <Checkbox
                          id={`terminal-${t}`}
                          checked={compareFilterTerminals.includes(t)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCompareFilterTerminals((prev) => [...prev, t]);
                            } else {
                              setCompareFilterTerminals((prev) =>
                                prev.filter((x) => x !== t)
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`terminal-${t}`}
                          className="cursor-pointer"
                        >
                          {t}
                        </Label>
                      </div>
                    ))}
                    <div className="pt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const allTerminals = [
                            ...new Set([
                              ...guestComparisons
                                .map((g) => g.file1Data.terminal)
                                .filter(Boolean),
                              ...guestComparisons
                                .map((g) => g.file2Data.terminal)
                                .filter(Boolean),
                            ]),
                          ];
                          setCompareFilterTerminals(allTerminals);
                        }}
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCompareFilterTerminals([])}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Date Filter */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-sm gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Date{" "}
                    {compareFilterDates.length > 0 &&
                      `(${compareFilterDates.length})`}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Filter by Date</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {[
                      ...new Set([
                        ...guestComparisons
                          .map((g) => g.file1Data.arrivalDate)
                          .filter(Boolean),
                        ...guestComparisons
                          .map((g) => g.file2Data.arrivalDate)
                          .filter(Boolean),
                        ...guestComparisons
                          .map((g) => g.file1Data.departDate)
                          .filter(Boolean),
                        ...guestComparisons
                          .map((g) => g.file2Data.departDate)
                          .filter(Boolean),
                      ]),
                    ]
                      .sort()
                      .map((d) => (
                        <div key={d} className="flex items-center space-x-2">
                          <Checkbox
                            id={`date-${d}`}
                            checked={compareFilterDates.includes(d)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setCompareFilterDates((prev) => [...prev, d]);
                              } else {
                                setCompareFilterDates((prev) =>
                                  prev.filter((x) => x !== d)
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`date-${d}`}
                            className="cursor-pointer"
                          >
                            {d}
                          </Label>
                        </div>
                      ))}
                    <div className="pt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const allDates = [
                            ...new Set([
                              ...guestComparisons
                                .map((g) => g.file1Data.arrivalDate)
                                .filter(Boolean),
                              ...guestComparisons
                                .map((g) => g.file2Data.arrivalDate)
                                .filter(Boolean),
                              ...guestComparisons
                                .map((g) => g.file1Data.departDate)
                                .filter(Boolean),
                              ...guestComparisons
                                .map((g) => g.file2Data.departDate)
                                .filter(Boolean),
                            ]),
                          ];
                          setCompareFilterDates(allDates);
                        }}
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCompareFilterDates([])}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Clear All Filters */}
              {(compareFilterStatuses.length > 0 ||
                compareFilterTerminals.length > 0 ||
                compareFilterDates.length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm text-red-600 hover:text-red-700"
                  onClick={() => {
                    setCompareFilterStatuses([]);
                    setCompareFilterTerminals([]);
                    setCompareFilterDates([]);
                  }}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Results Table */}
            <ScrollArea className="h-[500px] w-full rounded-md border">
              <div className="p-2">
                {guestComparisons
                  .filter(
                    (g) =>
                      compareFilterStatuses.length === 0 ||
                      compareFilterStatuses.includes(g.status)
                  )
                  .filter((g) => {
                    if (compareFilterTerminals.length === 0) return true;
                    return (
                      compareFilterTerminals.includes(g.file1Data.terminal) ||
                      compareFilterTerminals.includes(g.file2Data.terminal)
                    );
                  })
                  .filter((g) => {
                    if (compareFilterDates.length === 0) return true;
                    return (
                      compareFilterDates.includes(g.file1Data.arrivalDate) ||
                      compareFilterDates.includes(g.file2Data.arrivalDate) ||
                      compareFilterDates.includes(g.file1Data.departDate) ||
                      compareFilterDates.includes(g.file2Data.departDate)
                    );
                  })
                  .map((guest) => (
                    <div
                      key={guest.id}
                      className={`mb-3 rounded-lg border-2 p-3 ${
                        guest.status === "match"
                          ? "bg-green-50 border-green-200"
                          : guest.status === "different"
                          ? "bg-orange-50 border-orange-200"
                          : guest.status === "only-file1"
                          ? "bg-red-50 border-red-200"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      {/* Guest Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span className="font-semibold text-sm">
                            {guest.name}
                          </span>
                          {guest.documentNumber && (
                            <Badge variant="outline" className="text-xs">
                              {guest.documentNumber}
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant={
                            guest.status === "match"
                              ? "default"
                              : guest.status === "different"
                              ? "secondary"
                              : "destructive"
                          }
                          className={`text-xs ${
                            guest.status === "match"
                              ? "bg-green-600"
                              : guest.status === "only-file2"
                              ? "bg-blue-600"
                              : ""
                          }`}
                        >
                          {guest.status === "match"
                            ? "✓ Match"
                            : guest.status === "different"
                            ? "⚠ Different"
                            : guest.status === "only-file1"
                            ? `Only in ${
                                file1?.name?.split(".")[0] || "File 1"
                              }`
                            : `Only in ${
                                file2?.name?.split(".")[0] || "File 2"
                              }`}
                        </Badge>
                      </div>

                      {/* Flight Details Pills - always show */}
                      {(() => {
                        const data =
                          guest.status === "only-file2"
                            ? guest.file2Data
                            : guest.file1Data;
                        const arrDate = data.arrivalDate;
                        const arrTime = data.arrivalTime;
                        const arrFlight = data.arrivalFlight;
                        const depDate = data.departDate;
                        const depTime = data.departTime;
                        const depFlight = data.departFlight;
                        const terminal = data.terminal;

                        const hasArrival = arrDate || arrTime || arrFlight;
                        const hasDeparture = depDate || depTime || depFlight;

                        if (!hasArrival && !hasDeparture && !terminal)
                          return null;

                        return (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {terminal && (
                              <Badge
                                variant="outline"
                                className="gap-1 text-xs"
                              >
                                <Building2 className="h-3 w-3" />
                                <span>{String(terminal)}</span>
                              </Badge>
                            )}
                            {hasArrival && (
                              <Badge
                                variant="outline"
                                className="gap-1 text-xs bg-green-50"
                              >
                                <PlaneLanding className="h-3 w-3" />
                                {arrDate && <span>{String(arrDate)}</span>}
                                {arrTime && <span>{String(arrTime)}</span>}
                                {arrFlight && (
                                  <span>({String(arrFlight)})</span>
                                )}
                              </Badge>
                            )}
                            {hasDeparture && (
                              <Badge
                                variant="outline"
                                className="gap-1 text-xs bg-orange-50"
                              >
                                <PlaneTakeoff className="h-3 w-3" />
                                {depDate && <span>{String(depDate)}</span>}
                                {depTime && <span>{String(depTime)}</span>}
                                {depFlight && (
                                  <span>({String(depFlight)})</span>
                                )}
                              </Badge>
                            )}
                          </div>
                        );
                      })()}

                      {/* Field Comparison Table */}
                      {(guest.status === "different" ||
                        guest.status === "match") && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-1.5 font-medium text-gray-600 w-1/4">
                                  Field
                                </th>
                                <th className="text-left p-1.5 font-medium text-gray-600 w-[37.5%]">
                                  {file1?.name?.split(".")[0] || "File 1"}
                                </th>
                                <th className="text-left p-1.5 font-medium text-gray-600 w-[37.5%]">
                                  {file2?.name?.split(".")[0] || "File 2"}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {compareConfig.fieldsToCompare.map((field) => {
                                const v1 = guest.file1Data[field] || "";
                                const v2 = guest.file2Data[field] || "";
                                const isDiff =
                                  guest.differences.includes(field);
                                const fieldLabel = fieldLabels[field] || field;

                                if (!v1 && !v2) return null;

                                return (
                                  <tr
                                    key={field}
                                    className={isDiff ? "bg-yellow-100" : ""}
                                  >
                                    <td className="p-1.5 font-medium text-gray-700">
                                      {fieldLabel}
                                    </td>
                                    <td
                                      className={`p-1.5 ${
                                        isDiff
                                          ? "text-red-700 font-semibold"
                                          : ""
                                      }`}
                                    >
                                      {String(v1) || "-"}
                                    </td>
                                    <td
                                      className={`p-1.5 ${
                                        isDiff
                                          ? "text-blue-700 font-semibold"
                                          : ""
                                      }`}
                                    >
                                      {String(v2) || "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Only in one file - show that file's data */}
                      {(guest.status === "only-file1" ||
                        guest.status === "only-file2") && (
                        <div className="text-xs mt-2">
                          {/* Show other fields */}
                          <div className="space-y-1">
                            {compareConfig.fieldsToCompare
                              .filter(
                                (f) =>
                                  ![
                                    "arrivalDate",
                                    "arrivalTime",
                                    "arrivalFlight",
                                    "departDate",
                                    "departTime",
                                    "departFlight",
                                    "terminal",
                                  ].includes(f)
                              )
                              .map((field) => {
                                const data =
                                  guest.status === "only-file1"
                                    ? guest.file1Data
                                    : guest.file2Data;
                                const v = data[field];
                                if (!v) return null;
                                const fieldLabel = fieldLabels[field] || field;
                                return (
                                  <div key={field} className="flex gap-2">
                                    <span className="font-medium text-gray-600 w-24">
                                      {fieldLabel}:
                                    </span>
                                    <span>{String(v)}</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </CardContent>
  );
}
