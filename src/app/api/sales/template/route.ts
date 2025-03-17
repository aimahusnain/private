import { NextResponse } from "next/server"
import { stringify } from "csv-stringify/sync"

export async function GET() {
  try {
    // Create template data with example rows
    const templateData = [
      {
        date: new Date().toISOString().split("T")[0], // Today's date in YYYY-MM-DD format
        client: "Client Name", // Example client name
        amount: "100.00", // Example amount
        method: "Cash", // Example payment method
        note: "Optional note about the sale", // Example note
      },
      {
        date: "MM/DD/YYYY", // Alternative date format example
        client: "Another Client",
        amount: "250.50",
        method: "Credit Card",
        note: "Second example row",
      },
    ]

    // Convert to CSV
    const csvString = stringify(templateData, {
      header: true,
      columns: {
        date: "date",
        client: "client",
        amount: "amount",
        method: "method",
        note: "note",
      },
    })

    // Return as downloadable file
    return new NextResponse(csvString, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sales-import-template.csv"`,
      },
    })
  } catch (error) {
    console.error("Error generating template:", error)
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 })
  }
}