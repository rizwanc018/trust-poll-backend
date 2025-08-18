import { Router } from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import jwt from "jsonwebtoken";
import { userAuthMiddleware } from "../middlewares/authMiddleware.js";
import { createTaskInput } from "./types.js";
// import { supabase } from "../utils/supabaseClient.js";

const router = Router();
const prismaClient = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/signin", async (req, res) => {
    const hardCodedWallet = "4x2aYepNV7KAX4riSKcQySm9pi6Rp8cSNHJwaf4AtGmY";

    const existingUser = await prismaClient.user.findUnique({
        where: {
            wallet: hardCodedWallet,
        },
    });

    if (existingUser) {
        const token = jwt.sign({ userId: existingUser.id }, JWT_SECRET!);
        res.status(200).json({ token });
    } else {
        const user = await prismaClient.user.create({
            data: {
                wallet: hardCodedWallet,
            },
        });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET!);

        res.status(200).json({ token });
    }
});

router.post("/task", userAuthMiddleware, async (req, res) => {
    const body = req.body;

    const parsedData = createTaskInput.safeParse(body);

    if (!parsedData.success) {
        return res.status(400).json({ error: parsedData.error });
    }

    const task = await prismaClient.$transaction(async (tx) => {
        const response = await tx.task.create({
            data: {
                title: parsedData.data.title,
                description: parsedData.data.description || "",
                payment_sign: parsedData.data.signature,
                amount: "50",
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
        return response;
    });

    res.status(201).json({ task });
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

// router.post("/upload", authMiddleware, async (req, res) => {
//     const userId = req.userId;
//     const { data, error } = await supabase.storage
//         .from("images")
//         .upload("public/avatar1.png", avatarFile);
//     console.log(userId);
//     res.status(200).json({ userId, message: "Uploaded successfully" });
// });

export default router;
