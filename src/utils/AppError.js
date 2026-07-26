class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.message = message;
    this.statusCode = statusCode;
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

module.exports = { AppError };
