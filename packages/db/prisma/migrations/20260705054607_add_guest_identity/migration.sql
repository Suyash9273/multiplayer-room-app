/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `GuestIdentity` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `displayName` to the `GuestIdentity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `GuestIdentity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `token` to the `GuestIdentity` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "GuestIdentity_socketId_key";

-- AlterTable
ALTER TABLE "GuestIdentity" ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "token" TEXT NOT NULL,
ALTER COLUMN "socketId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "GuestIdentity_token_key" ON "GuestIdentity"("token");
