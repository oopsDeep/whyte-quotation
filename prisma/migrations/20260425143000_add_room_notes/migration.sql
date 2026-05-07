-- Add room-wise notes for technician/customer instructions
ALTER TABLE "QuotationRoom"
ADD COLUMN "notes" TEXT;
