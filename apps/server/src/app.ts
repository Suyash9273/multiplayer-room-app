import express from "express";
import cors from "cors";
import apiRoutes from "./routes/index.js";

const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));

app.use(express.json());

// Mount all API routes under /api
app.use("/api", apiRoutes);

export default app;