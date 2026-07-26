const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const router = require("./routes");
const { errorHandler } = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");

const app = express();
app.set("trust proxy", 1);

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "https://www.zaryastyle.com", "https://zaryastyle.com"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-guest-id"],
  exposedHeaders: ["x-guest-id"],
}));

app.use(express.json());
app.use(cookieParser());

app.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch {
    res.status(500).json({ success: false, message: "Database connection error" });
  }
});

app.use("/", router);
app.use(errorHandler);

if (require.main === module) {
  const PORT = Number(process.env.PORT) || 8000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
