-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('switch_board', 'accessory', 'retrofit', 'curtain', 'smart_lock', 'vdp', 'other');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('draft', 'sent', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed', 'none');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'admin', 'sales');

-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "logoUrl" TEXT,
    "tagline" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "parentId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "type" "ProductType" NOT NULL,
    "categoryId" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "imageUrl" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HouseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseTypeRoomTemplate" (
    "id" SERIAL NOT NULL,
    "houseTypeId" INTEGER NOT NULL,
    "roomTypeId" INTEGER NOT NULL,
    "defaultCount" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HouseTypeRoomTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "clientAddress" TEXT,
    "houseTypeId" INTEGER,
    "status" "QuotationStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(10,2),
    "terms" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationRoom" (
    "id" SERIAL NOT NULL,
    "quotationId" TEXT NOT NULL,
    "roomTypeId" INTEGER,
    "customName" TEXT,
    "subArea" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationItem" (
    "id" SERIAL NOT NULL,
    "quotationRoomId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "sbNumber" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'sales',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseTypeRoomTemplate" ADD CONSTRAINT "HouseTypeRoomTemplate_houseTypeId_fkey" FOREIGN KEY ("houseTypeId") REFERENCES "HouseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseTypeRoomTemplate" ADD CONSTRAINT "HouseTypeRoomTemplate_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_houseTypeId_fkey" FOREIGN KEY ("houseTypeId") REFERENCES "HouseType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationRoom" ADD CONSTRAINT "QuotationRoom_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationRoom" ADD CONSTRAINT "QuotationRoom_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_quotationRoomId_fkey" FOREIGN KEY ("quotationRoomId") REFERENCES "QuotationRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationItem" ADD CONSTRAINT "QuotationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
