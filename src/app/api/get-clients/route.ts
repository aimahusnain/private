import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Fetch all clients from the Rates model
    const clients = await prisma.rates.findMany({
      select: {
        id: true,
        clientName: true,
      },
      orderBy: {
        clientName: "asc",
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error("Error fetching clients:", error)
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

