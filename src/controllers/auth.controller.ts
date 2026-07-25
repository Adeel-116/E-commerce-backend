import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import * as AuthService from "../services/auth.service";



const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, cookieOptions);
};

const setAdminRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie("adminRefreshToken", token, cookieOptions);
};

// Create user
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new AppError("All fields are required", 400);
  const { user, accessToken, refreshToken } = await AuthService.register(name, email, password);
  setRefreshTokenCookie(res, refreshToken);
  return res.status(201).json({ success: true, message: "User registered successfully", user, accessToken });
};

// login User
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("Email and password are required", 400);
  const { user, accessToken, refreshToken } = await AuthService.login(email, password);
  setRefreshTokenCookie(res, refreshToken);
  return res.status(200).json({ success: true, message: "User logged in successfully", user, accessToken });
};

// Logout User
export const logoutUser = (_req: Request, res: Response) => {
  res.clearCookie("refreshToken", cookieOptions);
  return res.status(200).json({ success: true, message: "Logged out successfully" });
};

// Get Access Token Based on Refresh Token
export const GetAccessTokenBasedOnRefreshToken = (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) throw new AppError("No refresh token found", 401);
  const { accessToken } = AuthService.refreshAccessToken(refreshToken);
  return res.status(200).json({ success: true, accessToken });
};

// Admin Login
export const loginAdmin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("Email and password are required", 400);
  const { user, accessToken, refreshToken } = await AuthService.login(email, password);
  if (user.role !== "admin") throw new AppError("Access denied. Admins only.", 403);
  setAdminRefreshTokenCookie(res, refreshToken);
  return res.status(200).json({ success: true, message: "Admin logged in successfully", user, accessToken });
};

// Admin Logout
export const logoutAdmin = (_req: Request, res: Response) => {
  res.clearCookie("adminRefreshToken", cookieOptions);
  return res.status(200).json({ success: true, message: "Admin logged out successfully" });
};

// Forgot Password - send OTP to email
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new AppError("Email is required", 400);
  await AuthService.forgotPassword(email);
  return res.status(200).json({ success: true, message: "OTP sent to your email" });
};

// Verify OTP - returns a short-lived reset token
export const verifyResetOtp = async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new AppError("Email and OTP are required", 400);
  const { resetToken } = await AuthService.verifyResetOtp(email, otp);
  return res.status(200).json({ success: true, message: "OTP verified", resetToken });
};

// Reset Password using the reset token issued after OTP verification
export const resetPassword = async (req: Request, res: Response) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) throw new AppError("Reset token and new password are required", 400);
  await AuthService.resetPassword(resetToken, newPassword);
  return res.status(200).json({ success: true, message: "Password reset successfully" });
};

// Get Access Token Based on Admin Refresh Token
export const getAdminAccessToken = (req: Request, res: Response) => {
  const refreshToken = req.cookies?.adminRefreshToken;
  if (!refreshToken) throw new AppError("No refresh token found", 401);
  const { accessToken } = AuthService.refreshAccessToken(refreshToken);
  return res.status(200).json({ success: true, accessToken });
};
