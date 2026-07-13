import { Router } from "express";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  listCiclos,
  addDeudasBulk,
  updateDeuda,
  deleteDeuda,
  addPago,
  updatePago,
  deletePago,
} from "./router.controller";

const router = Router();

const admin = [requireAuth, requireRole(["ADMIN"])] as const;

// Clientes
router.get("/clientes", ...admin, listClientes);
router.post("/clientes", ...admin, createCliente);
router.get("/clientes/:id", ...admin, getCliente);
router.put("/clientes/:id", ...admin, updateCliente);
router.delete("/clientes/:id", ...admin, deleteCliente);
router.get("/clientes/:id/ciclos", ...admin, listCiclos);

// Deudas
router.post("/clientes/:clienteId/deudas", ...admin, addDeudasBulk);
router.put("/deudas/:id", ...admin, updateDeuda);
router.delete("/deudas/:id", ...admin, deleteDeuda);

// Pagos
router.post("/ciclos/:cicloId/pagos", ...admin, addPago);
router.put("/pagos/:id", ...admin, updatePago);
router.delete("/pagos/:id", ...admin, deletePago);

export default router;
