import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const rate = await prisma.rates.findUnique({
      where: {
        id: params.id,
      },
    })

    if (!rate) {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 })
    }

    return NextResponse.json(rate)
  } catch (error) {
    console.error("Failed to fetch rate:", error)
    return NextResponse.json({ error: "Failed to fetch rate" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()

    const { date, clientName, rate } = body

    const updatedRate = await prisma.rates.update({
      where: {
        id: params.id,
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.rates.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete rate:", error)
    return NextResponse.json({ error: "Failed to delete rate" }, { status: 500 })
  }
}

