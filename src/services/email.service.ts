import { logger } from "../lib/logger";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Servizio email simulato per sviluppo
 * In produzione, sostituire con Nodemailer + SendGrid/AWS SES
 */
export async function sendEmail({ to, subject, text, html }: EmailOptions) {
  // Simulazione delay di rete
  await new Promise((resolve) => setTimeout(resolve, 500));

  logger.info(
    { to, subject },
    `📧 EMAIL INVIATA (Simulazione):\nTesto: ${text}`
  );

  return { success: true, messageId: `mock-${Date.now()}` };
}

/**
 * Template per reminder scadenza
 */
export function createDueDateReminderEmail(taskTitle: string, dueDate: Date) {
  return {
    subject: `⏰ Promemoria: "${taskTitle}" scade presto!`,
    text: `Ciao, il tuo task "${taskTitle}" scade il ${dueDate.toLocaleDateString()}. Non dimenticarlo!`,
    html: `<h1>Promemoria Task</h1><p>Il task <b>${taskTitle}</b> scade il ${dueDate.toLocaleDateString()}.</p>`,
  };
}

