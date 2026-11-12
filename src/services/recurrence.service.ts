import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/**
 * Genera nuove istanze di task ricorrenti basate sulle regole
 * Da chiamare periodicamente (es. ogni giorno via cron job)
 */
export async function processRecurringTasks() {
  const now = new Date();

  // Trova tutte le regole di ricorrenza attive
  const rules = await prisma.recurrenceRule.findMany({
    include: { task: true },
    where: {
      OR: [{ endDate: null }, { endDate: { gte: now } }],
    },
  });

  for (const rule of rules) {
    const shouldGenerate = shouldGenerateNewInstance(rule, now);

    if (shouldGenerate) {
      await generateRecurringTask(rule);
    }
  }

  logger.info(
    { processedRules: rules.length },
    "Processamento task ricorrenti completato"
  );
}

/**
 * Determina se bisogna generare una nuova istanza
 */
function shouldGenerateNewInstance(rule: any, now: Date): boolean {
  if (!rule.lastRun) return true; // Mai eseguito prima

  const lastRun = new Date(rule.lastRun);
  const diffMs = now.getTime() - lastRun.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (rule.frequency) {
    case "DAILY":
      return diffDays >= rule.interval;
    case "WEEKLY":
      return diffDays >= rule.interval * 7;
    case "MONTHLY":
      return diffDays >= rule.interval * 30;
    case "YEARLY":
      return diffDays >= rule.interval * 365;
    default:
      return false;
  }
}

/**
 * Genera una nuova istanza del task ricorrente
 */
async function generateRecurringTask(rule: any) {
  const originalTask = rule.task;

  // Calcola la nuova dueDate
  let newDueDate: Date | null = null;
  if (originalTask.dueDate) {
    const oldDueDate = new Date(originalTask.dueDate);
    newDueDate = calculateNextDate(oldDueDate, rule.frequency, rule.interval);
  }

  // Crea il nuovo task
  const newTask = await prisma.task.create({
    data: {
      title: originalTask.title,
      description: originalTask.description,
      priority: originalTask.priority,
      dueDate: newDueDate,
      userId: originalTask.userId,
      projectId: originalTask.projectId,
      // Non copiamo i tag, sharedWith, comments, subtasks
    },
  });

  // Aggiorna lastRun
  await prisma.recurrenceRule.update({
    where: { id: rule.id },
    data: { lastRun: new Date() },
  });

  logger.info(
    {
      originalTaskId: originalTask.id,
      newTaskId: newTask.id,
      frequency: rule.frequency,
    },
    "Nuova istanza task ricorrente generata"
  );

  return newTask;
}

/**
 * Calcola la prossima data in base alla frequenza
 */
function calculateNextDate(
  baseDate: Date,
  frequency: string,
  interval: number
): Date {
  const next = new Date(baseDate);

  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + interval);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + interval * 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + interval);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}

/**
 * Crea una regola di ricorrenza per un task
 */
export async function createRecurrenceRule(
  taskId: string,
  frequency: string,
  interval: number = 1,
  endDate?: string
) {
  return await prisma.recurrenceRule.create({
    data: {
      taskId,
      frequency: frequency as any,
      interval,
      endDate: endDate ? new Date(endDate) : null,
    },
  });
}

/**
 * Rimuove una regola di ricorrenza
 */
export async function deleteRecurrenceRule(taskId: string) {
  return await prisma.recurrenceRule.deleteMany({
    where: { taskId },
  });
}

