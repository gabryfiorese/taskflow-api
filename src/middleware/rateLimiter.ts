import rateLimit from "express-rate-limit";

// Limite generale per tutte le API (prevenzione abuso)
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 100, // massimo 100 richieste per IP
    standardHeaders: true, // Restituisce header `RateLimit-*`
    legacyHeaders: false, // Disabilita header `X-RateLimit-*`
    message: { error: "Troppe richieste, riprova tra 15 minuti" },
});

// Limite stretto per Auth (prevenzione brute-force)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // massimo 5 tentativi login/register per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppi tentativi di autenticazione, riprova tra 15 minuti" },
});

