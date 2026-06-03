import { PrismaClient, ProductType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Helper to create a product with its variants in one go
async function upsertProductWithVariants(
  product: {
    name: string;
    code: string;
    type: ProductType;
    unit?: string;
    categoryId?: number;
    description?: string;
    moduleSize?: string;
    sortOrder?: number;
  },
  variants: Array<{
    automationTier: string | null;
    surfaceFinish: string | null;
    price: number;
  }>
) {
  const existing = await prisma.product.findFirst({ where: { code: product.code } });
  let productId: number;

  if (existing) {
    productId = existing.id;
    // Update product fields (not variants — handled below)
    await prisma.product.update({
      where: { id: productId },
      data: {
        name: product.name,
        type: product.type,
        unit: product.unit ?? "pcs",
        categoryId: product.categoryId ?? null,
        description: product.description ?? null,
        moduleSize: product.moduleSize ?? null,
      },
    });
  } else {
    const created = await prisma.product.create({
      data: {
        name: product.name,
        code: product.code,
        type: product.type,
        unit: product.unit ?? "pcs",
        categoryId: product.categoryId ?? null,
        description: product.description ?? null,
        moduleSize: product.moduleSize ?? null,
        sortOrder: product.sortOrder ?? 0,
        isActive: true,
      },
    });
    productId = created.id;
  }

  // Upsert variants — use findFirst because composite unique has nullable fields
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const existing = await prisma.productVariant.findFirst({
      where: {
        productId,
        automationTier: v.automationTier,
        surfaceFinish: v.surfaceFinish,
      },
    });

    if (existing) {
      await prisma.productVariant.update({
        where: { id: existing.id },
        data: { price: v.price, sortOrder: i },
      });
    } else {
      await prisma.productVariant.create({
        data: {
          productId,
          automationTier: v.automationTier,
          surfaceFinish: v.surfaceFinish,
          price: v.price,
          sortOrder: i,
          isActive: true,
        },
      });
    }
  }

  return productId;
}

