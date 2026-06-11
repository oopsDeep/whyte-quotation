/**
 * Data migration: prisma/migrate-to-matrix.ts
 *
 * Populates the new matrix fields from legacy automationTier/surfaceFinish:
 *   - Product.isMatrix       ← true if variants have non-null tier or finish
 *   - Product.matrixDimensions ← built from distinct tier/finish values
 *   - ProductVariant.config  ← { series: tier, finish: finish } (skips nulls)
 *   - QuotationItem.variantConfig ← copies from the linked variant's config
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   npx tsx prisma/migrate-to-matrix.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔄 Starting matrix data migration...\n");

  // ── Step 1: Products + Variants ──────────────────────────────────────────
  const products = await prisma.product.findMany({
    include: { variants: true },
  });

  let flatCount = 0;
  let matrixCount = 0;

  for (const product of products) {
    const variants = product.variants;

    // Check if any variant has non-null tier or finish
    const hasMatrix = variants.some(
      (v) => v.automationTier !== null || v.surfaceFinish !== null
    );

    if (!hasMatrix) {
      // Flat product — single variant with empty config
      await prisma.product.update({
        where: { id: product.id },
        data: { isMatrix: false, matrixDimensions: null },
      });

      for (const v of variants) {
        await prisma.productVariant.update({
          where: { id: v.id },
          data: { config: {} },
        });
      }

      flatCount++;
    } else {
      // Matrix product — collect distinct tiers and finishes
      const distinctTiers = [
        ...new Set(
          variants.map((v) => v.automationTier).filter((t): t is string => t !== null)
        ),
      ];
      const distinctFinishes = [
        ...new Set(
          variants.map((v) => v.surfaceFinish).filter((f): f is string => f !== null)
        ),
      ];

      // Build matrixDimensions — only include a dimension if it has options
      const matrixDimensions: Array<{ key: string; label: string; options: string[] }> = [];
      if (distinctTiers.length > 0) {
        matrixDimensions.push({
          key: "series",
          label: "Series",
          options: distinctTiers,
        });
      }
      if (distinctFinishes.length > 0) {
        matrixDimensions.push({
          key: "finish",
          label: "Finish",
          options: distinctFinishes,
        });
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          isMatrix: true,
          matrixDimensions: matrixDimensions.length > 0 ? matrixDimensions : null,
        },
      });

      // Update each variant's config from its tier/finish
      for (const v of variants) {
        const config: Record<string, string> = {};
        if (v.automationTier) config.series = v.automationTier;
        if (v.surfaceFinish) config.finish = v.surfaceFinish;

        await prisma.productVariant.update({
          where: { id: v.id },
          data: { config },
        });
      }

      matrixCount++;
    }
  }

  console.log(`✅ Products migrated: ${flatCount} flat, ${matrixCount} matrix`);

  // ── Step 2: QuotationItems — copy variantConfig snapshot ─────────────────
  const items = await prisma.quotationItem.findMany({
    where: { productVariantId: { not: null } },
    include: { productVariant: true },
  });

  let itemsMigrated = 0;
  let itemsSkipped = 0;

  for (const item of items) {
    if (!item.productVariant) {
      itemsSkipped++;
      continue;
    }

    // Already migrated? Skip if variantConfig is set
    if (item.variantConfig !== null) {
      itemsSkipped++;
      continue;
    }

    const config = (item.productVariant.config as Record<string, string>) ?? {};

    await prisma.quotationItem.update({
      where: { id: item.id },
      data: {
        variantConfig: Object.keys(config).length > 0 ? config : null,
        // Also update variantLabel if missing
        variantLabel:
          item.variantLabel ??
          (Object.keys(config).length > 0
            ? Object.values(config)
                .filter(Boolean)
                .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
                .join(" + ") || null
            : null),
      },
    });

    itemsMigrated++;
  }

  console.log(
    `✅ QuotationItems migrated: ${itemsMigrated} updated, ${itemsSkipped} skipped`
  );
  console.log("\n🎉 Matrix data migration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
