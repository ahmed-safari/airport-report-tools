// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_CUSTOM_TEMPLATE = `🛬 {{header}}

👥 Passenger(s):
{{passengers}}

🌍 Delegation: {{nationality}}
✈️ Flight: {{flight}} | {{time}}
🏢 Terminal: {{terminal}}
🏨 Hotel: {{hotel}}
💼 Luggage: {{baggage}}
📝 Remarks: {{remarks}}`;

export const DEFAULT_MESSAGE_CONFIG = {
  includeHeader: true,
  includePassengers: true,
  includePosition: true,
  includeNationality: true,
  includeFlightInfo: true,
  includeTerminal: true,
  defaultTerminal: "",
  includeHotel: true,
  includeBaggage: true,
  includeRemarks: true,
  customTemplate: DEFAULT_CUSTOM_TEMPLATE,
  useCustomTemplate: false,
};

export const DEFAULT_EXPORT_CONFIG = {
  groupBy: "date" as const,
  exportFormat: "single" as const,
};

export const DEFAULT_CLEANUP_RULES = [
  {
    id: "1",
    type: "replace" as const,
    find: "Ministerial*",
    replace: "Ministerial",
    applyTo: "all",
    enabled: true,
  },
];

export const DEFAULT_COMPARE_CONFIG = {
  matchBy: "both" as const,
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
};

// Name columns that are parts of a person name (Title, First, Last).
// Checked before the generic full-name pattern so "First Name" is not treated as the full name.
export const NAME_PART_PATTERNS: {
  key: "nameTitle" | "firstName" | "lastName";
  pattern: RegExp;
}[] = [
  {
    key: "firstName",
    pattern:
      /^(first|first[\s_-]*name|given[\s_-]*name|forename|الاسم[\s_-]*(الأول|الاول))$/i,
  },
  {
    key: "lastName",
    pattern:
      /^(last|last[\s_-]*name|surname|family[\s_-]*name|اسم[\s_-]*العائلة|الاسم[\s_-]*(الأخير|الاخير))$/i,
  },
  {
    key: "nameTitle",
    pattern: /^(title|salutation|honorific|name[\s_-]*title|custom[\s_-]*title)$/i,
  },
];

// Column mapping patterns for auto-detection
export const COLUMN_PATTERNS = {
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

// Field labels for display
export const FIELD_LABELS: Record<string, string> = {
  fullName: "Name",
  nameTitle: "Title",
  firstName: "First Name",
  lastName: "Last Name",
  documentNumber: "Document #",
  nationality: "Nationality",
  position: "Position",
  terminal: "Terminal",
  hotel: "Hotel",
  remarks: "Remarks",
  category: "Category",
  arrivalDate: "Arrival Date",
  arrivalTime: "Arrival Time",
  arrivalFlight: "Arrival Flight",
  departDate: "Depart Date",
  departTime: "Depart Time",
  departFlight: "Depart Flight",
};

// All fields for comparison
export const ALL_COMPARE_FIELDS = [
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

// Common fields (shared between arrival/departure)
export const COMMON_MAPPING_FIELDS = [
  { key: "fullName", label: "Full Name", required: true },
  { key: "nameTitle", label: "Title" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "nationality", label: "Nationality/Delegation" },
  { key: "position", label: "Position/Title" },
  { key: "documentNumber", label: "Document Number" },
  { key: "category", label: "Category" },
  { key: "terminal", label: "Terminal" },
  { key: "hotel", label: "Hotel" },
  { key: "remarks", label: "Remarks" },
];

// Arrival-specific fields
export const ARRIVAL_MAPPING_FIELDS = [
  { key: "arrivalDate", label: "Arrival Date", required: true },
  { key: "arrivalTime", label: "Arrival Time" },
  { key: "arrivalFlight", label: "Arrival Flight", required: true },
];

// Departure-specific fields
export const DEPARTURE_MAPPING_FIELDS = [
  { key: "departDate", label: "Departure Date", required: true },
  { key: "departTime", label: "Departure Time" },
  { key: "departFlight", label: "Departure Flight", required: true },
];

// localStorage keys
export const STORAGE_KEYS = {
  mode: "airportTools_mode",
  messageConfig: "airportTools_messageConfig",
  exportConfig: "airportTools_exportConfig",
  cleanupRules: "airportTools_cleanupRules",
  savedColumnMappings: "airportTools_savedColumnMappings",
  savedCompareMappings: "airportTools_savedCompareMappings",
};
