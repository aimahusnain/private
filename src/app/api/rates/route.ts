import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    // Get the URL to extract query parameters
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    // If ID is provided, return a single rate
    if (id) {
      const rate = await prisma.rates.findUnique({
        where: {
          id: id,
        },
      })

      if (!rate) {
        return NextResponse.json({ error: "Rate not found" }, { status: 404 })
      }

      return NextResponse.json(rate)
    }

    // Otherwise, return all rates
    const rates = await prisma.rates.findMany({
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json(rates)
  } catch (error) {
    console.error("Failed to fetch rates:", error)
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { date, clientName, rate } = body

    const newRate = await prisma.rates.create({
      data: {
        date: new Date(date),
        clientName,
        rate,
      },
    })

    return NextResponse.json(newRate, { status: 201 })
  } catch (error) {
    console.error("Failed to create rate:", error)
    return NextResponse.json({ error: "Failed to create rate" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const { date, clientName, rate } = body

    const updatedRate = await prisma.rates.update({
      where: {
        id: id,
      },
      data: {
        date: new Date(date),
        clientName,
        rate,
      },
    })

    return NextResponse.json(updatedRate)
  } catch (error) {
    console.error("Failed to update rate:", error)
    return NextResponse.json({ error: "Failed to update rate" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    await prisma.rates.delete({
      where: {
        id: id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete rate:", error)
    return NextResponse.json({ error: "Failed to delete rate" }, { status: 500 })
  }
}

