-- Add GST tracking for company and optional customer GST on quotations
ALTER TABLE "Company"
ADD COLUMN "gstNumber" TEXT;

ALTER TABLE "Quotation"
ADD COLUMN "clientGstNumber" TEXT;
