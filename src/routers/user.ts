import { Router } from "express";
import { PrismaClient } from "../generated/prisma/index.js";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();
const prismsaClient = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/signin", async (req, res) => {
    const hardCodedWallet = "4x2aYepNV7KAX4riSKcQySm9pi6Rp8cSNHJwaf4AtGmY";

    const existingUser = await prismsaClient.user.findUnique({
        where: {
            wallet: hardCodedWallet,
        },
    });

    if (existingUser) {
        const token = jwt.sign({ userId: existingUser.id }, JWT_SECRET!);
        res.status(200).json({ token });
    } else {
        const user = await prismsaClient.user.create({
            data: {
                wallet: hardCodedWallet,
            },
        });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET!);

        res.status(200).json({ token });
    }
});

router.post("/upload", authMiddleware, async (req, res) => {
    const userId = req.userId;
    console.log(userId);
    res.status(200).json({ userId, message: "Uploaded successfully" });
});

export default router;
