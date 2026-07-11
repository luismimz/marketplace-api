/*
  Warnings:

  - You are about to drop the column `variables` on the `EmailTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmailTemplate" DROP COLUMN "variables",
ADD COLUMN     "replacements" TEXT;
