import express, { Router } from "express";
import { register, login } from "../services/auth.service";
import { authenticate, type AuthRequest } from "../middleware/auth.middleware";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registra un nuovo utente
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Utente creato con successo
 *       400:
 *         description: Email già registrata o dati invalidi
 */
router.post("/register", authLimiter, async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const result = await register(email, password, name);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: (error as Error).message });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Effettua il login e restituisce un token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login riuscito, restituisce utente e token
 *       401:
 *         description: Credenziali non valide
 */
router.post("/login", authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await login(email, password);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: (error as Error).message });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Restituisce il profilo dell'utente autenticato
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informazioni profilo utente
 *       401:
 *         description: Token mancante o non valido
 */
router.get("/me", authenticate, async (req: AuthRequest, res) => {
    // Questo endpoint richiede autenticazione valida
    res.json({ message: "Access granted", user: req.user });
});

export default router;