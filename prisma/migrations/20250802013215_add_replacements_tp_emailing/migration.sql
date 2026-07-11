/*
  Warnings:

  - You are about to drop the column `key` on the `EmailLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmailLog" DROP COLUMN "key",
ADD COLUMN     "templateKey" TEXT;
