import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const rates = await prisma.rates.findMany()
    return NextResponse.json(rates)
  } catch (error) {
    console.error("Failed to fetch rates:", error)
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { date, clientName, rate, noOfStaff } = body

    const newRate = await prisma.rates.create({
      data: {
        date: new Date(date),
        clientName,
        rate,
        noOfStaff: noOfStaff || 0,
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
    const { date, clientName, rate, noOfStaff } = body

    const updatedRate = await prisma.rates.update({
      where: {
        id: id,
      },
      data: {
        date: new Date(date),
        clientName,
        rate,
        noOfStaff: noOfStaff || 0,
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

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Failed to delete rate:", error)
    return NextResponse.json({ error: "Failed to delete rate" }, { status: 500 })
  }
}
