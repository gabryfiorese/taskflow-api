import app from "./app";
import { logger } from "./lib/logger";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
    logger.info(`TaskFlow API listening on http://localhost:${PORT}`);
});