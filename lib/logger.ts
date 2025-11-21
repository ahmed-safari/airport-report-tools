export const logUsage = async (
  action: string,
  fileName?: string,
  details?: any
) => {
  try {
    await fetch("/api/log-usage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        fileName,
        details,
      }),
    });
  } catch (error) {
    // Silently fail - don't interrupt user experience
    console.error("Failed to log usage:", error);
  }
};
