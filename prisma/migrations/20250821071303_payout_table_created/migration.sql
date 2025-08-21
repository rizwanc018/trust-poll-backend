-- CreateEnum
CREATE TYPE "public"."TxnStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Payouts" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" "public"."TxnStatus" NOT NULL,
    "txn_sign" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payouts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Payouts" ADD CONSTRAINT "Payouts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
