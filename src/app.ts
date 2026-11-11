import path from "path";
import express from "express";
import { pinoHttp } from "pino-http";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { logger } from "./lib/logger";
import { generalLimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/auth.routes";
import taskRoutes from "./routes/task.routes"; // ← AGGIUNTO

const app = express();

// Middleware devono essere i primi
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ✅ LOGGING STRUTTURATO (sostituisce morgan)
app.use(
    pinoHttp({
        logger,
        customSuccessMessage: (req, res) => `${req.method} ${req.url}`,
        customErrorMessage: (req, res, err) =>
            `${req.method} ${req.url} - ${err.message}`,
    })
);

app.use(generalLimiter); // ✅ Applicato GLOBALMENTE a tutte le route

// Health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// Route registration
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes); // ← AGGIUNTO

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "TaskFlow API",
            version: "1.0.0",
            description: "Backend sicuro e type-safe per la gestione task con auth JWT",
        },
        servers: [
            { url: "http://localhost:3000", description: "Sviluppo locale" },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [{ bearerAuth: [] }], // Auth globale opzionale
    },
    apis: ["./src/routes/*.ts"], // Scansiona i file route per i commenti JSDoc
};

const specs = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

export default app;