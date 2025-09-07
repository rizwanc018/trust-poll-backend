import { Router } from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import jwt from "jsonwebtoken";
import { workerAuthMiddleware } from "../middlewares/authMiddleware.js";
import { JWT_EXPIRATION, WORKER_JWT_SECRET, TOTAL_SUBMISSIONS } from "../config.js";
import { getNextTaskForWorker, verifySignature } from "../helper/worker.js";
import { withdrawQueue } from "../helper/bull-mq.js";

const router = Router();
const prismaClient = new PrismaClient();

router.post("/signin", async (req, res) => {
    const { publicKey, signature, message } = req.body;

    if (!publicKey || !signature || !message) {
        return res.status(400).json({ error: "Missing fields" });
    }

    const isValid = await verifySignature(publicKey, signature, message);
    if (!isValid) {
        return res.status(401).json({ error: "Invalid signature" });
    }
    const existingWorker = await prismaClient.worker.findUnique({
        where: {
            wallet: publicKey,
        },
    });

    if (existingWorker) {
        const token = jwt.sign({ workerId: existingWorker.id }, WORKER_JWT_SECRET!, {
            expiresIn: JWT_EXPIRATION,
        });
        res.status(200).json({
            token,
            pending_amount: existingWorker.pending_amount,
        });
    } else {
        const worker = await prismaClient.worker.create({
            data: {
                wallet: publicKey,
                pending_amount: "0",
                locked_amount: "0",
            },
        });
        const token = jwt.sign({ workerId: worker.id }, WORKER_JWT_SECRET!, {
            expiresIn: JWT_EXPIRATION,
        });

        res.status(200).json({
            token,
            pending_amount: worker.pending_amount,
        });
    }
});

