"use client";

import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  FileText,
  Settings,
  Map,
  Check,
  Calendar,
  ChevronDown,
  FileSpreadsheet,
  Sparkles,
  Building2,
  Globe,
  Filter,
} from "lucide-react";

import type {
  ExcelData,
  ColumnMapping,
  MessageConfig,
  ExportConfig,
  ProcessedMessage,
  CleanupRule,
  SavedColumnMapping,
} from "@/lib/types";

interface MessagesTabProps {
  // File states
  excelFile: File | null;
  setExcelFile: (file: File | null) => void;
  excelData: ExcelData;
  setExcelData: (data: ExcelData) => void;
  columns: string[];
  setColumns: (cols: string[]) => void;

  // Processing states
  mode: "arrival" | "departure";
  setMode: (mode: "arrival" | "departure") => void;
  selectedDates: string[];
  setSelectedDates: (dates: string[]) => void;
  selectedTerminals: string[];
  setSelectedTerminals: (terminals: string[]) => void;
  selectedFlights: string[];
  setSelectedFlights: (flights: string[]) => void;
  selectedNationalities: string[];
  setSelectedNationalities: (nationalities: string[]) => void;
  columnMapping: ColumnMapping;
  setColumnMapping: (mapping: ColumnMapping) => void;

  // Config
  messageConfig: MessageConfig;
  exportConfig: ExportConfig;
  cleanupRules: CleanupRule[];

  // UI states
  isProcessing: boolean;
  showMappingModal: boolean;
  setShowMappingModal: (show: boolean) => void;
  showConfigModal: boolean;
  setShowConfigModal: (show: boolean) => void;
  showCleanupModal: boolean;
  setShowCleanupModal: (show: boolean) => void;

  // Saved mappings
  savedColumnMappings: SavedColumnMapping[];

  // Available filter options computed
  availableDates: string[];
  availableTerminals: string[];
  availableFlights: string[];
  availableNationalities: string[];

  // Functions
  readExcelFile: (file: File) => Promise<void>;
  processMessages: () => void;
}

