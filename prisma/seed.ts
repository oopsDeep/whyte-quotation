import { PrismaClient, ProductType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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

  // ── Room Types (32) ──
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

  // Keep bathroom-like room types out of active defaults even in previously seeded DBs.
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

  // Get all room types for lookup
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

    // Clear existing templates and recreate
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

  // ── Categories (variable-depth tree: 2-level and 3-level examples) ──
  const categories: Array<{
    name: string;
    children?: Array<{
      name: string;
      children?: Array<{ name: string }>;
    }>;
  }> = [
    {
      // 3-level: Series → Category → Subcategory
      name: "Tactus",
      children: [
        {
          name: "Glass",
          children: [{ name: "Wifi" }, { name: "Zigbee" }, { name: "Remote" }],
        },
        {
          name: "Acrylic",
          children: [{ name: "Wifi" }, { name: "Zigbee" }, { name: "Remote" }],
        },
      ],
    },
    {
      // 3-level
      name: "Tactus Edge",
      children: [
        {
          name: "Glass",
          children: [{ name: "Wifi" }, { name: "Zigbee" }],
        },
        {
          name: "Acrylic",
          children: [{ name: "Wifi" }, { name: "Zigbee" }],
        },
      ],
    },
    {
      // 3-level
      name: "Tactus VLuxe",
      children: [
        {
          name: "Metal",
          children: [{ name: "Wifi" }, { name: "Zigbee" }],
        },
        {
          name: "Glass",
          children: [{ name: "Wifi" }],
        },
      ],
    },
    {
      // 2-level ONLY: Series → Category (no subcategory)
      name: "Retro Series",
      children: [
        { name: "Metal" },
        { name: "Wood" },
      ],
    },
  ];

  for (let i = 0; i < categories.length; i++) {
    const l1 = await prisma.category.upsert({
      where: { id: i * 100 + 1 },
      update: { name: categories[i].name },
      create: {
        id: i * 100 + 1,
        name: categories[i].name,
        level: 1,
        sortOrder: i * 10,
      },
    });

    for (let j = 0; j < (categories[i].children?.length ?? 0); j++) {
      const l2Data = categories[i].children![j];
      const l2 = await prisma.category.upsert({
        where: { id: i * 100 + (j + 1) * 10 + 1 },
        update: { name: l2Data.name },
        create: {
          id: i * 100 + (j + 1) * 10 + 1,
          name: l2Data.name,
          level: 2,
          parentId: l1.id,
          sortOrder: j * 10,
        },
      });

      for (let k = 0; k < (l2Data.children?.length ?? 0); k++) {
        await prisma.category.upsert({
          where: { id: i * 100 + (j + 1) * 10 + k + 2 },
          update: { name: l2Data.children![k].name },
          create: {
            id: i * 100 + (j + 1) * 10 + k + 2,
            name: l2Data.children![k].name,
            level: 3,
            parentId: l2.id,
            sortOrder: k * 10,
          },
        });
      }
    }
  }
  console.log("✅ Categories (variable-depth tree)");

  // ── Sample Products ──
  // Category IDs from seed: Tactus→Glass→Wifi=12, Tactus→Glass→Zigbee=13,
  // Tactus→Acrylic→Wifi=22, Tactus Edge→Glass→Wifi=112,
  // Retro→Metal=311 (2-level leaf), Retro→Wood=321 (2-level leaf)
  const products = [
    { name: "8S-6M Touch Panel", code: "8S-6M", type: ProductType.switch_board, price: 4500, unit: "pcs", categoryId: 12, description: "8 Switch 6 Module Glass Wifi Panel" },
    { name: "4S-4M Touch Panel", code: "4S-4M", type: ProductType.switch_board, price: 3200, unit: "pcs", categoryId: 12, description: "4 Switch 4 Module Glass Wifi Panel" },
    { name: "2S-2M Touch Panel", code: "2S-2M", type: ProductType.switch_board, price: 2200, unit: "pcs", categoryId: 12, description: "2 Switch 2 Module Glass Wifi Panel" },
    { name: "Fan Regulator Panel", code: "FAN-REG", type: ProductType.switch_board, price: 2800, unit: "pcs", categoryId: 22, description: "Acrylic Wifi Fan Regulator with display" },
    { name: "Zigbee 4S-4M Panel", code: "ZB-4S4M", type: ProductType.switch_board, price: 3800, unit: "pcs", categoryId: 13, description: "Zigbee 4 Switch Glass Panel" },
    { name: "Smart Scene Switch", code: "SCN-04", type: ProductType.switch_board, price: 3500, unit: "pcs", categoryId: 12, description: "4 Scene push-button panel" },
    { name: "Edge 4S Panel", code: "EDGE-4S", type: ProductType.switch_board, price: 4200, unit: "pcs", categoryId: 112, description: "Tactus Edge Glass Wifi 4 Switch Panel" },
    { name: "Retro Metal Switch", code: "RETRO-M1", type: ProductType.switch_board, price: 2000, unit: "pcs", categoryId: 311, description: "Retro Series Metal finish switch" },
    { name: "Retro Wood Switch", code: "RETRO-W1", type: ProductType.switch_board, price: 2500, unit: "pcs", categoryId: 321, description: "Retro Series Wood finish switch" },
    { name: "Curtain Motor", code: "CURT-M1", type: ProductType.curtain, price: 8500, unit: "set", description: "WiFi Smart Curtain Motor with rail" },
    { name: "Curtain Remote", code: "CURT-R1", type: ProductType.accessory, price: 1200, unit: "pcs", description: "RF Remote for curtain motor" },
    { name: "Smart Door Lock", code: "SDL-100", type: ProductType.smart_lock, price: 25000, unit: "pcs", description: "Fingerprint + RFID + PIN smart lock" },
    { name: "VDP Indoor Unit", code: "VDP-IN", type: ProductType.vdp, price: 15000, unit: "pcs", description: "7 inch indoor display unit" },
    { name: "VDP Outdoor Unit", code: "VDP-OUT", type: ProductType.vdp, price: 8000, unit: "pcs", description: "Outdoor camera unit with intercom" },
    { name: "Smart IR Blaster", code: "IR-BL01", type: ProductType.accessory, price: 2500, unit: "pcs", description: "Universal IR blaster for AC/TV control" },
    { name: "Motion Sensor", code: "MS-01", type: ProductType.accessory, price: 1800, unit: "pcs", description: "PIR motion sensor with WiFi" },
    { name: "Zigbee Gateway", code: "ZB-GW01", type: ProductType.accessory, price: 4500, unit: "pcs", description: "Zigbee Hub/Gateway for Zigbee devices" },
    { name: "WiFi Gateway", code: "WF-GW01", type: ProductType.accessory, price: 3500, unit: "pcs", description: "WiFi Gateway for centralized control" },
  ];

  for (const p of products) {
    // Safe approach: check if product with this code already exists
    const existing = await prisma.product.findFirst({ where: { code: p.code } });
    if (!existing) {
      await prisma.product.create({
        data: {
          name: p.name,
          code: p.code,
          type: p.type,
          price: p.price,
          unit: p.unit,
          categoryId: p.categoryId ?? null,
          description: p.description ?? null,
          sortOrder: 0,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ ${products.length} Products`);

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
