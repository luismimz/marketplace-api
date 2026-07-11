/*
  Warnings:

  - You are about to drop the column `templateKey` on the `EmailLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmailLog" DROP COLUMN "templateKey",
ADD COLUMN     "key" TEXT;