export function MessagesTab({
  excelFile,
  setExcelFile,
  excelData,
  columns,
  mode,
  setMode,
  selectedDates,
  setSelectedDates,
  selectedTerminals,
  setSelectedTerminals,
  selectedFlights,
  setSelectedFlights,
  selectedNationalities,
  setSelectedNationalities,
  isProcessing,
  showMappingModal,
  setShowMappingModal,
  showConfigModal,
  setShowConfigModal,
  showCleanupModal,
  setShowCleanupModal,
  availableDates,
  availableTerminals,
  availableFlights,
  availableNationalities,
  readExcelFile,
  processMessages,
}: MessagesTabProps) {
  return (
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
                <span className="font-semibold">{excelFile.name}</span>
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
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-sm h-10"
                >
                  <span className="truncate">
                    {selectedDates.length === 0
                      ? "All Dates"
                      : selectedDates.length === availableDates.length
                      ? "All Dates Selected"
                      : `${selectedDates.length} date(s) selected`}
                  </span>
                  <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Select Dates
                  </DialogTitle>
                  <DialogDescription>
                    Choose which dates to include in the report
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDates([...availableDates])}
                      className="flex-1"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDates([])}
                      className="flex-1"
                    >
                      Clear All
                    </Button>
                  </div>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-2">
                      {availableDates.map((date) => (
                        <div
                          key={date}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50"
                        >
                          <Checkbox
                            id={`date-${date}`}
                            checked={selectedDates.includes(date)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDates([...selectedDates, date]);
                              } else {
                                setSelectedDates(
                                  selectedDates.filter((d) => d !== date)
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`date-${date}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {new Date(date + "T00:00:00").toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedDates.length === 0
                      ? "No dates selected - all dates will be included"
                      : `${selectedDates.length} of ${availableDates.length} date(s) selected`}
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}

      {/* Additional Filters */}
      {(availableTerminals.length > 0 ||
        availableFlights.length > 0 ||
        availableNationalities.length > 0) && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Additional Filters
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Terminal Filter */}
              {availableTerminals.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-sm h-10"
                    >
                      <span className="truncate flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" />
                        {selectedTerminals.length === 0
                          ? "All Terminals"
                          : `${selectedTerminals.length} terminal(s)`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Select Terminals
                      </DialogTitle>
                      <DialogDescription>
                        Filter by terminal location
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedTerminals([...availableTerminals])
                          }
                          className="flex-1"
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTerminals([])}
                          className="flex-1"
                        >
                          Clear All
                        </Button>
                      </div>
                      <ScrollArea className="h-[250px] pr-4">
                        <div className="space-y-2">
                          {availableTerminals.map((terminal) => (
                            <div
                              key={terminal}
                              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50"
                            >
                              <Checkbox
                                id={`terminal-${terminal}`}
                                checked={selectedTerminals.includes(terminal)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedTerminals([
                                      ...selectedTerminals,
                                      terminal,
                                    ]);
                                  } else {
                                    setSelectedTerminals(
                                      selectedTerminals.filter(
                                        (t) => t !== terminal
                                      )
                                    );
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`terminal-${terminal}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {terminal}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Flight Filter */}
              {availableFlights.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-sm h-10"
                    >
                      <span className="truncate flex items-center gap-2">
                        <Plane className="h-3.5 w-3.5" />
                        {selectedFlights.length === 0
                          ? "All Flights"
                          : `${selectedFlights.length} flight(s)`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Plane className="h-5 w-5" />
                        Select Flights
                      </DialogTitle>
                      <DialogDescription>
                        Filter by flight number
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedFlights([...availableFlights])
                          }
                          className="flex-1"
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFlights([])}
                          className="flex-1"
                        >
                          Clear All
                        </Button>
                      </div>
                      <ScrollArea className="h-[250px] pr-4">
                        <div className="space-y-2">
                          {availableFlights.map((flight) => (
                            <div
                              key={flight}
                              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50"
                            >
                              <Checkbox
                                id={`flight-${flight}`}
                                checked={selectedFlights.includes(flight)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFlights([
                                      ...selectedFlights,
                                      flight,
                                    ]);
                                  } else {
                                    setSelectedFlights(
                                      selectedFlights.filter(
                                        (f) => f !== flight
                                      )
                                    );
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`flight-${flight}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {flight}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Nationality Filter */}
              {availableNationalities.length > 0 && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between text-sm h-10"
                    >
                      <span className="truncate flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" />
                        {selectedNationalities.length === 0
                          ? "All Delegations"
                          : `${selectedNationalities.length} delegation(s)`}
                      </span>
                      <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Select Delegations
                      </DialogTitle>
                      <DialogDescription>
                        Filter by nationality/delegation
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedNationalities([
                              ...availableNationalities,
                            ])
                          }
                          className="flex-1"
                        >
                          Select All
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedNationalities([])}
                          className="flex-1"
                        >
                          Clear All
                        </Button>
                      </div>
                      <ScrollArea className="h-[250px] pr-4">
                        <div className="space-y-2">
                          {availableNationalities.map((nationality) => (
                            <div
                              key={nationality}
                              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50"
                            >
                              <Checkbox
                                id={`nationality-${nationality}`}
                                checked={selectedNationalities.includes(
                                  nationality
                                )}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedNationalities([
                                      ...selectedNationalities,
                                      nationality,
                                    ]);
                                  } else {
                                    setSelectedNationalities(
                                      selectedNationalities.filter(
                                        (n) => n !== nationality
                                      )
                                    );
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`nationality-${nationality}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {nationality}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
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

        <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
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

        <Dialog open={showCleanupModal} onOpenChange={setShowCleanupModal}>
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
  );
}
