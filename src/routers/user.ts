import { Router } from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import jwt from "jsonwebtoken";
import { userAuthMiddleware } from "../middlewares/authMiddleware.js";
import { createTaskInput } from "./types.js";
import { JWT_EXPIRATION, TOTAL_DECIMALS, USER_JWT_SECRET } from "../config.js";
import { verifySignature } from "../helper/worker.js";
import { verifyTransaction } from "../helper/user.js";
// import { supabase } from "../utils/supabaseClient.js";

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
    const existingUser = await prismaClient.user.findUnique({
        where: {
            wallet: publicKey,
        },
    });

    if (existingUser) {
        const token = jwt.sign({ userId: existingUser.id }, USER_JWT_SECRET!, {
            expiresIn: JWT_EXPIRATION,
        });
        res.status(200).json({ token });
    } else {
        const user = await prismaClient.user.create({
            data: {
                wallet: publicKey,
            },
        });
        const token = jwt.sign({ userId: user.id }, USER_JWT_SECRET!, {
            expiresIn: JWT_EXPIRATION,
        });

        res.status(200).json({ token });
    }
});

router.post("/task", userAuthMiddleware, async (req, res) => {
    const body = req.body;
    try {
        const parsedData = createTaskInput.safeParse(body);

        if (!parsedData.success) {
            return res.status(400).json({ error: parsedData.error });
        }

        const existingPayment = await prismaClient.taskPayment.findFirst({
            where: {
                signature: parsedData.data.signature,
            },
        });

        if (existingPayment) {
            return res.status(400).json({ 
                error: "Transaction signature already used", 
                details: "This transaction has already been processed for another task" 
            });
        }

        const transactionResult = await verifyTransaction(
            parsedData.data.signature,
            parsedData.data.blockhash,
            parsedData.data.lastValidBlockHeight,
            parsedData.data.sender
        );

        if (!transactionResult.confirmed) {
            return res
                .status(400)
                .json({ error: "Transaction verification failed", details: transactionResult.error });
        }

        const task = await prismaClient.$transaction(async (tx) => {
            const response = await tx.task.create({
                data: {
                    title: parsedData.data.title,
                    description: parsedData.data.description || "",
                    payment_sign: parsedData.data.signature,
                    amount: (Number("50") * TOTAL_DECIMALS).toString(),
                    user_id: req.userId as string,
                },
            });

            await tx.option.createMany({
                data: parsedData.data.options.map((option) => ({
                    image_url: option.image_url,
                    subtitle: option.subtitle || "",
                    task_id: response.id,
                })),
            });

            await tx.taskPayment.create({
                data: {
                    user_id: req.userId as string,
                    task_id: response.id,
                    signature: parsedData.data.signature,
                },
            });

            return response;
        });

        res.status(201).json({ task });
    } catch (error) {
        res.status(500).json({ error: "Error creating task" });
    }
});

router.get("/task/:taskId", userAuthMiddleware, async (req, res) => {
    const { taskId } = req.params;
    const userId = req.userId;

    if (!taskId || !userId) {
        return res.status(400).json({ error: "Invalid request parameters" });
    }

    try {
        const task = await prismaClient.task.findFirst({
            where: {
                id: taskId,
                user_id: userId,
            },
            include: {
                Options: true,
            },
        });

        if (!task) {
            return res.status(404).json({ error: "Task not found or unauthorized" });
        }

        res.status(200).json({ task });
    } catch (error) {
        console.error("Error fetching task:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/tasks", userAuthMiddleware, async (req, res) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(400).json({ error: "User ID not found" });
    }

    try {
        const tasks = await prismaClient.task.findMany({
            where: {
                user_id: userId,
            },
            include: {
                Options: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.status(200).json({ tasks });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
