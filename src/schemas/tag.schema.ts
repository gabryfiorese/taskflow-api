import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio").max(50),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Formato colore non valido")
    .optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

