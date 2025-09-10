import express from "express";
import cors from "cors";
import userRouter from "./routers/user.js";
import workerRouter from "./routers/worker.js";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

export const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
    },
});

app.use(cors());
app.use(express.json());

app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);

app.get("/", (req, res) => {
    res.send("Welcome to the Trust Poll");
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

server.listen(8080, () => {
    console.log("Server is running on port http://localhost:8080");
});
