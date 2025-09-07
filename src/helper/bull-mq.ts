import { Queue, Worker } from "bullmq";
import {
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { PrismaClient } from "../generated/prisma/index.js";
import { OWNER_ADDRESS, OWNER_PRIVATE_KEY } from "../config.js";
import { tr } from "zod/locales";

const prismaClient = new PrismaClient();

const withdrawQueue = new Queue("withdraw", {
    connection: {
        host: "localhost",
        port: 6379,
    },
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
    },
});

const withdrawWorker = new Worker(
    "withdraw",
    async (job) => {
        const { workerId, payoutId, amount, toAddress } = job.data;

        let signature = "signature_placeholder";

        try {
            const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
            const keypair = Keypair.fromSecretKey(bs58.decode(OWNER_PRIVATE_KEY));

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(OWNER_ADDRESS),
                    toPubkey: new PublicKey(toAddress),
                    lamports: Number(amount),
                })
            );

            signature = await sendAndConfirmTransaction(connection, transaction, [keypair]);

            await prismaClient.$transaction(async (tx) => {
                await tx.payouts.update({
                    where: { id: payoutId },
                    data: {
                        status: "COMPLETED",
                        txn_sign: signature,
                    },
                });

                const worker = await tx.worker.findUnique({
                    where: { id: workerId },
                    select: { locked_amount: true },
                });

                if (worker) {
                    const newLockedAmount = Math.max(0, Number(worker.locked_amount) - Number(amount));
                    await tx.worker.update({
                        where: { id: workerId },
                        data: {
                            locked_amount: newLockedAmount.toString(),
                        },
                    });
                }
            });

            return { success: true, signature };
        } catch (error) {
            await prismaClient.$transaction(async (tx) => {
                const worker = await tx.worker.findUnique({
                    where: { id: workerId },
                    select: { locked_amount: true, pending_amount: true },
                });

                if (worker) {
                    const currentLocked = Number(worker.locked_amount);
                    const restoredLocked = Math.max(0, currentLocked - Number(amount));
                    const restoredPending = Number(worker.pending_amount) + Number(amount);

                    await tx.worker.update({
                        where: { id: workerId },
                        data: {
                            pending_amount: restoredPending.toString(),
                            locked_amount: restoredLocked.toString(),
                        },
                    });
                }

                await tx.payouts.update({
                    where: { id: payoutId },
                    data: {
                        status: "FAILED",
                        txn_sign: signature,
                    },
                });
            });

            throw error;
        }
    },
    {
        connection: {
            host: "localhost",
            port: 6379,
        },
        concurrency: 5,
    }
);

withdrawWorker.on("completed", (job) => {
    console.log("🚀 ~ job data🚀", job.data);

    console.log(`Withdrawal job ${job.id} completed with signature:`, job.returnvalue?.signature);
});

withdrawWorker.on("failed", (job, error) => {
    console.log("🚀 ~ job🚀", job);

    console.error(`Withdrawal job ${job?.id} failed:`, error.message);
});

export { withdrawQueue, withdrawWorker };
