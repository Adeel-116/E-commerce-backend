import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/UserModel";

const ACCESS_SECRET = process.env.ACCESS_SECRET;

export const protect = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    // console.log("Auth header", authHeader)
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized, no token" });
    }
    if (!ACCESS_SECRET) {
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, ACCESS_SECRET) as { id: string };
    req.user = { id: decoded.id };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Token expired or invalid" });
  }
};

export const protectAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }
    next();
  } catch {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
