/*
  Warnings:

  - You are about to drop the column `fullName` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `deviceType` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `fcmToken` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "duration" INTEGER;

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "metadata" JSONB;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "fullName";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "deviceType",
DROP COLUMN "fcmToken";

-- DropEnum
DROP TYPE "DeviceType";
