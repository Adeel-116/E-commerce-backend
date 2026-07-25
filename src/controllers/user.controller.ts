import { Request, Response } from "express";
import { AppError } from "../utils/AppError";
import * as UserService from "../services/user.service";

export const getMe = async (req: Request, res: Response) => {
  const user = await UserService.getUserById(req.user!.id);
  res.status(200).json({ success: true, user });
};

export const updateProfile = async (req: Request, res: Response) => {
  const { name, email, phone } = req.body;
  if (!name && !email && !phone) {
    throw new AppError("No fields provided to update", 400);
  }
  const user = await UserService.updateUserProfile(req.user!.id, { name, email, phone });
  res.status(200).json({ success: true, user });
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new AppError("Current and new password are required", 400);
  }
  await UserService.changeUserPassword(req.user!.id, currentPassword, newPassword);
  res.status(200).json({ success: true, message: "Password updated successfully" });
};

export const updateAddress = async (req: Request, res: Response) => {

  console.log("Address is working")
  const { firstName, lastName, line1, line2, city, state, postalCode, country, phone } = req.body;
  if (!firstName || !lastName || !line1 || !city || !state || !postalCode || !country || !phone) {
    throw new AppError("All required address fields must be provided", 400);
  }
  const address = await UserService.updateUserAddress(req.user!.id, {
    firstName,
    lastName,
    line1,
    line2: line2 || "",
    city,
    state,
    postalCode,
    country,
    phone,
  });

  // console.log("Addresss", address)
  res.status(200).json({ success: true, address });
};

export const deleteAddress = async (req: Request, res: Response) => {
  await UserService.deleteUserAddress(req.user!.id);
  res.status(200).json({ success: true, message: "Address removed successfully" });
};
