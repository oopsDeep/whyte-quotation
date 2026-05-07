import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check if we can query a room with notes
    const room = await prisma.quotationRoom.findFirst({
      select: { id: true, notes: true },
      take: 1,
    });

    if (!room) {
      return NextResponse.json({
        status: "ok",
        message: "No rooms found to test, but query succeeded",
        schema: "QuotationRoom table has notes column",
      });
    }

    return NextResponse.json({
      status: "ok",
      message: "Room notes column is working",
      sample: { id: room.id, notes: room.notes },
      schema: "QuotationRoom table has notes column ✓",
    });
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        message: e instanceof Error ? e.message : String(e),
        schema: "QuotationRoom table might not have notes column",
      },
      { status: 500 }
    );
  }
}
