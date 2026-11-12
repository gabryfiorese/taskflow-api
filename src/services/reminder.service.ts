import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { sendEmail, createDueDateReminderEmail } from "./email.service";

/**
 * Controlla i task in scadenza e crea notifiche
 * Da chiamare periodicamente (es. ogni ora)
 */
export async function checkDueDateReminders() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Task in scadenza domani
  const dueTomorrow = await prisma.task.findMany({
    where: {
      completed: false,
      dueDate: {
        gte: now,
        lte: tomorrow,
      },
    },
    include: { user: true },
  });

  // Crea notifiche per ogni task in scadenza
  for (const task of dueTomorrow) {
    // Verifica se esiste già una notifica per questo task oggi
    const existingNotification = await prisma.notification.findFirst({
      where: {
        userId: task.userId,
        taskId: task.id,
        type: "DUE_DATE_REMINDER",
        createdAt: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
        },
      },
    });

    if (!existingNotification) {
      await prisma.notification.create({
        data: {
          userId: task.userId,
          type: "DUE_DATE_REMINDER",
          message: `Il task "${task.title}" scade domani!`,
          taskId: task.id,
        },
      });

      logger.info(
        { taskId: task.id, userId: task.userId },
        "Reminder scadenza creato"
      );

      // Invia email (se l'utente ha un indirizzo valido)
      if (task.user.email) {
        const emailContent = createDueDateReminderEmail(task.title, new Date(task.dueDate!));
        await sendEmail({
          to: task.user.email,
          ...emailContent
        });
      }
    }
  }

  logger.info(
    { checkedTasks: dueTomorrow.length },
    "Controllo reminder completato"
  );
}

