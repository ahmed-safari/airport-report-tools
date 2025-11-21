import { NextRequest, NextResponse } from "next/server";
import { readFile, access } from "fs/promises";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    const logFilePath = join(process.cwd(), "usage-logs.txt");

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const action = searchParams.get("action");
    const date = searchParams.get("date");

    try {
      // Check if file exists
      await access(logFilePath);

      // Read the file
      const content = await readFile(logFilePath, "utf-8");

      // Parse log entries (separated by double equal signs)
      const entries = content
        .split("=".repeat(80))
        .filter((entry) => entry.trim().length > 0)
        .map((entry) => {
          const lines = entry.trim().split("\n");
          const logEntry: any = {};

          lines.forEach((line) => {
            if (line.includes(":")) {
              const [key, ...valueParts] = line.split(":");
              const value = valueParts.join(":").trim();
              const cleanKey = key.trim().toLowerCase().replace(/\s+/g, "_");

              if (cleanKey === "details") {
                try {
                  logEntry[cleanKey] = JSON.parse(value);
                } catch {
                  logEntry[cleanKey] = value;
                }
              } else {
                logEntry[cleanKey] = value;
              }
            }
          });

          return logEntry;
        })
        .filter((entry) => Object.keys(entry).length > 0);

      // Filter entries
      let filteredEntries = entries;

      if (action) {
        filteredEntries = filteredEntries.filter((entry) =>
          entry.action?.toLowerCase().includes(action.toLowerCase())
        );
      }

      if (date) {
        filteredEntries = filteredEntries.filter((entry) =>
          entry.date?.includes(date)
        );
      }

      // Reverse to show most recent first and limit
      const limitedEntries = filteredEntries.reverse().slice(0, limit);

      return NextResponse.json({
        success: true,
        total: entries.length,
        filtered: filteredEntries.length,
        returned: limitedEntries.length,
        logs: limitedEntries,
      });
    } catch (error: any) {
      if (error.code === "ENOENT") {
        // File doesn't exist yet
        return NextResponse.json({
          success: true,
          total: 0,
          filtered: 0,
          returned: 0,
          logs: [],
          message:
            "No logs found. The log file will be created on first usage.",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error reading logs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to read logs" },
      { status: 500 }
    );
  }
}
