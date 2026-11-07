import express from "express";
import { prisma } from "../lib/prisma"; // Singleton
import { authenticate, type AuthRequest } from "../middleware/auth.middleware";

const router = express.Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res, next) => {
    try {
        const tasks = await prisma.task.findMany({
            where: { userId: req.user!.userId },
            orderBy: { createdAt: "desc" },
        });
        res.json(tasks);
    } catch (err) {
        next(err);
    }
});

router.post("/", async (req: AuthRequest, res, next) => {
    try {
        const { title, description } = req.body;
        if (!title || typeof title !== "string") {
            return res.status(400).json({ error: "Title is required" });
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                userId: req.user!.userId,
            },
        });
        res.status(201).json(task);
    } catch (err) {
        next(err);
    }
});

router.patch("/:id", async (req: AuthRequest, res, next) => {
    try {
        const id = req.params.id as string;
        const { completed, title, description } = req.body;

        const updateResult = await prisma.task.updateMany({
            where: { id, userId: req.user!.userId },
            data: {
                ...(typeof completed === "boolean" && { completed }),
                ...(typeof title === "string" && { title }),
                ...(description !== undefined && { description }),
            },
        });

        if (updateResult.count === 0) {
            return res.status(404).json({ error: "Task not found" });
        }

        const updatedTask = await prisma.task.findUnique({ where: { id } });
        res.json(updatedTask);
    } catch (err) {
        next(err);
    }
});

router.delete("/:id", async (req: AuthRequest, res, next) => {
    try {
        const id = req.params.id as string;
        const deleteResult = await prisma.task.deleteMany({
            where: { id, userId: req.user!.userId },
        });

        if (deleteResult.count === 0) {
            return res.status(404).json({ error: "Task not found" });
        }

        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

export default router;