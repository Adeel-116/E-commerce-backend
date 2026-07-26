const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();
const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets are missing in environment variables");
}

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, ACCESS_SECRET, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

const generateResetToken = (userId) => {
  return jwt.sign({ id: userId, purpose: "password-reset" }, ACCESS_SECRET, {
    expiresIn: "10m",
  });
};

const verifyResetToken = (token) => {
  const decoded = jwt.verify(token, ACCESS_SECRET);
  if (decoded.purpose !== "password-reset") {
    throw new Error("Invalid reset token");
  }
  return decoded.id;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyResetToken,
};
