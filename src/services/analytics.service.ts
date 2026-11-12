import { prisma } from "../lib/prisma";

export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  highPriorityPending: number;
  overdueTasks: number;
  tasksByProject: { name: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  recentActivity: any[]; // Ultimi 5 task modificati
}

/**
 * Calcola tutte le statistiche per un utente specifico
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const now = new Date();

  // 1. Conteggi base
  const [total, completed, pending, highPriority, overdue] = await Promise.all([
    prisma.task.count({ where: { userId } }),
    prisma.task.count({ where: { userId, completed: true } }),
    prisma.task.count({ where: { userId, completed: false } }),
    prisma.task.count({ where: { userId, completed: false, priority: "HIGH" } }),
    prisma.task.count({
      where: {
        userId,
        completed: false,
        dueDate: { lt: now },
      },
    }),
  ]);

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // 2. Task per Progetto
  const tasksByProject = await prisma.project.findMany({
    where: { userId },
    select: {
      name: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { tasks: { _count: "desc" } },
    take: 5, // Top 5 progetti
  });

  // 3. Task per Priorità (solo quelli non completati per vedere il carico attuale)
  const tasksByPriority = await prisma.task.groupBy({
    by: ["priority"],
    where: { userId, completed: false },
    _count: { priority: true },
  });

  // 4. Attività Recente
  const recentActivity = await prisma.task.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      completed: true,
      updatedAt: true,
    },
  });

  return {
    totalTasks: total,
    completedTasks: completed,
    pendingTasks: pending,
    completionRate,
    highPriorityPending: highPriority,
    overdueTasks: overdue,
    tasksByProject: tasksByProject.map((p) => ({
      name: p.name,
      count: p._count.tasks,
    })),
    tasksByPriority: tasksByPriority.map((p) => ({
      priority: p.priority,
      count: p._count.priority,
    })),
    recentActivity,
  };
}

/**
 * Esporta i task in formato CSV per il download
 */
export async function exportTasksToCSV(userId: string): Promise<string> {
  const tasks = await prisma.task.findMany({
    where: { userId },
    include: { project: true, tags: true },
    orderBy: { createdAt: "desc" },
  });

  // Header CSV
  let csv = "ID,Titolo,Descrizione,Stato,Priorità,Scadenza,Progetto,Tag,Creato\n";

  // Righe CSV
  tasks.forEach((task) => {
    const status = task.completed ? "Completato" : "In corso";
    const projectName = task.project?.name || "";
    const tagNames = task.tags.map((t) => t.name).join("; ");

    // Escape per virgole nel testo
    const title = `"${task.title.replace(/"/g, '""')}"`;
    const desc = `"${(task.description || "").replace(/"/g, '""')}"`;

    csv += `${task.id},${title},${desc},${status},${task.priority},${task.dueDate || ""},${projectName},${tagNames},${task.createdAt}\n`;
  });

  return csv;
}
