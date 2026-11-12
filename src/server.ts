import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API Docs available at http://localhost:${PORT}/docs`);

  // Avvia i job schedulati
  startScheduler();
});
