import { Request, Response, NextFunction } from "express";
import { Cart } from "../models/AddtoCartModel";

export const validateStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ownerId } = req.cartOwner!;
        const cart = await Cart.findOne({ ownerId }).populate("items.productId", "stock title");

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, error: "EMPTY_CART" });
        }

        // Items whose product was deleted resolve to a null productId after populate.
        const validItems = cart.items.filter((item: (typeof cart.items)[number]) => (item as any).productId != null);
        if (validItems.length === 0) {
            return res.status(400).json({ success: false, error: "EMPTY_CART" });
        }

        const outOfStockItems: string[] = [];
        for (const item of validItems) {
            const product = (item as any).productId;
            if (!product.stock) {
                outOfStockItems.push(product.title);
            }
        }

        if (outOfStockItems.length > 0) {
            return res.status(400).json({ success: false, error: "OUT_OF_STOCK", items: outOfStockItems });
        }

        next();
    } catch {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
