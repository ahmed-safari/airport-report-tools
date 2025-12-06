// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ExcelData = {
  [key: string]: any;
}[];

export type ColumnMapping = {
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

export type MessageTemplate = {
  id: string;
  name: string;
  template: string;
};

export type SavedColumnMapping = {
  id: string;
  name: string;
  mapping: ColumnMapping;
};

export type ExportConfig = {
  groupBy: "date" | "terminal" | "flight" | "nationality";
  exportFormat: "single" | "individual";
};

export type MessageConfig = {
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

export type ProcessedMessage = {
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
    documentNumber: string;
    category: string;
  }>;
  message: string;
};

export type CellDifference = {
  sheet: string;
  cell: string;
  file1Value: any;
  file2Value: any;
};

export type GuestComparison = {
  id: string;
  name: string;
  documentNumber: string;
  status: "match" | "only-file1" | "only-file2" | "different";
  file1Data: Record<string, any>;
  file2Data: Record<string, any>;
  differences: string[];
};

export type CleanupRule = {
  id: string;
  type:
    | "replace"
    | "prefix"
    | "suffix"
    | "trim"
    | "capitalize"
    | "uppercase"
    | "lowercase";
  find: string;
  replace: string;
  applyTo: string;
  enabled: boolean;
};

// Compare uses same structure as ColumnMapping for each file
export type CompareColumnMapping = ColumnMapping;

export type SavedCompareMapping = {
  id: string;
  name: string;
  mappingFile1: CompareColumnMapping;
  mappingFile2: CompareColumnMapping;
  fieldsToCompare: string[];
};

export type CompareConfig = {
  matchBy: "name" | "documentNumber" | "both";
  fieldsToCompare: string[];
};
