import { NextResponse } from "next/server"
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

    // Format the response to include client name
    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      date: sale.date,
      clientId: sale.clientId,
      clientName: sale.client.clientName,
      amount: sale.amount,
      method: sale.method,
    }))

    return NextResponse.json(formattedSales)
  } catch (error) {
    console.error("Error fetching sales:", error)
    return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { date, clientId, amount, method } = body

    // Create a new sale record
    const sale = await prisma.sales.create({
      data: {
        date: new Date(date),
        clientId,
        amount,
        method,
      },
      include: {
        client: {
          select: {
            clientName: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: sale.id,
      date: sale.date,
      clientId: sale.clientId,
      clientName: sale.client.clientName,
      amount: sale.amount,
      method: sale.method,
    })
  } catch (error) {
    console.error("Error creating sale:", error)
    return NextResponse.json({ error: "Failed to create sale" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const { date, clientId, amount, method } = body

    // Update the sale record
    const sale = await prisma.sales.update({
      where: { id },
      data: {
        date: new Date(date),
        clientId,
        amount,
        method,
      },
      include: {
        client: {
          select: {
            clientName: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: sale.id,
      date: sale.date,
      clientId: sale.clientId,
      clientName: sale.client.clientName,
      amount: sale.amount,
      method: sale.method,
    })
  } catch (error) {
    console.error("Error updating sale:", error)
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Sale ID is required" }, { status: 400 })
    }

    // Delete the sale record
    await prisma.sales.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting sale:", error)
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

