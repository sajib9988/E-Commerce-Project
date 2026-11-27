-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_subcategoryId_fkey";

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "subcategoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
