import express, { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate";
import { createTagSchema, updateTagSchema } from "../schemas/tag.schema";

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Lista tutti i tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array di tag
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await prisma.tag.findMany({
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: "asc" },
    });
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Crea un nuovo tag
 *     tags: [Tags]
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
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tag creato
 *       400:
 *         description: Nome già esistente o dati invalidi
 */
router.post(
  "/",
  validate(createTagSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tag = await prisma.tag.create({
        data: req.body,
      });
      logger.info({ tagId: tag.id }, "Tag creato");
      res.status(201).json(tag);
    } catch (err: any) {
      if (err.code === "P2002") {
        return res.status(400).json({ error: "Tag già esistente" });
      }
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/tags/{id}:
 *   patch:
 *     summary: Aggiorna un tag
 *     tags: [Tags]
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
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tag aggiornato
 *       404:
 *         description: Tag non trovato
 */
router.patch(
  "/:id",
  validate(updateTagSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const updated = await prisma.tag.update({
        where: { id },
        data: req.body,
      });
      res.json(updated);
    } catch (err: any) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Tag non trovato" });
      }
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/tags/{id}:
 *   delete:
 *     summary: Elimina un tag
 *     tags: [Tags]
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
 *         description: Tag eliminato
 *       404:
 *         description: Tag non trovato
 */
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      await prisma.tag.delete({
        where: { id },
      });
      res.status(204).end();
    } catch (err: any) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "Tag non trovato" });
      }
      next(err);
    }
  }
);

export default router;

