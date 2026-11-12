import cron from "node-cron";
import { logger } from "./logger";
import { processRecurringTasks } from "../services/recurrence.service";
import { checkDueDateReminders } from "../services/reminder.service";

/**
 * Inizializza i cron job schedulati in background
 */
export function startScheduler() {
  // Ogni giorno a mezzanotte (00:00) elabora i task ricorrenti
  cron.schedule("0 0 * * *", async () => {
    try {
      logger.info("Avvio elaborazione programmata task ricorrenti");
      await processRecurringTasks();
    } catch (err: any) {
      logger.error({ error: err.message }, "Errore durante processRecurringTasks");
    }
  });

  // Ogni ora al minuto 0 controlla le scadenze e invia promemoria
  cron.schedule("0 * * * *", async () => {
    try {
      logger.info("Avvio controllo programmato promemoria scadenze");
      await checkDueDateReminders();
    } catch (err: any) {
      logger.error({ error: err.message }, "Errore durante checkDueDateReminders");
    }
  });

  logger.info("Job scheduler inizializzato");
}

