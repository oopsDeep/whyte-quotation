import { prisma } from "@/lib/prisma";
import NewQuotationForm from "./NewQuotationForm";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  const houseTypes = await prisma.houseType.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  return <NewQuotationForm initialHouseTypes={houseTypes} />;
}
