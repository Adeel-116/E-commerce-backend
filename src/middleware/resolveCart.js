const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const resolveCart = (
    req,
    res,
    next
) => {
    // 1. Access token in Authorization header (normal authenticated requests)
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
            req.cartOwner = { ownerId: decoded.id, ownerType: "user" };
            return next();
        } catch {
            // expired/invalid — fall through
        }
    }

    // 2. Refresh token cookie — handles page refresh before frontend restores the access token
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
            req.cartOwner = { ownerId: decoded.id, ownerType: "user" };
            return next();
        } catch {
            // expired/invalid — fall through to guest
        }
    }

    // 3. Guest fallback — header takes priority over cookie (works in incognito / cross-site)
    const headerGuestId = req.headers["x-guest-id"];
    const cookieGuestId = req.cookies.guestId;
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

module.exports = { resolveCart };
