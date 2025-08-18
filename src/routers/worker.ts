import { Router } from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import jwt from "jsonwebtoken";
import { workerAuthMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();
const prismaClient = new PrismaClient();
const WORKER_JWT_SECRET = process.env.JWT_SECRET + "worker";

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

    const tasks = await prismaClient.task.findFirst({
        where: {
            Submissions: {
                none: {
                    worker_id: worker_id,
                },
            },
        },
        include: {
            Options: true,
        },
    });

    res.json({ tasks });
});

export default router;
