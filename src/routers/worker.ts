import { Router } from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import jwt from "jsonwebtoken";
import { workerAuthMiddleware } from "../middlewares/authMiddleware.js";
import { WORKER_JWT_SECRET } from "../config.js";
import { getNextTaskForWorker } from "../helper/worker.js";

const router = Router();
const prismaClient = new PrismaClient();

const TOTAL_SUBMISSIONS = 100;

router.post("/signin", async (req, res) => {
    const hardCodedWallet = "4x2aYepNV7KAX4riSKcQySm9pi6Rp8cSNHJwaf4AtGmY";

    const existingWorker = await prismaClient.worker.findUnique({
        where: {
            wallet: hardCodedWallet,
        },
    });

    if (existingWorker) {
        const token = jwt.sign(
            { workerId: existingWorker.id },
            WORKER_JWT_SECRET!
        );
        res.status(200).json({ token });
    } else {
        const worker = await prismaClient.worker.create({
            data: {
                wallet: hardCodedWallet,
                pending_amount: "0",
                locked_amount: "0",
            },
        });
        const token = jwt.sign({ workerId: worker.id }, WORKER_JWT_SECRET!);

        res.status(200).json({ token });
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
            return res.status(404).json({ message: "No more tasks" });
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
        return res
            .status(400)
            .json({ message: "Task ID and Option ID are required" });
    }
    try {
        const task = await getNextTaskForWorker(workerId);

        if (!task) {
            return res.status(404).json({ message: "No more tasks" });
        }

        const amount = (Number(task.amount) / TOTAL_SUBMISSIONS).toString();
        
        await prismaClient.$transaction(async (tx) => {
            await tx.submission.create({
                data: {
                    task_id: taskId,
                    worker_id: workerId,
                    option_id: optionId,
                    amount,
                },
            });

            await tx.option.update({
                where: { id: optionId },
                data: { voteCount: { increment: 1 } },
            });
        });

        const nextTask = await getNextTaskForWorker(workerId);

        res.status(201).json({ task: nextTask, amount });
    } catch (error) {
        return res.status(500).json({ message: "Error submitting your vote" });
    }
});

export default router;
