import { z } from "zod";

export const shareTaskSchema = z.object({
  userId: z.string().cuid("ID utente non valido"),
  role: z.enum(["VIEWER", "EDITOR"]).default("VIEWER"),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, "Il commento non può essere vuoto").max(1000),
});

export type ShareTaskInput = z.infer<typeof shareTaskSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;

