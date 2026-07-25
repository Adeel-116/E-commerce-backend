import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import type { CartRequest } from "../types";

export type { CartRequest };

export const resolveCart = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // 1. Access token in Authorization header (normal authenticated requests)
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.ACCESS_SECRET!) as { id: string };
            req.cartOwner = { ownerId: decoded.id, ownerType: "user" };
            return next();
        } catch {
            // expired/invalid — fall through
        }
    }

    // 2. Refresh token cookie — handles page refresh before frontend restores the access token
    const refreshToken = req.cookies?.refreshToken as string | undefined;
    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET!) as { id: string };
            req.cartOwner = { ownerId: decoded.id, ownerType: "user" };
            return next();
        } catch {
            // expired/invalid — fall through to guest
        }
    }

    // 3. Guest fallback — header takes priority over cookie (works in incognito / cross-site)
    const headerGuestId = req.headers["x-guest-id"] as string | undefined;
    const cookieGuestId = req.cookies.guestId as string | undefined;
    const existingGuestId = headerGuestId || cookieGuestId;

    if (existingGuestId) {
        req.cartOwner = { ownerId: existingGuestId, ownerType: "guest" };
    } else {
        const guestId = uuidv4();
        res.cookie("guestId", guestId, {
            httpOnly: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
        });
        res.setHeader("x-guest-id", guestId);
        req.cartOwner = { ownerId: guestId, ownerType: "guest" };
    }
    next();
};
