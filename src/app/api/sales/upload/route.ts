import { NextResponse } from "next/server"
import { parse } from "csv-parse/sync"
import { PrismaClient, type Prisma } from "@prisma/client"

const prisma = new PrismaClient()

// Define batch size for processing
const BATCH_SIZE = 10

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
    const processedRecords: Prisma.SalesCreateManyInput[] = []
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

      // Process valid record - only add if clientId is defined
      if (clientId) {
        processedRecords.push({
          date: parsedDate,
          clientId: clientId,
          amount: Number.parseFloat(record.amount || "0"),
          method: record.method || "",
          note: record.note || null,
        })
      } else {
        skippedRecords.push(i + 1)
      }
    }

    // Function to process records in batches
    async function processBatches<T>(items: T[], batchSize: number, processFn: (batch: T[]) => Promise<void>) {
      const totalBatches = Math.ceil(items.length / batchSize)
      let processedCount = 0

      for (let i = 0; i < totalBatches; i++) {
        const start = i * batchSize
        const end = Math.min(start + batchSize, items.length)
        const batch = items.slice(start, end)

        await processFn(batch)
        processedCount += batch.length

        console.log(`Processed batch ${i + 1}/${totalBatches} (${processedCount}/${items.length} items)`)
      }

      return processedCount
    }

    // Process new clients in batches if user confirms
    let addedClientCount = 0
    if (newClients.length > 0) {
      // This would typically be handled by the frontend
      // For API testing, we'll assume the user confirmed
      const confirmAdd = true // In real app, this would come from the frontend

      if (confirmAdd) {
        // Add clients in batches
        await processBatches(newClients, BATCH_SIZE, async (clientBatch) => {
          const clientData = clientBatch.map((client) => ({
            clientName: client.clientName,
            rate: 1, // Default rate
            noOfStaff: 1, // Default staff count
          }))

          await prisma.rates.createMany({
            data: clientData,
            // skipDuplicates: true, // This is causing the error
          })
        })

        addedClientCount = newClients.length

        // Refresh client maps with newly added clients
        const updatedClients = await prisma.rates.findMany({
          select: {
            id: true,
            clientName: true,
          },
        })

        // Update maps with new clients
        updatedClients.forEach((client) => {
          clientNameMap.set(client.clientName.toLowerCase(), client.id)
          clientIdMap.set(client.id, client.clientName)
        })

        // Try to process previously skipped records that had missing clients
        const reprocessedRecords: Prisma.SalesCreateManyInput[] = []

        for (let i = 0; i < records.length; i++) {
          // Skip if this record was already processed
          if (!skippedRecords.includes(i + 1)) continue

          const record = records[i]
          const clientName = record.clientName || record.client

          if (!clientName) continue

          // Check if we now have this client
          const clientId = clientNameMap.get(clientName.toLowerCase())
          if (!clientId) continue

          // Parse the date again
          let parsedDate: Date
          try {
            const dateStr = record.date || ""
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
              const [month, day, year] = dateStr.split("/")
              parsedDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, Number.parseInt(day))
            } else {
              parsedDate = new Date(dateStr)
            }

            if (isNaN(parsedDate.getTime())) continue
          } catch (error) {
            continue
          }

          // Add to reprocessed records
          reprocessedRecords.push({
            date: parsedDate,
            clientId: clientId,
            amount: Number.parseFloat(record.amount || "0"),
            method: record.method || "",
            note: record.note || null,
          })

          // Remove from skipped records
          skippedRecords.splice(skippedRecords.indexOf(i + 1), 1)
        }

        // Add reprocessed records to the main list
        processedRecords.push(...reprocessedRecords)
      }
    }

    // Insert valid records in batches if there are any
    let insertedCount = 0
    if (processedRecords.length > 0) {
      insertedCount = await processBatches(processedRecords, BATCH_SIZE, async (batch) => {
        await prisma.sales.createMany({
          data: batch,
        })
      })
    }

    return NextResponse.json({
      success: true,
      count: insertedCount,
      skippedRows: skippedRecords,
      newClients:
        newClients.length > 0
          ? {
              total: newClients.length,
              added: addedClientCount,
            }
          : null,
      batches: Math.ceil(processedRecords.length / BATCH_SIZE),
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

