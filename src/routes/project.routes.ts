import express, { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../schemas/project.schema";

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Lista tutti i progetti dell'utente
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array di progetti
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user!.userId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Crea un nuovo progetto
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-F]{6}$'
 *     responses:
 *       201:
 *         description: Progetto creato
 *       400:
 *         description: Dati invalidi
 */
router.post(
  "/",
  validate(createProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const project = await prisma.project.create({
        data: { ...req.body, userId: req.user!.userId },
      });
      logger.info(
        { projectId: project.id, userId: req.user?.userId },
        "Progetto creato"
      );
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Aggiorna un progetto
 *     tags: [Projects]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Progetto aggiornato
 *       404:
 *         description: Progetto non trovato
 */
router.patch(
  "/:id",
  validate(updateProjectSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const updated = await prisma.project.updateMany({
        where: { id, userId: req.user!.userId },
        data: req.body,
      });

      if (updated.count === 0) {
        return res.status(404).json({ error: "Progetto non trovato" });
      }

      const project = await prisma.project.findUnique({ where: { id } });
      res.json(project);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Elimina un progetto
 *     tags: [Projects]
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
 *         description: Progetto eliminato
 *       404:
 *         description: Progetto non trovato
 */
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const deleted = await prisma.project.deleteMany({
        where: { id, userId: req.user!.userId },
      });

      if (deleted.count === 0) {
        return res.status(404).json({ error: "Progetto non trovato" });
      }

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

export default router;

