import "dotenv/config";
import express from "express";
import cors from "cors";
import userRouter from "./routers/user.js";
import workerRouter from "./routers/worker.js";
import { createServer } from "http";
import { Server } from "socket.io";
import os from "os";

const app = express();
const server = createServer(app);

const allowedOrigins = process.env.FRONTEND_URL?.split(",").map((url) => url.trim()) || [];

export const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    },
});

// app.use(cors());
app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    })
);
app.use(express.json());

app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);

app.get("/", (req, res) => {
    res.send("Welcome to the Trust Poll");
});

io.on("connection", (socket) => {
    // console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        // console.log("Client disconnected:", socket.id);
    });
});

server.listen(8080, async () => {
    console.log("Server is running on port http://localhost:8080");
    console.log("Server started at:", new Date().toLocaleString());
    console.log("Hostname:", os.hostname());
    console.log("Platform:", os.platform());

    // Fetch geographical location
    try {
        const response = await fetch("http://ip-api.com/json/");
        const locationData = await response.json();
        console.log("Server Location:", `${locationData.city}, ${locationData.regionName}, ${locationData.country}`);
        console.log("Coordinates:", `${locationData.lat}, ${locationData.lon}`);
        console.log("ISP:", locationData.isp);
    } catch (error) {
        console.log("Could not fetch geographical location");
    }

    console.log("-----------------------------------------------------\n");
});
