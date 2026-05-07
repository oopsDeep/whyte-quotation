import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBathroomLikeRoomName } from "@/lib/utils";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        houseType: true,
        rooms: {
          include: {
            roomType: true,
            items: {
              include: {
                product: {
                  include: {
                    category: {
                      include: {
                        parent: {
                          include: { parent: true },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!quotation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Read room notes via raw SQL as a compatibility fallback when Prisma client
    // metadata is temporarily stale after schema changes.
    const rawRoomNotes = await prisma.$queryRaw<Array<{ id: number; notes: string | null }>>`
      SELECT "id", "notes"
      FROM "QuotationRoom"
      WHERE "quotationId" = ${id}
    `;
    const roomNotesById = new Map(rawRoomNotes.map((row) => [row.id, row.notes]));

    const cleanedQuotation = {
      ...quotation,
      rooms: quotation.rooms
        .filter((room) => !isBathroomLikeRoomName(room.roomType?.name))
        .map((room) => ({
          ...room,
          notes: roomNotesById.get(room.id) ?? null,
        })),
    };

    return NextResponse.json(cleanedQuotation);
  } catch (e) {
    console.error("GET /api/quotations/[id]:", e);
    return NextResponse.json({ error: "Failed to fetch quotation" }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await req.json();

    // Whitelist updatable fields to prevent accidental overwrites
    const allowedFields = [
      "clientName", "clientGstNumber", "clientPhone", "clientEmail", "clientAddress",
      "status", "notes", "discountType", "discountValue",
      "terms", "validUntil", "houseTypeId",
    ] as const;

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        data[field] = body[field];
      }
    }

    // Coerce number fields
    if (data.discountValue !== undefined) {
      data.discountValue = data.discountValue !== null ? Number(data.discountValue) : null;
    }
    if (data.houseTypeId !== undefined) {
      data.houseTypeId = data.houseTypeId ? Number(data.houseTypeId) : null;
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data,
    });
    return NextResponse.json(quotation);
  } catch (e) {
    console.error("PATCH /api/quotations/[id]:", e);
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Cascade delete is configured in schema (rooms → items cascade)
    await prisma.quotation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/quotations/[id]:", e);
    return NextResponse.json({ error: "Failed to delete quotation" }, { status: 500 });
  }
}
