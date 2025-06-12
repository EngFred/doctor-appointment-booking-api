-- AlterTable
ALTER TABLE "Hospital" ADD COLUMN     "about" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "services" TEXT[];
