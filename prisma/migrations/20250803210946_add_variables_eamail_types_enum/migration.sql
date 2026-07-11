/*
  Warnings:

  - The `emailType` column on the `EmailTemplate` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('critico', 'info', 'newsletter', 'alerta');

-- AlterTable
ALTER TABLE "EmailTemplate" ADD COLUMN     "variables" TEXT[],
DROP COLUMN "emailType",
ADD COLUMN     "emailType" "EmailType";
