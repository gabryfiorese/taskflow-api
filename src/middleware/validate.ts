import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: result.error.flatten().fieldErrors,
            });
        }
        // Sovrascrive req.body con i dati validati e tipizzati
        req.body = result.data;
        next();
    };
}

