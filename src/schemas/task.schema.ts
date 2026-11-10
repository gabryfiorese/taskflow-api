import { z } from "zod";

export const createTaskSchema = z.object({
    title: z.string().min(1, "Title is required").max(100),
    description: z.string().max(500).optional(),
});

export const updateTaskSchema = z.object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    completed: z.boolean().optional(),
});

// Tipi inferiti automaticamente dallo schema (niente duplicazione!)
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;