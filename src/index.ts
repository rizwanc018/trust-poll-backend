import express from "express";
import userRouter from "./routers/user.js";
import workerRouter from "./routers/worker.js";

const app = express();
app.use(express.json());

app.use("/v1/user", userRouter);
app.use("/v1/worker", workerRouter);

app.get("/", (req, res) => {
    res.send("Welcome to the Trust Poll");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
