"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Heart,
} from "lucide-react";
import * as XLSX from "xlsx";

type CellDifference = {
  sheet: string;
  cell: string;
  file1Value: any;
  file2Value: any;
};

export default function Home() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [differences, setDifferences] = useState<CellDifference[]>([]);
  const [comparisonComplete, setComparisonComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compareExcelFiles = async () => {
    if (!file1 || !file2) {
      setError("Please select both files to compare");
      return;
    }

    setIsComparing(true);
    setError(null);
    setDifferences([]);
    setComparisonComplete(false);

    try {
      // Read both files
      const data1 = await file1.arrayBuffer();
      const data2 = await file2.arrayBuffer();

      const workbook1 = XLSX.read(data1);
      const workbook2 = XLSX.read(data2);

      const foundDifferences: CellDifference[] = [];

      // Helper function to format cell value for display
      const formatCellForDisplay = (cell: any) => {
        if (!cell || cell.v === undefined) return "";

        // If it's a number type, check if it's a date or time
        if (cell.t === "n") {
          const value = cell.v;

          // Time values are typically < 1 (fraction of a day)
          if (value > 0 && value < 1) {
            const totalMinutes = value * 24 * 60;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);
            const seconds = Math.floor((totalMinutes * 60) % 60);
            return `${String(hours).padStart(2, "0")}:${String(
              minutes
            ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
          }

          // Date values are typically > 1 (days since 1900-01-01)
          if (value >= 1 && value < 60000) {
            try {
              const date = XLSX.SSF.parse_date_code(value);
              if (date && date.y > 1900) {
                return `${String(date.m).padStart(2, "0")}/${String(
                  date.d
                ).padStart(2, "0")}/${String(date.y).slice(-2)}`;
              }
            } catch (e) {
              // If parsing fails, return the raw value
              return value;
            }
          }
        }

        // For all other types, return the raw value
        return cell.v;
      };

      // Compare each sheet
      const allSheets = new Set([
        ...workbook1.SheetNames,
        ...workbook2.SheetNames,
      ]);

      allSheets.forEach((sheetName) => {
        const sheet1 = workbook1.Sheets[sheetName];
        const sheet2 = workbook2.Sheets[sheetName];

        // Skip if sheet doesn't exist in both files
        if (!sheet1 || !sheet2) {
          return;
        }

        // Get all cell addresses from both sheets
        const cells1 = Object.keys(sheet1).filter((key) => key[0] !== "!");
        const cells2 = Object.keys(sheet2).filter((key) => key[0] !== "!");
        const allCells = new Set([...cells1, ...cells2]);

        allCells.forEach((cell) => {
          const cellObj1 = sheet1[cell];
          const cellObj2 = sheet2[cell];

          const value1 = cellObj1?.v;
          const value2 = cellObj2?.v;

          // Only include if both values exist and are different (actual changes)
          if (
            value1 !== undefined &&
            value2 !== undefined &&
            value1 !== value2
          ) {
            // Format values for display
            const displayValue1 = formatCellForDisplay(cellObj1);
            const displayValue2 = formatCellForDisplay(cellObj2);

            // Skip if values are very long text (likely filter descriptions or metadata)
            const str1 = String(displayValue1);
            const str2 = String(displayValue2);

            // Skip if either value contains "Applied filters:" or is very long multi-line text
            if (
              str1.includes("Applied filters:") ||
              str2.includes("Applied filters:") ||
              str1.length > 200 ||
              str2.length > 200
            ) {
              return;
            }

            foundDifferences.push({
              sheet: sheetName,
              cell,
              file1Value: displayValue1,
              file2Value: displayValue2,
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
      setIsComparing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12 md:py-16">
        <div className="w-full max-w-2xl space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
                <FileSpreadsheet className="h-8 w-8 text-white sm:h-10 sm:w-10" />
              </div>
            </div>
            <h1 className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl md:text-5xl">
              Airport Reports Tools
            </h1>
            <p className="text-base text-gray-600 sm:text-lg">
              Streamline your Excel workflow with powerful tools
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-2 shadow-xl !bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-gray-900">
                Select Excel Files
              </CardTitle>
              <CardDescription className="text-gray-600">
                Upload two Excel files to compare or generate reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Picker 1 */}
              <div className="space-y-2">
                <Label htmlFor="file1">First File</Label>
                <div className="relative">
                  <input
                    id="file1"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setFile1(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="file1"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-blue-300 bg-blue-50/50 px-4 py-8 text-sm font-medium transition-all hover:border-blue-400 hover:bg-blue-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Upload className="h-5 w-5 text-blue-600" />
                    <span className="text-blue-700">
                      {file1 ? "Change file" : "Click to upload"}
                    </span>
                  </label>
                  {file1 && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ {file1.name}
                    </p>
                  )}
                </div>
              </div>

              {/* File Picker 2 */}
              <div className="space-y-2">
                <Label htmlFor="file2">Second File</Label>
                <div className="relative">
                  <input
                    id="file2"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setFile2(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label
                    htmlFor="file2"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-8 text-sm font-medium transition-all hover:border-indigo-400 hover:bg-indigo-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Upload className="h-5 w-5 text-indigo-600" />
                    <span className="text-indigo-700">
                      {file2 ? "Change file" : "Click to upload"}
                    </span>
                  </label>
                  {file2 && (
                    <p className="mt-2 text-sm text-green-600">
                      ✓ {file2.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Buttons Section */}
              <div className="space-y-3 pt-4">
                {/* Compare Excel Sheets Button */}
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
                  size="lg"
                  onClick={compareExcelFiles}
                  disabled={!file1 || !file2 || isComparing}
                >
                  {isComparing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-5 w-5" />
                      Compare Excel Sheets
                    </>
                  )}
                </Button>

                {/* Generate Messages Button (Disabled) */}
                <Button
                  className="w-full shadow-md"
                  size="lg"
                  disabled
                  variant="secondary"
                >
                  Generate Messages
                  <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-900">
                    Coming Soon
                  </span>
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Comparison Results */}
              {comparisonComplete && (
                <div className="mt-4">
                  {differences.length === 0 ? (
                    <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-4">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-800">
                          No differences found!
                        </p>
                        <p className="text-sm text-green-700">
                          The two Excel files are identical.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <div className="mb-3 flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-semibold text-orange-800">
                            Found {differences.length} difference
                            {differences.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-orange-50">
                            <tr className="border-b border-orange-300">
                              <th className="pb-2 text-left font-semibold text-gray-900">
                                Row
                              </th>
                              <th className="pb-2 text-left font-semibold text-gray-900">
                                Old Value
                              </th>
                              <th className="pb-2 text-left font-semibold text-gray-900">
                                New Value
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {differences.map((diff, index) => {
                              // Extract row number from cell reference (e.g., "A5" -> "5")
                              const rowNumber = diff.cell.replace(/[A-Z]/g, "");

                              return (
                                <tr
                                  key={index}
                                  className="border-b border-orange-200 last:border-0"
                                >
                                  <td className="py-3 font-medium text-gray-900">
                                    {rowNumber}
                                  </td>
                                  <td className="py-3 text-gray-700">
                                    {String(diff.file1Value)}
                                  </td>
                                  <td className="py-3 text-gray-700">
                                    {String(diff.file2Value)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Made with{" "}
          <Heart className="inline h-4 w-4 fill-red-500 text-red-500" /> by{" "}
          <span className="font-semibold">Ahmed</span>
        </p>
      </footer>
    </div>
  );
}
