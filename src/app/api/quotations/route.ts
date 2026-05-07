import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isBathroomLikeRoomName } from "@/lib/utils";

const MAX_QUOTATION_NUMBER_RETRIES = 5;

function parseQuotationSequence(quotationNumber: string): number {
  const suffix = quotationNumber.split("-").at(-1);
  const parsed = Number(suffix);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getNextQuotationNumber(
  tx: Prisma.TransactionClient,
  year: number
): Promise<string> {
  const prefix = `QT-${year}-`;

  const latest = await tx.quotation.findFirst({
    where: {
      quotationNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      quotationNumber: "desc",
    },
    select: {
      quotationNumber: true,
    },
  });

  const nextSequence = latest ? parseQuotationSequence(latest.quotationNumber) + 1 : 1;
  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Lightweight query for list view — only include room count via _count, NO items
    const quotations = await prisma.quotation.findMany({
      include: {
        houseType: { select: { id: true, name: true } },
        _count: { select: { rooms: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Map _count into a rooms array-like shape the frontend expects (length only)
    const result = quotations.map((q) => ({
      ...q,
      rooms: Array.from({ length: q._count.rooms }, (_, i) => ({ id: i })), // lightweight placeholder
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch quotations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { houseTypeId, ...rest } = body;
    const year = new Date().getFullYear();

    for (let attempt = 0; attempt < MAX_QUOTATION_NUMBER_RETRIES; attempt++) {
      try {
        const quotation = await prisma.$transaction(async (tx) => {
          const quotationNumber = await getNextQuotationNumber(tx, year);

          const newQuotation = await tx.quotation.create({
            data: {
              ...rest,
              quotationNumber,
              houseTypeId: houseTypeId ?? null,
            },
          });

          // Auto-create rooms from house type template
          if (houseTypeId) {
            const template = await tx.houseTypeRoomTemplate.findMany({
              where: { houseTypeId: Number(houseTypeId) },
              include: { roomType: true },
              orderBy: { sortOrder: "asc" },
            });

            const roomsToCreate = template
              .filter((t) => !isBathroomLikeRoomName(t.roomType?.name))
              .flatMap((t) =>
              Array.from({ length: t.defaultCount }, (_, i) => ({
                quotationId: newQuotation.id,
                roomTypeId: t.roomTypeId,
                sortOrder: t.sortOrder * 10 + i,
              }))
            );

            if (roomsToCreate.length > 0) {
              await tx.quotationRoom.createMany({ data: roomsToCreate });
            }
          }

          return newQuotation;
        });

        return NextResponse.json(quotation, { status: 201 });
      } catch (error) {
        const isQuotationNumberConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          Array.isArray((error.meta as { target?: string[] } | undefined)?.target) &&
          ((error.meta as { target?: string[] }).target ?? []).includes("quotationNumber");

        if (isQuotationNumberConflict && attempt < MAX_QUOTATION_NUMBER_RETRIES - 1) {
          continue;
        }

        throw error;
      }
    }

    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  } catch (e) {
    console.error("POST /api/quotations error:", e);
    return NextResponse.json({ error: "Failed to create quotation" }, { status: 500 });
  }
}
