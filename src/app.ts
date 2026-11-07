import express from "express";
import authRoutes from "./routes/auth.routes";
import taskRoutes from "./routes/task.routes"; // ← AGGIUNTO

const app = express();

// Middleware devono essere i primi
app.use(express.json());

// Route registration
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes); // ← AGGIUNTO

// Health check (può stare ovunque dopo express.json())
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

export default app;