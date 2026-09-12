const multer = require("multer");
const { AppError } = require("../utils/AppError");

const parse = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 2, fields: 3 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.mimetype)) return cb(new AppError("Use JPG, PNG, WebP or AVIF images", 400));
    cb(null, true);
  },
}).fields([{ name: "desktop", maxCount: 1 }, { name: "mobile", maxCount: 1 }]);

exports.uploadBanner = (req, res, next) => parse(req, res, (error) => {
  if (error) return next(error instanceof AppError ? error : new AppError(error.code === "LIMIT_FILE_SIZE" ? "Each image must be 2 MB or smaller" : "Invalid banner upload", 400));
  next();
});
