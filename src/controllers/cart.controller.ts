import { RequestHandler } from "express";
import * as CartService from "../services/cart.service";
import type { RemoveFromCartQuery, UpdateQuantityBody } from "../types";

export const getCart: RequestHandler = async (req, res) => {
  const cart = await CartService.getCart(req.cartOwner!.ownerId);
  res.status(200).json({ success: true, cart });
};

export const addToCart: RequestHandler = async (req, res) => {
  const { ownerId, ownerType } = req.cartOwner!;
  const { productId, size, quantity = 1 } = req.body;
  const message = await CartService.addToCart(ownerId, ownerType, productId, size, quantity);
  res.status(200).json({ success: true, message });
};

export const updateCartItemSize: RequestHandler = async (req, res) => {
  const { ownerId, ownerType } = req.cartOwner!;
  const { productId, oldSize, newSize } = req.body;
  await CartService.updateCartItemSize(ownerId, ownerType, productId, oldSize, newSize);
  res.status(200).json({ success: true, message: "Cart size updated successfully" });
};

export const removeFromCart: RequestHandler<
  Record<string, never>,
  unknown,
  unknown,
  RemoveFromCartQuery
> = async (req, res) => {
  const { ownerId } = req.cartOwner!;
  await CartService.removeFromCart(ownerId, req.query.productId!, req.query.size);
  res.status(200).json({ success: true, message: "Item removed" });
};

export const clearCart: RequestHandler = async (req, res) => {
  await CartService.clearCart(req.cartOwner!.ownerId);
  res.status(200).json({ success: true, message: "Cart cleared" });
};

export const updateQuantity: RequestHandler<
  Record<string, never>,
  unknown,
  UpdateQuantityBody
> = async (req, res) => {
  const { ownerId } = req.cartOwner!;
  const { productId, size, quantity } = req.body;

  await CartService.updateQuantity(ownerId, productId, size, quantity);
  res.status(200).json({ success: true, message: "Quantity updated" });
};

export const mergeCart: RequestHandler = async (req, res) => {
  const guestId =
    (req.headers["x-guest-id"] as string | undefined) ||
    (req.cookies.guestId as string | undefined);

  if (!guestId) {
    return res.status(200).json({ success: true, message: "Nothing to merge" });
  }

  await CartService.mergeCarts(req.user!.id, guestId);
  res.clearCookie("guestId");
  res.status(200).json({ success: true, message: "Cart merged" });
};