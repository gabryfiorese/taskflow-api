import multer from "multer";
import path from "path";
import fs from "fs";

// Assicurati che la cartella uploads esista
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurazione storage sicura
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        // Genera nome univoco per prevenire sovrascritture e path traversal
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uniqueSuffix}${ext}`);
    },
});

// Validazione file (solo immagini e PDF, max 5MB)
const fileFilter = (
    _req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    const allowedMimes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    ];

    if (!allowedMimes.includes(file.mimetype)) {
        return cb(
            new Error("Tipo file non consentito. Solo JPG, PNG, WebP o PDF.")
        );
    }

    cb(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

