import express, { Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getUserStats, exportTasksToCSV } from "../services/analytics.service";
import { logger } from "../lib/logger";

const router = express.Router();
router.use(authenticate);

/**
 * @swagger
 * /api/analytics/stats:
 *   get:
 *     summary: Ottieni le statistiche complete dell'utente
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Oggetto con tutte le metriche di produttività
 */
router.get("/stats", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getUserStats(req.user!.userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Esporta tutti i task in formato CSV
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File CSV per il download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get("/export", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const csv = await exportTasksToCSV(req.user!.userId);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=taskflow-export.csv"
    );
    res.send(csv);

    logger.info({ userId: req.user?.userId }, "Export CSV effettuato");
  } catch (err) {
    next(err);
  }
});

export default router;

