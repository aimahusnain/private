import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  try {
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

