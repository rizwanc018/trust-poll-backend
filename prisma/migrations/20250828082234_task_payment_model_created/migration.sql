-- CreateTable
CREATE TABLE "public"."TaskPayment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,

    CONSTRAINT "TaskPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskPayment_task_id_key" ON "public"."TaskPayment"("task_id");

-- CreateIndex
CREATE INDEX "TaskPayment_signature_idx" ON "public"."TaskPayment"("signature");

-- AddForeignKey
ALTER TABLE "public"."TaskPayment" ADD CONSTRAINT "TaskPayment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaskPayment" ADD CONSTRAINT "TaskPayment_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
