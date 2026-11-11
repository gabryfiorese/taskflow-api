import pino from "pino";

export const logger = pino({
    // In produzione usa JSON strutturato, in dev usa pretty print
    transport:
        process.env.NODE_ENV === "production"
            ? undefined
            : { target: "pino-pretty", options: { colorize: true } },
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

