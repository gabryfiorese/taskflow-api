import express, { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import {
  shareTaskSchema,
  addCommentSchema,
} from "../schemas/collaboration.schema";

const router = express.Router();
router.use(authenticate);

// ==========================================
// CONDIVISIONE TASK
// ==========================================

/**
 * @swagger
 * /api/tasks/{taskId}/share:
 *   post:
 *     summary: Condividi un task con un altro utente
 *     tags: [Collaboration]
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
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [VIEWER, EDITOR]
 *     responses:
 *       201:
 *         description: Task condiviso con successo
 *       404:
 *         description: Task o utente non trovato
 */
router.post(
  "/:taskId/share",
  validate(shareTaskSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.taskId as string;
      const { userId, role } = req.body;
      const currentUserId = req.user!.userId;

      // Verifica che il task esista e appartenga all'utente corrente
      const task = await prisma.task.findUnique({
        where: { id: taskId, userId: currentUserId },
      });

      if (!task) {
        return res
          .status(404)
          .json({ error: "Task non trovato o non hai i permessi" });
      }

      // Verifica che l'utente destinatario esista
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!targetUser) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      // Non puoi condividere un task con te stesso
      if (userId === currentUserId) {
        return res
          .status(400)
          .json({ error: "Non puoi condividere un task con te stesso" });
      }

      // Crea la condivisione
      const sharedTask = await prisma.sharedTask.create({
        data: {
          taskId,
          userId,
          role,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Crea notifica per l'utente destinatario
      await prisma.notification.create({
        data: {
          userId,
          type: "TASK_SHARED",
          message: `${req.user?.name || "Qualcuno"} ha condiviso il task "${task.title}" con te`,
          taskId,
        },
      });

      logger.info(
        { taskId, sharedWith: userId, role, by: currentUserId },
        "Task condiviso"
      );

      res.status(201).json(sharedTask);
    } catch (err: any) {
      if (err.code === "P2002") {
        return res
          .status(400)
          .json({ error: "Task già condiviso con questo utente" });
      }
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/tasks/{taskId}/share:
 *   get:
 *     summary: Lista utenti con cui il task è condiviso
 *     tags: [Collaboration]
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
 *         description: Lista di condivisioni
 */
router.get(
  "/:taskId/share",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.taskId as string;

      const shares = await prisma.sharedTask.findMany({
        where: { taskId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      res.json(shares);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/tasks/{taskId}/share/{userId}:
 *   delete:
 *     summary: Rimuovi condivisione di un task
 *     tags: [Collaboration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Condivisione rimossa
 *       404:
 *         description: Condivisione non trovata
 */
router.delete(
  "/:taskId/share/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.taskId as string;
      const userId = req.params.userId as string;
      const currentUserId = req.user!.userId;

      // Solo il proprietario del task può rimuovere condivisioni
      const task = await prisma.task.findUnique({
        where: { id: taskId, userId: currentUserId },
      });

      if (!task) {
        return res
          .status(404)
          .json({ error: "Task non trovato o non hai i permessi" });
      }

      await prisma.sharedTask.delete({
        where: {
          taskId_userId: {
            taskId,
            userId,
          },
        },
      });

      res.status(204).end();
    } catch (err: any) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Condivisione non trovata" });
      }
      next(err);
    }
  }
);

// ==========================================
// COMMENTI
// ==========================================

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   get:
 *     summary: Lista tutti i commenti di un task
 *     tags: [Comments]
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
 *         description: Array di commenti
 */
router.get(
  "/:taskId/comments",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.taskId as string;

      const comments = await prisma.comment.findMany({
        where: { taskId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      res.json(comments);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   post:
 *     summary: Aggiungi un commento a un task
 *     tags: [Comments]
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
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Commento creato
 *       404:
 *         description: Task non trovato
 */
router.post(
  "/:taskId/comments",
  validate(addCommentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.taskId as string;
      const { content } = req.body;
      const currentUserId = req.user!.userId;

      // Verifica che il task esista e che l'utente abbia accesso
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          OR: [
            { userId: currentUserId },
            { sharedWith: { some: { userId: currentUserId } } },
          ],
        },
      });

      if (!task) {
        return res
          .status(404)
          .json({ error: "Task non trovato o non hai accesso" });
      }

      // Crea il commento
      const comment = await prisma.comment.create({
        data: {
          content,
          taskId,
          userId: currentUserId,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Crea notifiche per gli altri utenti coinvolti nel task
      const involvedUsers = await prisma.sharedTask.findMany({
        where: { taskId },
        select: { userId: true },
      });

      const notificationPromises = involvedUsers
        .filter((share) => share.userId !== currentUserId)
        .map((share) =>
          prisma.notification.create({
            data: {
              userId: share.userId,
              type: "COMMENT_ADDED",
              message: `${req.user?.name || "Qualcuno"} ha commentato il task "${task.title}"`,
              taskId,
            },
          })
        );

      await Promise.all(notificationPromises);

      logger.info(
        { taskId, commentId: comment.id, userId: currentUserId },
        "Commento aggiunto"
      );

      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/tasks/{taskId}/comments/{commentId}:
 *   delete:
 *     summary: Elimina un commento
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Commento eliminato
 *       404:
 *         description: Commento non trovato
 */
router.delete(
  "/:taskId/comments/:commentId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.taskId as string;
      const commentId = req.params.commentId as string;
      const currentUserId = req.user!.userId;

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
      });

      if (!comment || comment.userId !== currentUserId) {
        return res
          .status(404)
          .json({ error: "Commento non trovato o non hai i permessi" });
      }

      await prisma.comment.delete({
        where: { id: commentId },
      });

      res.status(204).end();
    } catch (err: any) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Commento non trovato" });
      }
      next(err);
    }
  }
);

// ==========================================
// NOTIFICHE
// ==========================================

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lista tutte le notifiche dell'utente
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array di notifiche
 */
router.get(
  "/notifications",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: "desc" },
      });

      res.json(notifications);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Segna una notifica come letta
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notifica aggiornata
 *       404:
 *         description: Notifica non trovata
 */
router.patch(
  "/notifications/:id/read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;

      const notification = await prisma.notification.update({
        where: { id, userId: req.user!.userId },
        data: { read: true },
      });

      res.json(notification);
    } catch (err: any) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Notifica non trovata" });
      }
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Segna tutte le notifiche come lette
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tutte le notifiche segnate come lette
 */
router.patch(
  "/notifications/read-all",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.userId, read: false },
        data: { read: true },
      });

      res.json({ message: "Tutte le notifiche segnate come lette" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
