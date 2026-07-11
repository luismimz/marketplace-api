/*
  Warnings:

  - You are about to drop the column `replacements` on the `EmailTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmailTemplate" DROP COLUMN "replacements",
ADD COLUMN     "variables" TEXT[];
