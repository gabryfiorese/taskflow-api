// Estendi Express.Request per includere il file di Multer
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

import fs from "fs";
import express, { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";
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
 *         attachmentPath:
 *           type: string
 *           nullable: true
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
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
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
router.post(
    "/",
    validate(createTaskSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            logger.debug(
                { body: req.body, userId: req.user?.userId },
                "Payload ricevuto per creazione task"
            );

            const task = await prisma.task.create({
                data: { ...req.body, userId: req.user!.userId },
            });

            logger.info(
                { taskId: task.id, userId: req.user?.userId },
                "Task creato con successo"
            );
            res.status(201).json(task);
        } catch (err) {
            logger.error(
                { userId: req.user?.userId, error: (err as Error).message },
                "Errore durante creazione task"
            );
            next(err);
        }
    }
);

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
router.patch(
    "/:id",
    validate(updateTaskSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;

            if (Object.keys(req.body).length === 0) {
                return res
                    .status(400)
                    .json({ error: "No valid fields to update" });
            }

            const updated = await prisma.task.updateMany({
                where: { id, userId: req.user!.userId },
                data: req.body,
            });

            if (updated.count === 0) {
                logger.warn(
                    { taskId: id, userId: req.user?.userId },
                    "Tentativo di aggiornamento: task non trovato"
                );
                return res.status(404).json({ error: "Task not found" });
            }

            const task = await prisma.task.findUnique({ where: { id } });
            logger.info(
                { taskId: id, userId: req.user?.userId },
                "Task aggiornato con successo"
            );
            res.json(task);
        } catch (err) {
            logger.error(
                {
                    taskId: req.params.id,
                    userId: req.user?.userId,
                    error: (err as Error).message,
                },
                "Errore durante aggiornamento task"
            );
            next(err);
        }
    }
);

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
router.delete(
    "/:id",
    async (req: Request, res: Response, next: NextFunction) => {
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
    }
);

/**
 * @swagger
 * /api/tasks/{id}/attachment:
 *   patch:
 *     summary: Allega un file a un task esistente
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Allegato caricato con successo
 *       400:
 *         description: File non valido o non fornito
 *       401:
 *         description: Token mancante o invalido
 *       404:
 *         description: Task non trovato
 */
router.patch(
    "/:id/attachment",
    upload.single("file"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id as string;
            const file = req.file;

            if (!file) {
                return res.status(400).json({ error: "Nessun file ricevuto" });
            }

            const task = await prisma.task.findUnique({ where: { id } });
            if (!task || task.userId !== req.user!.userId) {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
                return res.status(404).json({ error: "Task non trovato" });
            }

            const updated = await prisma.task.update({
                where: { id },
                data: { attachmentPath: file.path },
            });

            logger.info(
                {
                    taskId: id,
                    fileName: file.originalname,
                    userId: req.user!.userId,
                },
                "Allegato caricato"
            );
            res.json({ message: "Allegato caricato", task: updated });
        } catch (err) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            next(err);
        }
    }
);

export default router;
