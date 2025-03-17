import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clientName, rate, noOfStaff } = body

    // Validate input
    if (!clientName) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 })
    }

    // Create a new client record
    const client = await prisma.rates.create({
      data: {
        clientName,
        rate: rate || 1,
        noOfStaff: noOfStaff || 1,
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET() {
  try {
    const clients = await prisma.rates.findMany({
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

