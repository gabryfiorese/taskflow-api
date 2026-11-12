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
 *         priority:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *         dueDate:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         userId:
 *           type: string
 *         projectId:
 *           type: string
 *           nullable: true
 *         attachmentPath:
 *           type: string
 *           nullable: true
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Tag'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Tag:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         color:
 *           type: string
 */

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Lista task con filtri, ricerca e paginazione
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Cerca nel titolo o descrizione
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *       - in: query
 *         name: completed
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista paginata di task
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      projectId,
      priority,
      completed
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: req.user!.userId };

    // Filtri base
    if (projectId) where.projectId = projectId;
    if (priority) where.priority = priority;
    if (completed !== undefined) where.completed = completed === 'true';

    // Ricerca full-text (case-insensitive su SQLite)
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Esegui query parallele per dati e conteggio totale
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          tags: true,
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      data: tasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
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
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               projectId:
 *                 type: string
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Task creato con successo
 *       400:
 *         description: Dati invalidi
 */
router.post(
  "/",
  validate(createTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tagIds, ...taskData } = req.body;

      const task = await prisma.task.create({
        data: {
          ...taskData,
          userId: req.user!.userId,
          tags: tagIds
            ? {
              connect: tagIds.map((id: string) => ({ id })),
            }
            : undefined,
        },
        include: {
          tags: true,
          project: { select: { id: true, name: true, color: true } },
        },
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
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               projectId:
 *                 type: string
 *               tagIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Task aggiornato
 *       404:
 *         description: Task non trovato
 */
router.patch(
  "/:id",
  validate(updateTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { tagIds, ...updateData } = req.body;

      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      // Verifica che il task esista e appartenga all'utente
      const existingTask = await prisma.task.findFirst({
        where: { id, userId: req.user!.userId },
      });

      if (!existingTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      // Aggiorna il task con gestione dei tag
      const updated = await prisma.task.update({
        where: { id },
        data: {
          ...updateData,
          tags: tagIds
            ? {
              set: tagIds.map((id: string) => ({ id })),
            }
            : undefined,
        },
        include: {
          tags: true,
          project: { select: { id: true, name: true, color: true } },
        },
      });

      logger.info(
        { taskId: id, userId: req.user?.userId },
        "Task aggiornato con successo"
      );

      res.json(updated);
    } catch (err: any) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Task not found" });
      }
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
 *     responses:
 *       204:
 *         description: Task eliminato
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
 *         description: Allegato caricato
 *       400:
 *         description: File non valido
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
        include: {
          tags: true,
          project: { select: { id: true, name: true, color: true } },
        },
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

// ==========================================
// SUB-TASKS
// ==========================================

/**
 * @swagger
 * /api/tasks/{taskId}/subtasks:
 *   get:
 *     summary: Lista tutti i subtask di un task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array di subtask
 */
router.get('/:taskId/subtasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.taskId as string;

    const subtasks = await prisma.task.findMany({
      where: {
        parentTaskId: taskId,
        OR: [
          { userId: req.user!.userId },
          { sharedWith: { some: { userId: req.user!.userId } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(subtasks);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/tasks/{taskId}/subtasks:
 *   post:
 *     summary: Crea un subtask
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
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
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Subtask creato
 *       404:
 *         description: Task padre non trovato
 */
router.post('/:taskId/subtasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parentId = req.params.taskId as string;
    const { title, description, priority, dueDate } = req.body;

    // Verifica che il task padre esista e l'utente abbia accesso
    const parentTask = await prisma.task.findFirst({
      where: {
        id: parentId,
        OR: [
          { userId: req.user!.userId },
          { sharedWith: { some: { userId: req.user!.userId } } },
        ],
      },
    });

    if (!parentTask) {
      return res.status(404).json({ error: 'Task padre non trovato o non hai accesso' });
    }

    const subtask = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        userId: req.user!.userId,
        parentTaskId: parentId,
      },
    });

    res.status(201).json(subtask);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// RICORRENZA
// ==========================================

/**
 * @swagger
 * /api/tasks/{taskId}/recurrence:
 *   post:
 *     summary: Imposta una regola di ricorrenza per un task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [frequency]
 *             properties:
 *               frequency:
 *                 type: string
 *                 enum: [DAILY, WEEKLY, MONTHLY, YEARLY]
 *               interval:
 *                 type: integer
 *                 minimum: 1
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Regola di ricorrenza creata
 *       404:
 *         description: Task non trovato
 */
router.post('/:taskId/recurrence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.taskId as string;
    const { frequency, interval, endDate } = req.body;

    // Verifica che il task esista e appartenga all'utente
    const task = await prisma.task.findUnique({
      where: { id: taskId, userId: req.user!.userId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task non trovato' });
    }

    const rule = await prisma.recurrenceRule.create({
      data: {
        taskId,
        frequency: frequency.toUpperCase(),
        interval: interval || 1,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    // Aggiorna il flag sul task
    await prisma.task.update({
      where: { id: taskId },
      data: { isRecurring: true },
    });

    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/tasks/{taskId}/recurrence:
 *   delete:
 *     summary: Rimuove la regola di ricorrenza
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Regola rimossa
 *       404:
 *         description: Regola non trovata
 */
router.delete('/:taskId/recurrence', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.taskId as string;

    const deleted = await prisma.recurrenceRule.deleteMany({
      where: { taskId, task: { userId: req.user!.userId } },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Regola di ricorrenza non trovata' });
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { isRecurring: false },
    });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/tasks/bulk/complete:
 *   patch:
 *     summary: Completa multipli task contemporaneamente
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Numero di task aggiornati
 */
router.patch('/bulk/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Lista di ID task richiesta' });
    }

    const result = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        userId: req.user!.userId,
      },
      data: { completed: true },
    });

    res.json({ message: `${result.count} task completati` });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/tasks/bulk/delete:
 *   delete:
 *     summary: Elimina multipli task contemporaneamente
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Numero di task eliminati
 */
router.delete('/bulk/delete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Lista di ID task richiesta' });
    }

    const result = await prisma.task.deleteMany({
      where: {
        id: { in: taskIds },
        userId: req.user!.userId,
      },
    });

    res.json({ message: `${result.count} task eliminati` });
  } catch (err) {
    next(err);
  }
});

export default router;
