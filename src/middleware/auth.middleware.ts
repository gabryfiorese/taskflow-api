import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-prod";

// Mantieni l'interfaccia per le route
export interface AuthRequest extends Request {
    user?: { userId: string; email: string };
}

// Il middleware usa Request standard, non AuthRequest
export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
        // Cast sicuro: stiamo aggiungendo user a Request
        (req as AuthRequest).user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}