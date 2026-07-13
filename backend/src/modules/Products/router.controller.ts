import type { NextFunction, Request, Response } from "express";
import { errors } from "@/utils/errors";

export const saveProduct = (req: Request, _res: Response, next: NextFunction): void => {
  const { title, price, stock } = req.body as {
    title?: string;
    price?: unknown;
    stock?: unknown;
  };
  if (!title || typeof title !== "string" || !title.trim()) {
    throw errors.missingFields(["title"]);
  }
  if (price === undefined || price === null || price === "") {
    throw errors.missingFields(["price"]);
  }
  const parsedPrice = typeof price === "string" ? parseFloat(price) : Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw errors.invalidPayload({ field: "price", reason: "must be >= 0" });
  }
  if (stock === undefined || stock === null || stock === "") {
    throw errors.missingFields(["stock"]);
  }
  const parsedStock = typeof stock === "string" ? parseInt(stock, 10) : Number(stock);
  if (!Number.isFinite(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
    throw errors.invalidPayload({ field: "stock", reason: "must be integer >= 0" });
  }
  next();
};

export const saveCategory = (req: Request, _res: Response, next: NextFunction): void => {
  const { title } = req.body as { title?: string };
  if (!title) throw errors.missingFields(["title"]);
  next();
};

export const getAllProducts = (req: Request, _res: Response, next: NextFunction): void => {
  const { page, limit, title, categoryId, isActive } = req.query as Record<string, string | undefined>;
  if (!page || !limit) throw errors.missingFields(["page", "limit"]);
  if (title !== undefined && title === "") {
    throw errors.invalidPayload({ field: "title", reason: "empty string" });
  }
  if (categoryId !== undefined && categoryId === "") {
    throw errors.invalidPayload({ field: "categoryId", reason: "empty string" });
  }
  if (isActive !== undefined) {
    const parsedBool =
      isActive === "true" ? true : isActive === "false" ? false : undefined;
    if (parsedBool === undefined) {
      throw errors.invalidPayload({ field: "isActive", reason: "must be true or false" });
    }
  }
  next();
};

export const updateProductController = (req: Request, _res: Response, next: NextFunction): void => {
  const { title, price, stock } = req.body as {
    title?: string;
    price?: unknown;
    stock?: unknown;
  };
  const { product_id } = req.params as { product_id?: string };
  if (!product_id) throw errors.missingFields(["product_id"]);
  if (!title || typeof title !== "string" || !title.trim()) {
    throw errors.missingFields(["title"]);
  }
  if (price === undefined || price === null || price === "") {
    throw errors.missingFields(["price"]);
  }
  const parsedPrice = typeof price === "string" ? parseFloat(price) : Number(price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    throw errors.invalidPayload({ field: "price", reason: "must be >= 0" });
  }
  if (stock === undefined || stock === null || stock === "") {
    throw errors.missingFields(["stock"]);
  }
  const parsedStock = typeof stock === "string" ? parseInt(stock, 10) : Number(stock);
  if (!Number.isFinite(parsedStock) || parsedStock < 0 || !Number.isInteger(parsedStock)) {
    throw errors.invalidPayload({ field: "stock", reason: "must be integer >= 0" });
  }
  next();
};

export const changeCategoryStatus = (req: Request, _res: Response, next: NextFunction): void => {
  const { category_id, status } = req.params as { category_id?: string; status?: string };
  if (!category_id || !status) throw errors.missingFields(["category_id", "status"]);
  const statusNumber = parseInt(status);
  if (![1, 2, 3].includes(statusNumber) || isNaN(statusNumber)) {
    throw errors.invalidPayload({ field: "status", reason: "must be 1, 2 or 3" });
  }
  next();
};

export const changeProductStatus = (req: Request, _res: Response, next: NextFunction): void => {
  const { product_id, state } = req.params as { product_id?: string; state?: string };
  if (!product_id || !state) throw errors.missingFields(["product_id", "state"]);
  const allowed = ["active", "inactive", "draft", "out_stock", "deleted"];
  if (!allowed.includes(state)) {
    throw errors.invalidPayload({ field: "state", reason: `must be one of: ${allowed.join(", ")}` });
  }
  next();
};