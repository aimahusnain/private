import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { parse } from "csv-parse/sync"

const prisma = new PrismaClient()

// Define a type for the expected CSV record structure
interface CSVRecord {
  date: string
  clientId: string
  amount: string
  method: string
  [key: string]: string // Allow for additional fields
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

    // Parse CSV with type assertion
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CSVRecord[]

    // Validate required fields exist in the CSV
    const missingFields: string[] = []
    if (records.length > 0) {
      const firstRecord = records[0]
      if (!("clientId" in firstRecord)) missingFields.push("clientId")
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

    // Extract and validate client IDs
    const clientIds: string[] = []
    for (const record of records) {
      if (record.clientId && typeof record.clientId === "string") {
        clientIds.push(record.clientId)
      }
    }

    if (clientIds.length === 0) {
      return NextResponse.json({ error: "No valid client IDs found in CSV" }, { status: 400 })
    }

    // Get unique client IDs
    const uniqueClientIds = [...new Set(clientIds)]

    // Validate client IDs exist in the database
    const existingClients = await prisma.rates.findMany({
      where: {
        id: {
          in: uniqueClientIds,
        },
      },
      select: {
        id: true,
      },
    })

    const existingClientIds = new Set(existingClients.map((client) => client.id))
    const invalidClientIds = uniqueClientIds.filter((id) => !existingClientIds.has(id))

    if (invalidClientIds.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid client IDs: ${invalidClientIds.join(", ")}`,
        },
        { status: 400 },
      )
    }

    // Transform records to sales data with proper type handling
    const salesData = records.map((record) => ({
      date: new Date(record.date),
      clientId: record.clientId,
      amount: Number.parseFloat(record.amount),
      method: record.method,
    }))

    // Insert records
    await prisma.sales.createMany({
      data: salesData,
    })

    return NextResponse.json({
      success: true,
      count: salesData.length,
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

