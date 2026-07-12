import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { errors } from "@/utils/errors";
import { isEmailValid } from "@/config/validator";

export const login = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const { email } = req.body as { email?: string };
  if (!email || !isEmailValid(email)) throw errors.invalidEmail();
  next();
});

export const createUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const { email } = req.body as { email?: string };
  if (!email || !isEmailValid(email)) throw errors.invalidEmail();
  next();
});

export const CreateUserController = asyncHandler(
  async (req: Request, _res: Response, pass: NextFunction) => {
    const { name, email, role_id } = req.body as {
      name?: string;
      email?: string;
      role_id?: number;
    };
    if (!name || !email || !role_id)
      throw errors.missingFields(["name", "email", "role_id"]);
    pass();
  },
);