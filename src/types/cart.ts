// All cart types and Express augmentation live in types/index.ts.
// This file re-exports them for backwards compatibility.
export type {
  CartOwner,
  AddToCartBody,
  RemoveFromCartQuery,
  UpdateQuantityBody,
  CartRequest,
} from "./index";
