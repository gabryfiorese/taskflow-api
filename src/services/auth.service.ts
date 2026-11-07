import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-prod";
const SALT_ROUNDS = 10;

export async function register(email: string, password: string, name?: string) {
    // 1. Verifica se l'email esiste già
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("Email already registered");

    // 2. Hash della password (MAI salvare in chiaro!)
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 3. Crea l'utente nel DB
    const user = await prisma.user.create({
        data: { email, password: hashedPassword, name },
    });

    // 4. Genera token JWT
    const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    return { user: { id: user.id, email: user.email, name: user.name }, token };
}

export async function login(email: string, password: string) {
    // 1. Trova l'utente
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Invalid credentials");

    // 2. Confronta password hashata
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error("Invalid credentials");

    // 3. Genera token JWT
    const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    return { user: { id: user.id, email: user.email, name: user.name }, token };
}