router.get("/next-task", workerAuthMiddleware, async (req, res) => {
    const worker_id = req.workerId;
    if (!worker_id) {
        return res.status(400).json({ message: "Worker ID is required" });
    }

    try {
        const task = await getNextTaskForWorker(worker_id);

        if (!task) {
            return res.json({ message: "No more tasks" });
        }
        res.json({ task });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/submission", workerAuthMiddleware, async (req, res) => {
    const { taskId, optionId } = req.body;
    const workerId = req.workerId as string;

    if (!taskId || !optionId) {
        return res.status(400).json({ message: "Task ID and Option ID are required" });
    }
    try {
        const task = await getNextTaskForWorker(workerId);

        if (!task) {
            return res.status(404).json({ message: "No more tasks" });
        }

        const totalVotes = task.Options.reduce((curr, option) => {
            const voteCount = option.voteCount || 0;
            return curr + voteCount;
        }, 0);

        const amount = (Number(task.amount) / TOTAL_SUBMISSIONS).toString();

        await prismaClient.$transaction(async (tx) => {
            await tx.submission.create({
                data: {
                    task_id: taskId,
                    worker_id: workerId,
                    option_id: optionId,
                    amount: amount,
                },
            });

            await tx.option.update({
                where: { id: optionId },
                data: { voteCount: { increment: 1 } },
            });

            if (totalVotes + 1 >= TOTAL_SUBMISSIONS) {
                await tx.task.update({
                    where: { id: taskId },
                    data: { done: true },
                });
            }

            const worker = await tx.worker.findUnique({
                where: { id: workerId },
                select: { pending_amount: true },
            });

            if (worker) {
                const currentPending = Number(worker.pending_amount);
                const newPendingAmount = (currentPending + Number(amount)).toString();

                await tx.worker.update({
                    where: { id: workerId },
                    data: {
                        pending_amount: newPendingAmount,
                    },
                });
            }
        });

        const nextTask = await getNextTaskForWorker(workerId);

        res.status(201).json({ task: nextTask, amount });
    } catch (error) {
        return res.status(500).json({ message: "Error submitting your vote" });
    }
});

router.get("/balance", workerAuthMiddleware, async (req, res) => {
    const workerId = req.workerId as string;

    if (!workerId) {
        return res.status(400).json({ message: "Worker ID is required" });
    }

    try {
        const worker = await prismaClient.worker.findUnique({
            where: { id: workerId },
            select: {
                pending_amount: true,
                locked_amount: true,
            },
        });

        if (!worker) {
            return res.status(404).json({ message: "Worker not found" });
        }

        res.json({
            pending_amount: worker.pending_amount,
            locked_amount: worker.locked_amount,
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/withdraw", workerAuthMiddleware, async (req, res) => {
    const workerId = req.workerId as string;

    if (!workerId) {
        return res.status(400).json({ message: "Worker ID is required" });
    }

    try {
        const result = await prismaClient.$transaction(
            async (tx) => {
                // Use raw SQL with SELECT FOR UPDATE to lock the row
                // This prevents other transactions from reading or modifying this worker until we're done
                const workers = await tx.$queryRaw<
                    Array<{
                        id: string;
                        wallet: string;
                        pending_amount: string;
                        locked_amount: string;
                    }>
                >`
                    SELECT id, wallet, pending_amount, locked_amount 
                    FROM "Worker" 
                    WHERE id = ${workerId}
                    FOR UPDATE
                `;

                if (!workers || workers.length === 0) {
                    throw new Error("Worker not found");
                }

                const worker = workers[0];
                if (!worker) {
                    throw new Error("Worker not found");
                }
                const pendingAmount = worker.pending_amount;
                const totalLockedAmount = Number(worker.locked_amount) + Number(pendingAmount);

                if (Number(pendingAmount) <= 0) {
                    throw new Error("No balance to withdraw");
                }
                await tx.worker.update({
                    where: { id: workerId },
                    data: {
                        pending_amount: "0",
                        locked_amount: totalLockedAmount.toString(),
                    },
                });

                // Create the payout record
                const payout = await tx.payouts.create({
                    data: {
                        worker_id: workerId,
                        amount: pendingAmount,
                        status: "PENDING",
                        txn_sign: "signature_placeholder",
                    },
                });

                await withdrawQueue.add("withdraw", {
                    workerId,
                    payoutId: payout.id,
                    amount: pendingAmount,
                    toAddress: worker.wallet,
                });

                return { payout, pendingAmount };
            },
            {
                isolationLevel: "Serializable",
                timeout: 10000,
            }
        );

        res.status(201).json({
            message: "Withdrawal request created",
            amount: result.pendingAmount,
        });
    } catch (error: any) {
        if (error.message === "Worker not found") {
            return res.status(404).json({ message: "Worker not found" });
        }
        if (error.message === "No balance to withdraw") {
            return res.status(400).json({ message: "No balance to withdraw" });
        }
        console.error("Withdrawal error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/submission-history", workerAuthMiddleware, async (req, res) => {
    const workerId = req.workerId as string;
    const page = Number(req.query.page as string) || 1;
    const limit = Number(req.query.limit as string) || 10;

    if (!workerId) {
        return res.status(400).json({ message: "Worker ID is required" });
    }

    if (limit > 100) {
        return res.status(400).json({ message: "Limit cannot exceed 100" });
    }

    try {
        const skip = (page - 1) * limit;

        const totalCount = await prismaClient.submission.count({
            where: { worker_id: workerId },
        });

        const submissions = await prismaClient.submission.findMany({
            where: { worker_id: workerId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                amount: true,
                createdAt: true,
                Task: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        amount: true,
                    },
                },
                Option: {
                    select: {
                        id: true,
                        image_url: true,
                        voteCount: true,
                    },
                },
            },
        });

        const totalPages = Math.ceil(totalCount / limit);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        res.json({
            submissions,
            pagination: {
                currentPage: page,
                totalPages,
                totalCount,
                limit,
                hasNextPage,
                hasPreviousPage,
            },
        });
    } catch (error) {
        console.error("Error fetching submission history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