async function main() {
  console.log("🌱 Starting seed...");

  // ── Company ──
  await prisma.company.upsert({
    where: { id: 1 },
    update: {
      name: "Whyte Automations Pvt. Ltd.",
      gstNumber: "24AAXCS4505Q1ZK",
      phone: "098982 34336",
      email: "sales@whyte.co.in",
      address:
        "Whyte, A1-442, C3, CELEBRATION CITY CENTER, Gala Gymkhana Rd, South Bopal, Bopal, Ahmedabad, Gujarat 380058",
      tagline: "Smart Homes. Smarter Living.",
    },
    create: {
      name: "Whyte Automations Pvt. Ltd.",
      gstNumber: "24AAXCS4505Q1ZK",
      phone: "098982 34336",
      email: "sales@whyte.co.in",
      address:
        "Whyte, A1-442, C3, CELEBRATION CITY CENTER, Gala Gymkhana Rd, South Bopal, Bopal, Ahmedabad, Gujarat 380058",
      tagline: "Smart Homes. Smarter Living.",
    },
  });
  console.log("✅ Company");

  // ── Admin ──
  const hash = await bcrypt.hash("admin", 12);
  await prisma.adminUser.upsert({
    where: { email: "admin@whyte.co.in" },
    update: {},
    create: {
      email: "admin@whyte.co.in",
      passwordHash: hash,
      name: "Super Admin",
      role: "super_admin",
      isActive: true,
    },
  });
  console.log("✅ Admin user (admin / admin)");

  // ── Room Types (28) ──
  const roomTypes = [
    { name: "Living Room", icon: "🛋️" },
    { name: "Master Bedroom", icon: "🛏️" },
    { name: "Bedroom 2", icon: "🛏️" },
    { name: "Bedroom 3", icon: "🛏️" },
    { name: "Bedroom 4", icon: "🛏️" },
    { name: "Kids Room", icon: "🧒" },
    { name: "Guest Room", icon: "🛏️" },
    { name: "Kitchen", icon: "🍳" },
    { name: "Dining Room", icon: "🍽️" },
    { name: "Study Room", icon: "📚" },
    { name: "Home Office", icon: "💻" },
    { name: "Puja Room", icon: "🪔" },
    { name: "Home Theatre", icon: "🎬" },
    { name: "Gym", icon: "🏋️" },
    { name: "Balcony 1", icon: "🌿" },
    { name: "Balcony 2", icon: "🌿" },
    { name: "Terrace", icon: "☀️" },
    { name: "Garden", icon: "🌳" },
    { name: "Entrance / Foyer", icon: "🚪" },
    { name: "Corridor", icon: "🚶" },
    { name: "Staircase", icon: "🪜" },
    { name: "Powder Room", icon: "🪞" },
    { name: "Laundry", icon: "🧺" },
    { name: "Store Room", icon: "📦" },
    { name: "Garage", icon: "🚗" },
    { name: "Servant Room", icon: "🏠" },
    { name: "Driver Room", icon: "🏠" },
    { name: "Common Area", icon: "🏢" },
  ];

  for (let i = 0; i < roomTypes.length; i++) {
    await prisma.roomType.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        name: roomTypes[i].name,
        icon: roomTypes[i].icon,
        sortOrder: i * 10,
        isActive: true,
      },
    });
  }

  // Deactivate bathroom-like room types
  const excludedRoomTypes = await prisma.roomType.findMany({
    where: {
      OR: [
        { name: { contains: "Bathroom", mode: "insensitive" } },
        { name: { contains: "Washroom", mode: "insensitive" } },
        { name: { contains: "Toilet", mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  const excludedIds = excludedRoomTypes.map((rt) => rt.id);
  if (excludedIds.length > 0) {
    await prisma.houseTypeRoomTemplate.deleteMany({ where: { roomTypeId: { in: excludedIds } } });
    await prisma.roomType.updateMany({
      where: { id: { in: excludedIds } },
      data: { isActive: false },
    });
  }

  console.log(`✅ ${roomTypes.length} Room Types`);

  // ── House Types (7) ──
  const houseTypesData = [
    {
      name: "1 BHK",
      description: "1 Bedroom, Hall, Kitchen",
      rooms: [
        { name: "Living Room", count: 1 },
        { name: "Master Bedroom", count: 1 },
        { name: "Kitchen", count: 1 },
        { name: "Entrance / Foyer", count: 1 },
        { name: "Balcony 1", count: 1 },
      ],
    },
    {
      name: "2 BHK",
      description: "2 Bedrooms, Hall, Kitchen",
      rooms: [
        { name: "Living Room", count: 1 },
        { name: "Master Bedroom", count: 1 },
        { name: "Bedroom 2", count: 1 },
        { name: "Kitchen", count: 1 },
        { name: "Dining Room", count: 1 },
        { name: "Entrance / Foyer", count: 1 },
        { name: "Balcony 1", count: 1 },
      ],
    },
    {
      name: "3 BHK",
      description: "3 Bedrooms, Hall, Kitchen",
      rooms: [
        { name: "Living Room", count: 1 },
        { name: "Master Bedroom", count: 1 },
        { name: "Bedroom 2", count: 1 },
        { name: "Bedroom 3", count: 1 },
        { name: "Kitchen", count: 1 },
        { name: "Dining Room", count: 1 },
        { name: "Entrance / Foyer", count: 1 },
        { name: "Balcony 1", count: 1 },
        { name: "Balcony 2", count: 1 },
      ],
    },
    {
      name: "4 BHK",
      description: "4 Bedrooms, Hall, Kitchen",
      rooms: [
        { name: "Living Room", count: 1 },
        { name: "Master Bedroom", count: 1 },
        { name: "Bedroom 2", count: 1 },
        { name: "Bedroom 3", count: 1 },
        { name: "Bedroom 4", count: 1 },
        { name: "Kitchen", count: 1 },
        { name: "Dining Room", count: 1 },
        { name: "Study Room", count: 1 },
        { name: "Entrance / Foyer", count: 1 },
        { name: "Balcony 1", count: 1 },
        { name: "Balcony 2", count: 1 },
        { name: "Puja Room", count: 1 },
      ],
    },
    {
      name: "Duplex",
      description: "Duplex with multiple floors",
      rooms: [
        { name: "Living Room", count: 1 },
        { name: "Master Bedroom", count: 1 },
        { name: "Bedroom 2", count: 1 },
        { name: "Bedroom 3", count: 1 },
        { name: "Bedroom 4", count: 1 },
        { name: "Kitchen", count: 1 },
        { name: "Dining Room", count: 1 },
        { name: "Study Room", count: 1 },
        { name: "Home Theatre", count: 1 },
        { name: "Puja Room", count: 1 },
        { name: "Entrance / Foyer", count: 1 },
        { name: "Staircase", count: 1 },
        { name: "Balcony 1", count: 1 },
        { name: "Balcony 2", count: 1 },
        { name: "Terrace", count: 1 },
      ],
    },
    {
      name: "Villa",
      description: "Independent villa / bungalow",
      rooms: [
        { name: "Living Room", count: 1 },
        { name: "Master Bedroom", count: 1 },
        { name: "Bedroom 2", count: 1 },
        { name: "Bedroom 3", count: 1 },
        { name: "Bedroom 4", count: 1 },
        { name: "Guest Room", count: 1 },
        { name: "Kids Room", count: 1 },
        { name: "Kitchen", count: 1 },
        { name: "Dining Room", count: 1 },
        { name: "Study Room", count: 1 },
        { name: "Home Office", count: 1 },
        { name: "Home Theatre", count: 1 },
        { name: "Gym", count: 1 },
        { name: "Puja Room", count: 1 },
        { name: "Powder Room", count: 1 },
        { name: "Entrance / Foyer", count: 1 },
        { name: "Staircase", count: 1 },
        { name: "Corridor", count: 1 },
        { name: "Balcony 1", count: 1 },
        { name: "Balcony 2", count: 1 },
        { name: "Terrace", count: 1 },
        { name: "Garden", count: 1 },
        { name: "Garage", count: 1 },
        { name: "Servant Room", count: 1 },
        { name: "Laundry", count: 1 },
      ],
    },
    {
      name: "Penthouse",
      description: "Luxury penthouse apartment",
      rooms: [
        { name: "Living Room", count: 1 },
        { name: "Master Bedroom", count: 1 },
        { name: "Bedroom 2", count: 1 },
        { name: "Bedroom 3", count: 1 },
        { name: "Guest Room", count: 1 },
        { name: "Kitchen", count: 1 },
        { name: "Dining Room", count: 1 },
        { name: "Study Room", count: 1 },
        { name: "Home Theatre", count: 1 },
        { name: "Gym", count: 1 },
        { name: "Puja Room", count: 1 },
        { name: "Powder Room", count: 1 },
        { name: "Entrance / Foyer", count: 1 },
        { name: "Balcony 1", count: 1 },
        { name: "Balcony 2", count: 1 },
        { name: "Terrace", count: 1 },
        { name: "Laundry", count: 1 },
      ],
    },
  ];

  const allRoomTypes = await prisma.roomType.findMany();
  const roomTypeMap = new Map(allRoomTypes.map((rt) => [rt.name, rt.id]));

  for (let i = 0; i < houseTypesData.length; i++) {
    const htData = houseTypesData[i];
    const ht = await prisma.houseType.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        name: htData.name,
        description: htData.description,
        sortOrder: i * 10,
        isActive: true,
      },
    });

    await prisma.houseTypeRoomTemplate.deleteMany({ where: { houseTypeId: ht.id } });
    for (let j = 0; j < htData.rooms.length; j++) {
      const roomTypeId = roomTypeMap.get(htData.rooms[j].name);
      if (roomTypeId) {
        await prisma.houseTypeRoomTemplate.create({
          data: {
            houseTypeId: ht.id,
            roomTypeId,
            defaultCount: htData.rooms[j].count,
            sortOrder: j * 10,
          },
        });
      }
    }
  }
  console.log(`✅ ${houseTypesData.length} House Types with room templates`);

  // ── Categories (Flat Series/Categories) ──
  // Disconnect categories from products first to avoid foreign key issues
  await prisma.product.updateMany({ data: { categoryId: null } });
  // Clean up all existing categories to ensure we don't have stale levels 2/3
  await prisma.category.deleteMany({});

  const seedCategories = [
    {
      id: 1, name: "Tactus",
      variantTiers: [
        { value: "remote", label: "Remote Control" },
        { value: "wifi", label: "WiFi Smart" },
        { value: "zigbee", label: "Zigbee Protocol" },
      ],
      variantFinishes: [
        { value: "acrylic", label: "Acrylic Panel" },
        { value: "glass", label: "Glass Panel" },
      ],
    },
    {
      id: 2, name: "Tactus Edge",
      variantTiers: [
        { value: "wifi", label: "WiFi Smart" },
        { value: "zigbee", label: "Zigbee Protocol" },
      ],
      variantFinishes: [
        { value: "acrylic", label: "Acrylic Panel" },
        { value: "glass", label: "Glass Panel" },
      ],
    },
    {
      id: 3, name: "Tactus VLuxe",
      variantTiers: [
        { value: "wifi", label: "WiFi Smart" },
        { value: "zigbee", label: "Zigbee Protocol" },
      ],
      variantFinishes: [
        { value: "metal", label: "Metal Plate" },
        { value: "glass", label: "Glass Panel" },
      ],
    },
    {
      id: 4, name: "Retro Series",
      variantTiers: [],
      variantFinishes: [
        { value: "metal", label: "Metal Plate" },
        { value: "wood", label: "Wood Finish" },
      ],
    },
    {
      id: 5, name: "Retrofit Modules",
      variantTiers: [
        { value: "wifi", label: "WiFi Smart" },
        { value: "zigbee", label: "Zigbee Protocol" },
      ],
      variantFinishes: [],
    },
    { id: 6, name: "Accessories", variantTiers: [], variantFinishes: [] },
    { id: 7, name: "Smart Curtains", variantTiers: [], variantFinishes: [] },
    { id: 8, name: "Smart Locks", variantTiers: [], variantFinishes: [] },
    { id: 9, name: "Video Door Phones (VDP)", variantTiers: [], variantFinishes: [] },
  ];

  for (const cat of seedCategories) {
    await prisma.category.create({
      data: {
        id: cat.id,
        name: cat.name,
        level: 1,
        parentId: null,
        sortOrder: cat.id * 10,
        isActive: true,
        variantTiers: cat.variantTiers,
        variantFinishes: cat.variantFinishes,
      },
    });
  }
  console.log("✅ Categories (Flat Series/Product Lines)");

  // ══════════════════════════════════════════════════════════════
  // ── Products with Variants ──
  // Each product gets variant rows for its pricing combinations.
  // Real Tactus Pricelist 2026 data for switch boards.
  // ══════════════════════════════════════════════════════════════

  // --- TACTUS Switch Boards (6 variants each: remote/wifi/zigbee × acrylic/glass) ---
  // Category: Tactus (id=1) — linked at series level

  const tactus6Variants = (ra: number, rg: number, wa: number, wg: number, za: number, zg: number) => [
    { automationTier: "remote", surfaceFinish: "acrylic", price: ra },
    { automationTier: "remote", surfaceFinish: "glass", price: rg },
    { automationTier: "wifi", surfaceFinish: "acrylic", price: wa },
    { automationTier: "wifi", surfaceFinish: "glass", price: wg },
    { automationTier: "zigbee", surfaceFinish: "acrylic", price: za },
    { automationTier: "zigbee", surfaceFinish: "glass", price: zg },
  ];

  // Touch 4 Switch (All 6A Switch) — 2 Module
  await upsertProductWithVariants(
    { name: "Touch 4 Switch (All 6A)", code: "T4S-2M", type: ProductType.switch_board, categoryId: 1, moduleSize: "2M", description: "4 Switch 2 Module Touch Panel", sortOrder: 10 },
    tactus6Variants(5799, 6599, 8599, 9399, 10699, 11599)
  );

  // Touch 4 Switch (2-16A + 2-6A) — 2 Module
  await upsertProductWithVariants(
    { name: "Touch 4 Switch (2×16A + 2×6A)", code: "T4S16A-2M", type: ProductType.switch_board, categoryId: 1, moduleSize: "2M", description: "4 Switch (2×16A + 2×6A) 2 Module", sortOrder: 20 },
    tactus6Variants(5799, 6599, 8599, 9399, 10699, 11599)
  );

  // Touch 6 Switch — 4 Module
  await upsertProductWithVariants(
    { name: "Touch 6 Switch", code: "T6S-4M", type: ProductType.switch_board, categoryId: 1, moduleSize: "4M", description: "6 Switch 4 Module Touch Panel", sortOrder: 30 },
    tactus6Variants(7499, 8399, 10299, 11199, 12399, 13399)
  );

  // Touch 4 Switch 1 Fan Regulator — 4 Module
  await upsertProductWithVariants(
    { name: "Touch 4 Switch 1 Fan", code: "T4S1F-4M", type: ProductType.switch_board, categoryId: 1, moduleSize: "4M", description: "4 Switch + 1 Fan Regulator 4 Module", sortOrder: 40 },
    tactus6Variants(9099, 10199, 11899, 12999, 13999, 15199)
  );

  // Touch 8 Switch — 6 Module
  await upsertProductWithVariants(
    { name: "Touch 8 Switch", code: "T8S-6M", type: ProductType.switch_board, categoryId: 1, moduleSize: "6M", description: "8 Switch 6 Module Touch Panel", sortOrder: 50 },
    tactus6Variants(9599, 10699, 12899, 13999, 15199, 16399)
  );

  // Touch 6 Switch 1 Fan — 6 Module
  await upsertProductWithVariants(
    { name: "Touch 6 Switch 1 Fan", code: "T6S1F-6M", type: ProductType.switch_board, categoryId: 1, moduleSize: "6M", description: "6 Switch + 1 Fan Regulator 6 Module", sortOrder: 60 },
    tactus6Variants(11399, 12699, 14599, 15899, 17099, 18499)
  );

  // Touch 8 Switch 1 Fan — 8 Module
  await upsertProductWithVariants(
    { name: "Touch 8 Switch 1 Fan", code: "T8S1F-8M", type: ProductType.switch_board, categoryId: 1, moduleSize: "8M", description: "8 Switch + 1 Fan Regulator 8 Module", sortOrder: 70 },
    tactus6Variants(13499, 15099, 17099, 18699, 20099, 21799)
  );

  // Touch 10 Switch — 8 Module
  await upsertProductWithVariants(
    { name: "Touch 10 Switch", code: "T10S-8M", type: ProductType.switch_board, categoryId: 1, moduleSize: "8M", description: "10 Switch 8 Module Touch Panel", sortOrder: 80 },
    tactus6Variants(12599, 14099, 16399, 17899, 19199, 20899)
  );

  // Touch 10 Switch 2 Fan — 12 Module
  await upsertProductWithVariants(
    { name: "Touch 10 Switch 2 Fan", code: "T10S2F-12M", type: ProductType.switch_board, categoryId: 1, moduleSize: "12M", description: "10 Switch + 2 Fan Regulator 12 Module", sortOrder: 90 },
    tactus6Variants(20599, 23099, 26199, 28699, 30299, 32899)
  );

  // Touch 12 Switch 2 Fan — 12 Module
  await upsertProductWithVariants(
    { name: "Touch 12 Switch 2 Fan", code: "T12S2F-12M", type: ProductType.switch_board, categoryId: 1, moduleSize: "12M", description: "12 Switch + 2 Fan Regulator 12 Module", sortOrder: 100 },
    tactus6Variants(22599, 25099, 28199, 30699, 32499, 34999)
  );

  // Bell + Touch 2 Switch — 2 Module
  await upsertProductWithVariants(
    { name: "Bell + Touch 2 Switch", code: "BL2S-2M", type: ProductType.switch_board, categoryId: 1, moduleSize: "2M", description: "Bell + 2 Switch 2 Module", sortOrder: 110 },
    tactus6Variants(4299, 4999, 6699, 7399, 8199, 8999)
  );

  // 4 Scene Controller — 2 Module
  await upsertProductWithVariants(
    { name: "4 Scene Controller", code: "SCN4-2M", type: ProductType.switch_board, categoryId: 1, moduleSize: "2M", description: "4 Scene Push Button Controller", sortOrder: 120 },
    tactus6Variants(5499, 6299, 7999, 8799, 9599, 10499)
  );

  // Curtain Controller — 2 Module
  await upsertProductWithVariants(
    { name: "Curtain Controller (Touch)", code: "CURT-2M", type: ProductType.switch_board, categoryId: 1, moduleSize: "2M", description: "Touch Curtain Controller Panel", sortOrder: 130 },
    tactus6Variants(5299, 5999, 7799, 8499, 9199, 9999)
  );

  // --- Single-price products (1 variant each: null tier + null finish) ---

  // Accessories
  await upsertProductWithVariants(
    { name: "Smart IR Blaster", code: "IR-BL01", type: ProductType.accessory, categoryId: 6, description: "Universal IR blaster for AC/TV control", sortOrder: 200 },
    [{ automationTier: null, surfaceFinish: null, price: 2500 }]
  );

  await upsertProductWithVariants(
    { name: "Motion Sensor", code: "MS-01", type: ProductType.accessory, categoryId: 6, description: "PIR motion sensor with WiFi", sortOrder: 210 },
    [{ automationTier: null, surfaceFinish: null, price: 1800 }]
  );

  await upsertProductWithVariants(
    { name: "Zigbee Gateway", code: "ZB-GW01", type: ProductType.accessory, categoryId: 6, description: "Zigbee Hub/Gateway for Zigbee devices", sortOrder: 220 },
    [{ automationTier: null, surfaceFinish: null, price: 4500 }]
  );

  await upsertProductWithVariants(
    { name: "WiFi Gateway", code: "WF-GW01", type: ProductType.accessory, categoryId: 6, description: "WiFi Gateway for centralized control", sortOrder: 230 },
    [{ automationTier: null, surfaceFinish: null, price: 3500 }]
  );

  await upsertProductWithVariants(
    { name: "Curtain Remote", code: "CURT-R1", type: ProductType.accessory, categoryId: 6, description: "RF Remote for curtain motor", sortOrder: 240 },
    [{ automationTier: null, surfaceFinish: null, price: 1200 }]
  );

  // Curtain
  await upsertProductWithVariants(
    { name: "Curtain Motor", code: "CURT-M1", type: ProductType.curtain, categoryId: 7, unit: "set", description: "WiFi Smart Curtain Motor with rail", sortOrder: 300 },
    [{ automationTier: null, surfaceFinish: null, price: 8500 }]
  );

  // Smart Locks
  await upsertProductWithVariants(
    { name: "Smart Door Lock Series 1 Pro", code: "SDL-S1P", type: ProductType.smart_lock, categoryId: 8, description: "Fingerprint + RFID + PIN smart lock", sortOrder: 400 },
    [{ automationTier: null, surfaceFinish: null, price: 25000 }]
  );

  await upsertProductWithVariants(
    { name: "Smart Door Lock Series 4", code: "SDL-S4", type: ProductType.smart_lock, categoryId: 8, description: "Advanced smart lock with multiple access", sortOrder: 410 },
    [{ automationTier: null, surfaceFinish: null, price: 35000 }]
  );

  // VDP
  await upsertProductWithVariants(
    { name: "VDP Indoor Unit", code: "VDP-IN", type: ProductType.vdp, categoryId: 9, description: "7 inch indoor display unit", sortOrder: 500 },
    [{ automationTier: null, surfaceFinish: null, price: 15000 }]
  );

  await upsertProductWithVariants(
    { name: "VDP Outdoor Unit", code: "VDP-OUT", type: ProductType.vdp, categoryId: 9, description: "Outdoor camera unit with intercom", sortOrder: 510 },
    [{ automationTier: null, surfaceFinish: null, price: 8000 }]
  );

  // --- Retrofit (2 variants each: wifi/zigbee, no finish) ---
  await upsertProductWithVariants(
    { name: "Retrofit Mono", code: "RETRO-MONO", type: ProductType.retrofit, categoryId: 5, description: "1-channel retrofit switch module", sortOrder: 600 },
    [
      { automationTier: "wifi", surfaceFinish: null, price: 1999 },
      { automationTier: "zigbee", surfaceFinish: null, price: 2499 },
    ]
  );

  await upsertProductWithVariants(
    { name: "Retrofit Duo", code: "RETRO-DUO", type: ProductType.retrofit, categoryId: 5, description: "2-channel retrofit switch module", sortOrder: 610 },
    [
      { automationTier: "wifi", surfaceFinish: null, price: 2499 },
      { automationTier: "zigbee", surfaceFinish: null, price: 2999 },
    ]
  );

  await upsertProductWithVariants(
    { name: "Retrofit Quad", code: "RETRO-QUAD", type: ProductType.retrofit, categoryId: 5, description: "4-channel retrofit switch module", sortOrder: 620 },
    [
      { automationTier: "wifi", surfaceFinish: null, price: 3499 },
      { automationTier: "zigbee", surfaceFinish: null, price: 3999 },
    ]
  );

  await upsertProductWithVariants(
    { name: "Retrofit Hexa", code: "RETRO-HEXA", type: ProductType.retrofit, categoryId: 5, description: "6-channel retrofit switch module", sortOrder: 630 },
    [
      { automationTier: "wifi", surfaceFinish: null, price: 4499 },
      { automationTier: "zigbee", surfaceFinish: null, price: 4999 },
    ]
  );

  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  console.log(`✅ ${productCount} Products with ${variantCount} Variants`);

  console.log("\n🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
