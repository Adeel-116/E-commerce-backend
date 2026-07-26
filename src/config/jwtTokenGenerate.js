const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const getAccessSecret = () => {
  const secret = process.env.ACCESS_SECRET;
  if (!secret) throw new Error("JWT secrets are missing in environment variables");
  return secret;
};

const getRefreshSecret = () => {
  const secret = process.env.REFRESH_SECRET;
  if (!secret) throw new Error("JWT secrets are missing in environment variables");
  return secret;
};

const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, getAccessSecret(), {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, getRefreshSecret(), {
    expiresIn: "7d",
  });
};

const generateResetToken = (userId) => {
  return jwt.sign({ id: userId, purpose: "password-reset" }, getAccessSecret(), {
    expiresIn: "10m",
  });
};

const verifyResetToken = (token) => {
  const decoded = jwt.verify(token, getAccessSecret());
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
