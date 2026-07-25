import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets are missing in environment variables");
}

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ id: userId }, ACCESS_SECRET, {
    expiresIn: "15m",
  });
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ id: userId }, REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

export const generateResetToken = (userId: string) => {
  return jwt.sign({ id: userId, purpose: "password-reset" }, ACCESS_SECRET, {
    expiresIn: "10m",
  });
};

export const verifyResetToken = (token: string): string => {
  const decoded = jwt.verify(token, ACCESS_SECRET) as { id: string; purpose: string };
  if (decoded.purpose !== "password-reset") {
    throw new Error("Invalid reset token");
  }
  return decoded.id;
};