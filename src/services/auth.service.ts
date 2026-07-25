import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "../models/UserModel";
import { AppError } from "../utils/AppError";
import { generateAccessToken, generateRefreshToken, generateResetToken, verifyResetToken } from "../config/jwtTokenGenerate";
import { sendOtpEmail } from "../ServiceLayer/otpEmail.service";

const OTP_EXPIRY_MS = 60 * 1000; // 1 minute
const MAX_OTP_ATTEMPTS = 5;


export const register = async (name: string, email: string, password: string) => {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError("Email already registered", 400);
  const user = await User.create({ name, email, password });
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());
  return { user: { _id: user._id, name: user.name, role: user.role }, accessToken, refreshToken };
};


export const login = async (email: string, password: string) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) throw new AppError("Invalid email or password", 401);
  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError("Invalid email or password", 401);
  const accessToken = generateAccessToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());
  return { user: { _id: user._id, name: user.name, role: user.role }, accessToken, refreshToken };
};


export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError("No account found with this email", 404);
  if (user.role === "admin") throw new AppError("No account found with this email", 404);

  const otp = crypto.randomInt(100000, 1000000).toString();
  user.resetOtp = await bcrypt.hash(otp, 10);
  user.resetOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  user.resetOtpAttempts = 0;
  await user.save();

  await sendOtpEmail(user.email, otp);
};

export const verifyResetOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email }).select("+resetOtp +resetOtpExpiry +resetOtpAttempts");
  if (!user || !user.resetOtp || !user.resetOtpExpiry) throw new AppError("Invalid or expired OTP", 400);

  if (user.resetOtpExpiry.getTime() < Date.now()) {
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    user.resetOtpAttempts = 0;
    await user.save();
    throw new AppError("OTP has expired. Please request a new one.", 400);
  }

  if ((user.resetOtpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) {
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    user.resetOtpAttempts = 0;
    await user.save();
    throw new AppError("Too many incorrect attempts. Please request a new OTP.", 429);
  }

  const isMatch = await bcrypt.compare(otp, user.resetOtp);
  if (!isMatch) {
    user.resetOtpAttempts = (user.resetOtpAttempts ?? 0) + 1;
    await user.save();
    throw new AppError("Invalid or expired OTP", 400);
  }

  user.resetOtp = undefined;
  user.resetOtpExpiry = undefined;
  user.resetOtpAttempts = 0;
  await user.save();

  const resetToken = generateResetToken(user._id.toString());
  return { resetToken };
};

export const resetPassword = async (resetToken: string, newPassword: string) => {
  let userId: string;
  try {
    userId = verifyResetToken(resetToken);
  } catch {
    throw new AppError("Reset token is invalid or has expired", 401);
  }

  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  user.password = newPassword;
  await user.save();
};

export const refreshAccessToken = (token: string) => {
  const REFRESH_SECRET = process.env.REFRESH_SECRET;
  if (!REFRESH_SECRET) throw new AppError("Server configuration error", 500);
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as { id: string };
    const accessToken = generateAccessToken(decoded.id);
    return { accessToken };
  } catch {
    throw new AppError("Refresh token expired or invalid", 403);
  }
};
