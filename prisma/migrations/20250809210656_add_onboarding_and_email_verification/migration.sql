-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('REGISTERED', 'PLAN_SELECTED', 'PAYMENT_CONFIRMED', 'ACTIVE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "OnboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN     "emailVerificationCode" TEXT,
ADD COLUMN     "emailVerificationExpiresAt" TIMESTAMP(3);
