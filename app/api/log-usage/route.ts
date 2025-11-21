import { NextRequest, NextResponse } from "next/server";
import { writeFile, appendFile, access } from "fs/promises";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, fileName, details } = body;

    // Get client information
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "Unknown";
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const timestamp = new Date().toISOString();
    const date = new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    // Create log entry
    const logEntry =
      [
        "=".repeat(80),
        `Timestamp: ${timestamp}`,
        `Date: ${date}`,
        `Action: ${action}`,
        `File: ${fileName || "N/A"}`,
        `IP Address: ${ip}`,
        `User Agent: ${userAgent}`,
        details ? `Details: ${JSON.stringify(details)}` : "",
        "=".repeat(80),
        "",
      ]
        .filter((line) => line !== "")
        .join("\n") + "\n";

    // Log file path (in the project root)
    const logFilePath = join(process.cwd(), "usage-logs.txt");

    try {
      // Check if file exists
      await access(logFilePath);
      // File exists, append to it
      await appendFile(logFilePath, logEntry, "utf-8");
    } catch {
      // File doesn't exist, create it with header
      const header =
        [
          "AIRPORT REPORT TOOLS - USAGE LOG",
          `Log Started: ${timestamp}`,
          "=".repeat(80),
          "",
        ].join("\n") + "\n";
      await writeFile(logFilePath, header + logEntry, "utf-8");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging usage:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log usage" },
      { status: 500 }
    );
  }
}
