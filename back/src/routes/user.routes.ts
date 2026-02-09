import { Router } from "express";
import { z } from "zod";
import { userController } from "../controllers/user.controller";
import { openApiRegistry } from "../docs/swagger";
import { publicRegisterUserSchema } from "../services/Users/user.zod";

const registerResponseSchema = z
  .object({
    message: z.string(),
    err: z.string().optional()
  })
  .openapi("RegisterResponse");

openApiRegistry.register("RegisterResponse", registerResponseSchema);

openApiRegistry.registerPath({
  method: "post",
  path: "/public/register",
  tags: ["User"],
  summary: "Registro publico de usuario",
  request: {
    body: {
      content: {
        "application/json": {
          schema: publicRegisterUserSchema
        }
      }
    }
  },
  responses: {}
});

const router = Router()

router.post("/public/register", userController.publicRegisterUser)
router.get("/public/verify", userController.verifyAccount)

export { router as userRouter };