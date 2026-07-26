const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploadCsv = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

module.exports = { uploadCsv };
