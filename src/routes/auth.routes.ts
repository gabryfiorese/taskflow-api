import express from "express";
import { register, login } from "../services/auth.service";
import { authenticate, type AuthRequest } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const result = await register(email, password, name);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await login(email, password);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: (error as Error).message });
    }
});

router.get("/me", authenticate, async (req: AuthRequest, res) => {
    // Questo endpoint richiede autenticazione valida
    res.json({ message: "Access granted", user: req.user });
});

export default router;