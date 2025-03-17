import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, clientId, amount, method, note } = body;

    // Create a new sale record
    const sale = await prisma.sales.create({
      data: {
        date: new Date(date),
        clientId,
        amount,
        method,
        note,
      },
      include: {
        client: {
          select: {
            clientName: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: sale.id,
      date: sale.date,
      clientId: sale.clientId,
      clientName: sale.client.clientName,
      amount: sale.amount,
      method: sale.method,
      note: sale.note,
    });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Sale ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { date, clientId, amount, method, note } = body;

    // Update the sale record
    const sale = await prisma.sales.update({
      where: { id },
      data: {
        date: new Date(date),
        clientId,
        amount,
        method,
        note,
      },
      include: {
        client: {
          select: {
            clientName: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: sale.id,
      date: sale.date,
      clientId: sale.clientId,
      clientName: sale.client.clientName,
      amount: sale.amount,
      method: sale.method,
      note: sale.note,
    });
  } catch (error) {
    console.error("Error updating sale:", error);
    return NextResponse.json(
      { error: "Failed to update sale" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Update the GET function to include the note field
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
    });

    // Format the response to include client name
    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      date: sale.date,
      clientId: sale.clientId,
      clientName: sale.client.clientName,
      amount: sale.amount,
      method: sale.method,
      note: sale.note,
    }));

    return NextResponse.json(formattedSales);
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: Request) {
    try {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      const idsParam = searchParams.get("ids");
      
      // Define batch size for processing
      const BATCH_SIZE = 10;
      
      // Handle single deletion
      if (id) {
        await prisma.sales.delete({
          where: { id },
        });
        return NextResponse.json({ success: true, deleted: 1 });
      }
      
      // Handle batch deletion
      else if (idsParam) {
        const ids = idsParam.split(',');
        
        if (ids.length === 0) {
          return NextResponse.json(
            { error: "No IDs provided for deletion" },
            { status: 400 }
          );
        }
        
        // Process deletions in batches
        let totalDeleted = 0;
        const totalBatches = Math.ceil(ids.length / BATCH_SIZE);
        
        for (let i = 0; i < totalBatches; i++) {
          const batchIds = ids.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
          
          const result = await prisma.sales.deleteMany({
            where: {
              id: {
                in: batchIds
              }
            }
          });
          
          totalDeleted += result.count;
          console.log(`Processed deletion batch ${i + 1}/${totalBatches} (${totalDeleted}/${ids.length} items)`)
        }
        
        return NextResponse.json({ 
          success: true, 
          deleted: totalDeleted,
          batches: totalBatches
        });
      }
      
      else {
        return NextResponse.json(
          { error: "Sale ID or IDs are required" },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error deleting sale(s):", error);
      return NextResponse.json(
        { error: "Failed to delete sale(s)" },
        { status: 500 }
      );
    } finally {
      await prisma.$disconnect();
    }
  }