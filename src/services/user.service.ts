import { User, IAddress } from "../models/UserModel";
import { AppError } from "../utils/AppError";

export const getUserById = async (id: string) => {
  const user = await User.findById(id).select("-password");
  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const updateUserProfile = async (
  id: string,
  fields: { name?: string; email?: string; phone?: string }
) => {
  const sanitized = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined)
  );
  if (sanitized.email) {
    const taken = await User.findOne({ email: sanitized.email, _id: { $ne: id } });
    if (taken) throw new AppError("Email already in use", 400);
  }
  const user = await User.findByIdAndUpdate(id, sanitized, {
    new: true,
    runValidators: true,
  }).select("-password");
  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const changeUserPassword = async (
  id: string,
  currentPassword: string,
  newPassword: string
) => {
  const user = await User.findById(id).select("+password");
  if (!user) throw new AppError("User not found", 404);
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw new AppError("Current password is incorrect", 401);
  user.password = newPassword;
  await user.save();
};

export const updateUserAddress = async (id: string, fields: Partial<IAddress>) => {
  const sanitized = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined)
  );
  const user = await User.findByIdAndUpdate(
    id,
    { address: sanitized },
    { new: true, runValidators: true }
  ).select("-password");
  if (!user) throw new AppError("User not found", 404);
  return user.address;
};

export const deleteUserAddress = async (id: string) => {
  const user = await User.findByIdAndUpdate(
    id,
    { $unset: { address: "" } },
    { new: true }
  ).select("-password");
  if (!user) throw new AppError("User not found", 404);
  return user.address;
};
