import {
  ColumnMapping,
  MessageConfig,
  ProcessedMessage,
  CleanupRule,
} from "./types";
import { applyCleanupRules } from "./excel-utils";

interface Passenger {
  name: string;
  position: string;
  remarks: string;
  documentNumber: string;
  category: string;
}

interface ProcessMessagesOptions {
  excelData: any[];
  columnMapping: ColumnMapping;
  mode: "arrival" | "departure";
  selectedDates: string[];
  messageConfig: MessageConfig;
  cleanupRules: CleanupRule[];
}

/**
 * Process Excel data into formatted messages
 */
export const processExcelToMessages = (
  options: ProcessMessagesOptions
): ProcessedMessage[] => {
  const {
    excelData,
    columnMapping,
    mode,
    selectedDates,
    messageConfig,
    cleanupRules,
  } = options;

  const messages: ProcessedMessage[] = [];

  const dateField =
    mode === "arrival" ? columnMapping.arrivalDate : columnMapping.departDate;
  const timeField =
    mode === "arrival" ? columnMapping.arrivalTime : columnMapping.departTime;
  const flightField =
    mode === "arrival"
      ? columnMapping.arrivalFlight
      : columnMapping.departFlight;

  // Helper to apply cleanup
  const cleanup = (value: string, field: string) =>
    applyCleanupRules(value, field, cleanupRules);

  // Filter by date if selected
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

      return date && selectedDates.includes(date.toISOString().split("T")[0]);
    });
  }

  // Group by flight, nationality, terminal, hotel
  const groups: Record<string, any[]> = {};

  filteredData.forEach((row) => {
    const flight = cleanup(
      flightField ? row[flightField] || "TBD" : "TBD",
      flightField || "flight"
    );
    const nationality = cleanup(
      columnMapping.nationality ? row[columnMapping.nationality] || "" : "",
      columnMapping.nationality || "nationality"
    );
    const terminal = cleanup(
      columnMapping.terminal ? row[columnMapping.terminal] || "VIP" : "VIP",
      columnMapping.terminal || "terminal"
    );
    const hotel = cleanup(
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
        const totalMinutes = timeValue * 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
          2,
          "0"
        )}`;
      } else if (typeof timeValue === "string") {
        time = timeValue;
      }
    }

    // Get passengers
    const passengers: Passenger[] = groupRows.map((row) => ({
      name: cleanup(
        columnMapping.fullName ? row[columnMapping.fullName] || "N/A" : "N/A",
        columnMapping.fullName || "fullName"
      ),
      position: cleanup(
        columnMapping.position ? row[columnMapping.position] || "" : "",
        columnMapping.position || "position"
      ),
      remarks: cleanup(
        columnMapping.remarks ? row[columnMapping.remarks] || "" : "",
        columnMapping.remarks || "remarks"
      ),
      documentNumber: cleanup(
        columnMapping.documentNumber
          ? row[columnMapping.documentNumber] || ""
          : "",
        columnMapping.documentNumber || "documentNumber"
      ),
      category: cleanup(
        columnMapping.category ? row[columnMapping.category] || "" : "",
        columnMapping.category || "category"
      ),
    }));

    // Build message
    const finalMessage = buildMessage(
      passengers,
      {
        mode,
        date,
        time,
        flight,
        nationality,
        terminal,
        hotel,
      },
      messageConfig
    );

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

  return messages;
};

interface MessageContext {
  mode: "arrival" | "departure";
  date: string;
  time: string;
  flight: string;
  nationality: string;
  terminal: string;
  hotel: string;
}

/**
 * Build a message from passengers and context using config
 */
function buildMessage(
  passengers: Passenger[],
  context: MessageContext,
  config: MessageConfig
): string {
  const { mode, date, time, flight, nationality, terminal, hotel } = context;

  if (config.useCustomTemplate && config.customTemplate) {
    return buildCustomTemplateMessage(passengers, context, config);
  }

  return buildDefaultMessage(passengers, context, config);
}

function buildCustomTemplateMessage(
  passengers: Passenger[],
  context: MessageContext,
  config: MessageConfig
): string {
  const { mode, date, time, flight, nationality, terminal, hotel } = context;
  let template = config.customTemplate;

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
    .map((p, idx) => {
      let line = `${idx + 1}) ${p.name}`;
      if (config.includePosition && p.position) {
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
    .map((p, idx) => {
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
  const passengerNames = passengers.map((p) => p.name).join(", ");
  template = template.replace(/\{\{passengerNames\}\}/g, passengerNames);

  // Positions list
  const positions = passengers
    .filter((p) => p.position)
    .map((p) => p.position)
    .join(", ");
  template = template.replace(/\{\{positions\}\}/g, positions || "-");

  // Document numbers
  const documentNumbers = passengers
    .filter((p) => p.documentNumber)
    .map((p) => `${p.name}: ${p.documentNumber}`)
    .join("\n");
  template = template.replace(
    /\{\{documentNumbers\}\}/g,
    documentNumbers || "-"
  );

  // Categories
  const categories = [
    ...new Set(passengers.map((p) => p.category).filter(Boolean)),
  ].join(", ");
  template = template.replace(/\{\{category\}\}/g, categories || "-");
  template = template.replace(/\{\{categories\}\}/g, categories || "-");

  // Nationality/Delegation
  template = template.replace(/\{\{nationality\}\}/g, nationality || "N/A");
  template = template.replace(/\{\{delegation\}\}/g, nationality || "N/A");

  // Flight info
  template = template.replace(/\{\{flight\}\}/g, flight);
  template = template.replace(/\{\{flightTime\}\}/g, `${flight} | ${time}`);
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
  const remarksWithContent = passengers.filter((p) => p.remarks);
  if (remarksWithContent.length > 0) {
    const remarksText = remarksWithContent
      .map((p) => `${p.name}:\n${p.remarks}`)
      .join("\n\n");
    template = template.replace(/\{\{remarks\}\}/g, remarksText);
  } else {
    template = template.replace(/\{\{remarks\}\}/g, "-");
  }

  return template;
}

function buildDefaultMessage(
  passengers: Passenger[],
  context: MessageContext,
  config: MessageConfig
): string {
  const { mode, flight, nationality, terminal, hotel, time } = context;
  const messageParts: string[] = [];

  if (config.includeHeader) {
    const headerEmoji = mode === "arrival" ? "🛬" : "🛫";
    const headerText = mode === "arrival" ? "Arrival" : "Departure";
    messageParts.push(`${headerEmoji} ${headerText}\n`);
  }

  if (config.includePassengers) {
    messageParts.push(`👥 Passenger(s):`);
    passengers.forEach((p, idx) => {
      let line = `${idx + 1}) *${p.name.trim()}*`;
      if (config.includePosition && p.position) {
        line += ` - ${p.position}`;
      }
      messageParts.push(line);
    });
    messageParts.push("");
  }

  if (config.includeNationality && nationality) {
    messageParts.push(`🌍 Delegation: ${nationality}`);
  }

  if (config.includeFlightInfo) {
    messageParts.push(`✈️ Flight: ${flight} | ${time}`);
  }

  if (config.includeTerminal) {
    messageParts.push(`🏢 Terminal: ${terminal}`);
  }

  if (config.includeHotel && mode === "arrival") {
    const hotelDisplay = hotel || "-";
    messageParts.push(`🏨 Hotel: ${hotelDisplay}`);
  }

  if (config.includeBaggage && mode === "arrival") {
    messageParts.push(`💼 Luggage: -`);
  }

  if (config.includeRemarks) {
    const remarksWithContent = passengers.filter((p) => p.remarks);
    if (remarksWithContent.length > 0) {
      messageParts.push(`📝 Remarks:`);
      remarksWithContent.forEach((p) => {
        messageParts.push(`${p.name}:\n${p.remarks}`);
      });
    } else {
      messageParts.push(`📝 Remarks: -`);
    }
  }

  return messageParts.join("\n");
}
