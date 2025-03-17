import { NextResponse } from "next/server"
import { stringify } from "csv-stringify/sync"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Fetch all sales with client names
    const sales = await prisma.sales.findMany({
      include: {
        client: {
          select: {
            clientName: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    })

    // Format the data for CSV export
    const csvData = sales.map((sale) => ({
      id: sale.id,
      date: sale.date.toISOString().split("T")[0],
      clientId: sale.clientId,
      clientName: sale.client.clientName,
      amount: sale.amount,
      method: sale.method,
      note: sale.note || "",
    }))

    // Convert to CSV - fix the type issue by converting to string
    const csvString = stringify(csvData, {
      header: true,
      columns: {
        date: "Date",
        clientName: "Client Name",
        amount: "Amount",
        method: "Payment Method",
        note: "Note",
        clientId: "Client ID",
        id: "Sale ID",
      },
    })

    // Return as downloadable file
    return new NextResponse(csvString, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sales-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting sales:", error)
    return NextResponse.json({ error: "Failed to export sales" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

