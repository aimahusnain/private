import { NextResponse } from "next/server"
import { parse } from "csv-parse/sync"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Define the interface for CSV records
interface CSVRecord {
  date?: string
  clientId?: string
  clientName?: string
  client?: string // Add support for "client" column
  amount?: string
  method?: string
  note?: string
  [key: string]: string | undefined // Allow for additional fields
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    // Read file content
    const fileBuffer = await file.arrayBuffer()
    const fileContent = new TextDecoder().decode(fileBuffer)

    // Parse CSV - fix the type issue by using as unknown first
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as unknown as CSVRecord[]

    // Validate required fields exist in the CSV
    const missingFields: string[] = []
    if (records.length > 0) {
      const firstRecord = records[0]
      // Check for client information in any of the possible column names
      if (!("clientId" in firstRecord) && !("clientName" in firstRecord) && !("client" in firstRecord)) {
        missingFields.push("clientId, clientName, or client")
      }
      if (!("date" in firstRecord)) missingFields.push("date")
      if (!("amount" in firstRecord)) missingFields.push("amount")
      if (!("method" in firstRecord)) missingFields.push("method")
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `CSV is missing required fields: ${missingFields.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Process records and check for missing clients
    const processedRecords: any[] = []
    const skippedRecords: number[] = []
    const newClients: { clientName: string; clientId: string }[] = []

    // Get all existing clients
    const existingClients = await prisma.rates.findMany({
      select: {
        id: true,
        clientName: true,
      },
    })

    // Create a map of client names to IDs for quick lookup
    const clientNameMap = new Map(existingClients.map((client) => [client.clientName.toLowerCase(), client.id]))
    const clientIdMap = new Map(existingClients.map((client) => [client.id, client.clientName]))

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i]

      // Check if we have a client ID or name
      let clientId = record.clientId
      const clientName = record.clientName || record.client // Support both clientName and client columns

      // If we have a client name but no ID, try to find the ID
      if (!clientId && clientName) {
        const existingId = clientNameMap.get(clientName.toLowerCase())
        if (existingId) {
          clientId = existingId
        } else {
          // This is a new client
          newClients.push({
            clientName,
            clientId: `new_${i}`, // Temporary ID for reference
          })
          skippedRecords.push(i + 1) // +1 for human-readable row number (accounting for header)
          continue
        }
      }

      // If we have a client ID, check if it exists
      if (clientId && !clientIdMap.has(clientId)) {
        skippedRecords.push(i + 1) // +1 for human-readable row number
        continue
      }

      // Parse the date - handle different formats
      let parsedDate: Date
      try {
        // Try to parse the date in various formats
        const dateStr = record.date || ""

        // Check if it's in MM/DD/YYYY format
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
          const [month, day, year] = dateStr.split("/")
          parsedDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
        } else {
          // Otherwise try standard date parsing
          parsedDate = new Date(dateStr)
        }

        // Validate the date is valid
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date: ${dateStr}`)
        }
      } catch (error) {
        console.error(`Error parsing date for row ${i + 1}:`, error)
        skippedRecords.push(i + 1)
        continue
      }

      // Process valid record
      processedRecords.push({
        date: parsedDate,
        clientId: clientId,
        amount: Number.parseFloat(record.amount || "0"),
        method: record.method || "",
        note: record.note || null,
      })
    }

    // Insert valid records if there are any
    if (processedRecords.length > 0) {
      await prisma.sales.createMany({
        data: processedRecords,
      })
    }

    return NextResponse.json({
      success: true,
      count: processedRecords.length,
      skippedRows: skippedRecords,
      newClients: newClients.length > 0 ? newClients : null,
    })
  } catch (error) {
    console.error("Error uploading CSV:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process CSV file",
      },
      { status: 500 },
    )
  } finally {
    await prisma.$disconnect()
  }
}

