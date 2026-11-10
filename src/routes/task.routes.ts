import express from "express";
import { prisma } from "../lib/prisma"; // Singleton
import { authenticate, type AuthRequest } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import { createTaskSchema, updateTaskSchema } from "../schemas/task.schema";

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         completed:
 *           type: boolean
 *         userId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Lista tutti i task dell'utente autenticato
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array di task
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Token mancante o invalido
 */
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

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Crea un nuovo task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task creato con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Titolo mancante o non valido
 *       401:
 *         description: Token mancante o invalido
 */
router.post("/", validate(createTaskSchema), async (req: AuthRequest, res, next) => {
    try {
        const task = await prisma.task.create({
            data: { ...req.body, userId: req.user!.userId },
        });

        res.status(201).json(task);
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     summary: Aggiorna un task esistente
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del task
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Task aggiornato con successo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Token mancante o invalido
 *       404:
 *         description: Task non trovato
 */
router.patch("/:id", validate(updateTaskSchema), async (req: AuthRequest, res, next) => {
    try {
        const id = req.params.id as string;

        // Evita update vuoti
        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        const updated = await prisma.task.updateMany({
            where: { id, userId: req.user!.userId },
            data: req.body,
        });

        if (updated.count === 0) {
            return res.status(404).json({ error: "Task not found" });
        }

        const task = await prisma.task.findUnique({ where: { id } });
        res.json(task);
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Elimina un task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del task
 *     responses:
 *       204:
 *         description: Task eliminato con successo
 *       401:
 *         description: Token mancante o invalido
 *       404:
 *         description: Task non trovato
 */
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