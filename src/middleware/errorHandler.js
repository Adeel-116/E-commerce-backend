const { AppError } = require("../utils/AppError");

const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  console.error(err);
  return res.status(500).json({ success: false, message: "Server error" });
};

module.exports = { errorHandler };
