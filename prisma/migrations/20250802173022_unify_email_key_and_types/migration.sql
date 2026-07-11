/*
  Warnings:

  - You are about to drop the column `templateKey` on the `EmailLog` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `EmailLog` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `EmailTemplate` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "EmailContentType" AS ENUM ('text', 'html', 'both');

-- AlterTable
ALTER TABLE "EmailLog" DROP COLUMN "templateKey",
DROP COLUMN "type",
ADD COLUMN     "emailType" TEXT,
ADD COLUMN     "key" TEXT;

-- AlterTable
ALTER TABLE "EmailTemplate" DROP COLUMN "type",
ADD COLUMN     "contentType" "EmailContentType";

-- DropEnum
DROP TYPE "EmailType";
