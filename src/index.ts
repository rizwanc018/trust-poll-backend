import express from "express";
import userRouter from "./routers/user.js";

const app = express();
app.use(express.json());

app.use("/v1/user", userRouter);

app.get("/", (req, res) => {
    res.send("Health check is good");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
