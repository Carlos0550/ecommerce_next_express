import { Router } from "express";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import {
  listEgresos,
  getEgreso,
  createEgreso,
  updateEgreso,
  deleteEgreso,
  listCategories,
  listActiveCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./router.controller";

const router = Router();

router.get("/categories", requireAuth, requireRole(["ADMIN"]), listCategories);
router.get(
  "/categories/active",
  requireAuth,
  requireRole(["ADMIN"]),
  listActiveCategories,
);
router.post(
  "/categories",
  requireAuth,
  requireRole(["ADMIN"]),
  createCategory,
);
router.put(
  "/categories/:id",
  requireAuth,
  requireRole(["ADMIN"]),
  updateCategory,
);
router.delete(
  "/categories/:id",
  requireAuth,
  requireRole(["ADMIN"]),
  deleteCategory,
);

router.get("/", requireAuth, requireRole(["ADMIN"]), listEgresos);
router.get("/:id", requireAuth, requireRole(["ADMIN"]), getEgreso);
router.post("/save", requireAuth, requireRole(["ADMIN"]), createEgreso);
router.put("/:id", requireAuth, requireRole(["ADMIN"]), updateEgreso);
router.delete("/:id", requireAuth, requireRole(["ADMIN"]), deleteEgreso);

export default router;
