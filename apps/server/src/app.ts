import express from "express";
import cors from "cors";
import apiRoutes from "./routes/index.js";

const app = express();

// FRONTEND_URL must be set in production (e.g. your deployed Vercel/Netlify
// URL) — falls back to localhost only for local dev.
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
}));

app.use(express.json());

// Mount all API routes under /api
app.use("/api", apiRoutes);

export default app;