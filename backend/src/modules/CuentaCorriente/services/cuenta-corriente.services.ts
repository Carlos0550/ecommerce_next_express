import { prisma } from "@/config/prisma";
import type { Prisma } from "@prisma/client";
import type {
  ClienteCCRequest,
  ClienteCCUpdateRequest,
  ClienteCCListQuery,
  ClienteCCCiclosQuery,
  DeudaBulkRequest,
  DeudaUpdateRequest,
  PagoCreateRequest,
  PagoUpdateRequest,
  ParsedDeudaLine,
} from "./schemas/cuenta-corriente.schemas";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/utils/errors";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const DEFAULT_VENCIMIENTO_DIAS = 30;

/**
 * Normaliza un teléfono a formato E.164. Si no tiene prefijo internacional,
 * se asume AR (+54). Lanza BadRequestError si el número es inválido.
 */
function normalizePhoneE164(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new BadRequestError("El teléfono es obligatorio", undefined, "invalid_phone");
  }
  // Si ya viene con +, lo respetamos; si no, asumimos AR.
  const withDefault = trimmed.startsWith("+") ? trimmed : `+54${trimmed.replace(/^0+/, "")}`;
  const parsed = parsePhoneNumberFromString(withDefault);
  if (!parsed || !parsed.isValid()) {
    throw new BadRequestError(
      `Teléfono inválido: ${raw}`,
      undefined,
      "invalid_phone",
    );
  }
  return parsed.number; // ya en formato E.164
}

/**
 * Parsea el texto multilinea de productos en líneas de deuda.
 * Formato por línea: CANTIDAD TITULO PRECIO
 * PRECIO en formato ARS (1.234,50). Líneas vacías se ignoran.
 */
function parseProductosText(texto: string): ParsedDeudaLine[] {
  const lines = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new BadRequestError(
      "Tenés que cargar al menos un producto",
      undefined,
      "empty_products",
    );
  }

  const result: ParsedDeudaLine[] = [];
  const errors: string[] = [];

  // Regex: entero, espacio(s), titulo (cualquier cosa no numérica final), precio al final.
  // El título puede contener espacios. El precio es el último token numérico.
  const LINEA_RE = /^(\d+)\s+(.+?)\s+(-?[\d.,]+)\s*$/;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const match = LINEA_RE.exec(raw);
    if (!match) {
      errors.push(`Línea ${i + 1}: formato inválido. Usar: CANTIDAD TITULO PRECIO`);
      continue;
    }
    const cantidad = parseInt(match[1]!, 10);
    const titulo = match[2]!.trim();
    const precio_unit = parseARS(match[3]!);
    if (!titulo) {
      errors.push(`Línea ${i + 1}: título vacío`);
      continue;
    }
    if (!Number.isFinite(precio_unit) || precio_unit < 0) {
      errors.push(`Línea ${i + 1}: precio inválido (${match[3]})`);
      continue;
    }
    result.push({
      cantidad,
      titulo,
      precio_unit,
      total: cantidad * precio_unit,
    });
  }

  if (errors.length > 0) {
    throw new BadRequestError(
      `Errores en el texto de productos`,
      { errors },
      "invalid_products_text",
    );
  }

  return result;
}

/**
 * Convierte un string en formato ARS ("1.234,50" o "1234.50" o "1234,50")
 * a número. Acepta tanto formato es-AR como números planos.
 */
function parseARS(input: string): number {
  const s = input.trim().replace(/\s/g, "");
  if (!s) return NaN;
  // Detectar formato: si tiene "," como decimal y "." como miles (es-AR)
  // o "." como decimal (US)
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized: string;
  if (hasComma && hasDot) {
    // El que aparece último es el decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      // formato es-AR: "." miles, "," decimal
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      // formato US: "," miles, "." decimal
      normalized = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Solo coma → decimal es-AR
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else {
    // Solo punto o ninguno
    normalized = s;
  }
  return parseFloat(normalized);
}

async function getVencimientoDias(): Promise<number> {
  const business = await prisma.businessData.findFirst({
    select: { cc_vencimiento_dias: true },
    orderBy: { id: "asc" },
  });
  const n = business?.cc_vencimiento_dias;
  return Number.isFinite(n) && n! > 0 ? n! : DEFAULT_VENCIMIENTO_DIAS;
}

function toDateAtNoon(dateStr: string): Date {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestError(`Fecha inválida: ${dateStr}`, undefined, "invalid_date");
  }
  return d;
}

/**
 * Suma activa de deudas de un ciclo.
 */
async function sumDeudas(cicloId: string): Promise<number> {
  const r = await prisma.deudaCC.aggregate({
    where: { cicloId, is_active: true, deleted_at: null },
    _sum: { total: true },
  });
  return r._sum.total ? Number(r._sum.total) : 0;
}

async function sumPagos(cicloId: string): Promise<number> {
  const r = await prisma.pagoCC.aggregate({
    where: { cicloId, is_active: true, deleted_at: null },
    _sum: { monto: true },
  });
  return r._sum.monto ? Number(r._sum.monto) : 0;
}

async function oldestDeudaFecha(cicloId: string): Promise<Date | null> {
  const oldest = await prisma.deudaCC.findFirst({
    where: { cicloId, is_active: true, deleted_at: null },
    orderBy: { fecha: "asc" },
    select: { fecha: true },
  });
  return oldest?.fecha ?? null;
}

async function latestPagoFecha(cicloId: string): Promise<Date | null> {
  const latest = await prisma.pagoCC.findFirst({
    where: { cicloId, is_active: true, deleted_at: null },
    orderBy: { fecha: "desc" },
    select: { fecha: true },
  });
  return latest?.fecha ?? null;
}

/**
 * Recalcula el estado de un ciclo según sus deudas/pagos activas.
 * - Si Σpagos >= Σdeudas y estado=ABIERTO → cierra.
 * - Si Σpagos < Σdeudas y estado=CERRADO → reabre (post-edición).
 */
async function recalcularCiclo(cicloId: string): Promise<void> {
  const [totalDeudas, totalPagos, ciclo] = await Promise.all([
    sumDeudas(cicloId),
    sumPagos(cicloId),
    prisma.ciclo.findUnique({ where: { id: cicloId } }),
  ]);
  if (!ciclo) return;

  if (ciclo.estado === "ABIERTO" && totalPagos >= totalDeudas && totalDeudas > 0) {
    await prisma.ciclo.update({
      where: { id: cicloId },
      data: { estado: "CERRADO", fecha_cierre: new Date() },
    });
  } else if (ciclo.estado === "CERRADO" && totalPagos < totalDeudas) {
    await prisma.ciclo.update({
      where: { id: cicloId },
      data: { estado: "ABIERTO", fecha_cierre: null },
    });
  }
}

/**
 * Determina si un ciclo abierto está vencido:
 * pasaron más de N días desde último pago (o apertura si no hay pagos).
 */
async function estaVencido(cicloId: string, nDias: number): Promise<boolean> {
  const ciclo = await prisma.ciclo.findUnique({ where: { id: cicloId } });
  if (!ciclo || ciclo.estado !== "ABIERTO") return false;
  const ultimoPago = await latestPagoFecha(cicloId);
  const base = ultimoPago ?? ciclo.fecha_apertura;
  const limite = new Date(base);
  limite.setUTCDate(limite.getUTCDate() + nDias);
  return new Date() > limite;
}

/**
 * Serializa un ciclo con totales, vencido y saldo pendiente.
 */
async function serializeCiclo(ciclo: any, nDias: number) {
  const [deudas, pagos] = await Promise.all([
    prisma.deudaCC.findMany({
      where: { cicloId: ciclo.id, is_active: true, deleted_at: null },
      orderBy: [{ fecha: "asc" }, { created_at: "asc" }],
    }),
    prisma.pagoCC.findMany({
      where: { cicloId: ciclo.id, is_active: true, deleted_at: null },
      orderBy: [{ fecha: "desc" }, { created_at: "desc" }],
    }),
  ]);
  const totalDeudas = deudas.reduce(
    (acc: number, d: any) => acc + Number(d.total),
    0,
  );
  const totalPagos = pagos.reduce(
    (acc: number, p: any) => acc + Number(p.monto),
    0,
  );
  const vencido =
    ciclo.estado === "ABIERTO" ? await estaVencido(ciclo.id, nDias) : false;
  return {
    ...ciclo,
    deudas,
    pagos,
    total_adeudado: totalDeudas,
    total_pagado: totalPagos,
    saldo_pendiente: Math.max(0, totalDeudas - totalPagos),
    vencido,
  };
}

export default class CuentaCorrienteServices {
  // ---------- Clientes ----------

  async listClientes(query: ClienteCCListQuery) {
    const page = Math.max(1, query.page);
    const limit = Math.max(1, Math.min(200, query.limit));
    const skip = (page - 1) * limit;

    const where: Prisma.ClienteCCWhereInput = {
      is_active: true,
      deleted_at: null,
    };

    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.OR = [
        { nombre: { contains: term, mode: "insensitive" } },
        { telefono: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const [clientes, total] = await Promise.all([
      prisma.clienteCC.findMany({
        where,
        skip,
        take: limit,
        include: { cuenta: { include: { ciclos: true } } },
        orderBy: [{ created_at: "desc" }],
      }),
      prisma.clienteCC.count({ where }),
    ]);

    const nDias = await getVencimientoDias();

    const items = await Promise.all(
      clientes.map(async (c) => {
        const ciclos = c.cuenta?.ciclos ?? [];
        const cicloAbierto = ciclos.find((ci) => ci.estado === "ABIERTO") ?? null;
        // Totales acumulados solo del ciclo abierto (deuda/entrega "actual")
        let adeudadoActual = 0;
        let entregadoActual = 0;
        if (cicloAbierto) {
          const [d, p] = await Promise.all([
            sumDeudas(cicloAbierto.id),
            sumPagos(cicloAbierto.id),
          ]);
          adeudadoActual = d;
          entregadoActual = p;
        }
        let estado: "abierto" | "vencido" | "cerrado" | "sin_ciclos" = "sin_ciclos";
        if (cicloAbierto) {
          estado = await estaVencido(cicloAbierto.id, nDias)
            ? "vencido"
            : "abierto";
        } else if (ciclos.length > 0) {
          estado = "cerrado";
        }
        return {
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono,
          email: c.email,
          direccion: c.direccion,
          notas: c.notas,
          is_active: c.is_active,
          created_at: c.created_at,
          updated_at: c.updated_at,
          total_adeudado: adeudadoActual,
          total_entregado: entregadoActual,
          estado_ciclo_actual: estado,
          ciclo_abierto_id: cicloAbierto?.id ?? null,
        };
      }),
    );

    const filtered =
      query.estado && query.estado !== "sin_ciclos"
        ? items.filter((i) => i.estado_ciclo_actual === query.estado)
        : items;

    const totalFiltered = query.estado ? filtered.length : total;
    const totalPages = Math.max(
      1,
      Math.ceil((query.estado ? filtered.length : total) / limit),
    );

    return {
      ok: true,
      data: {
        items: query.estado ? filtered : items,
        pagination: {
          total: totalFiltered,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    };
  }

  async getClienteById(id: string) {
    const cliente = await prisma.clienteCC.findUnique({
      where: { id },
      include: {
        cuenta: {
          include: {
            ciclos: {
              orderBy: [{ fecha_apertura: "desc" }],
            },
          },
        },
      },
    });
    if (!cliente || cliente.deleted_at) {
      throw new NotFoundError("Cliente no encontrado", "cliente_cc_not_found");
    }
    const nDias = await getVencimientoDias();
    const ciclos = cliente.cuenta?.ciclos ?? [];
    const serialized = await Promise.all(ciclos.map((c) => serializeCiclo(c, nDias)));
    const cicloActual = serialized.find((c) => c.estado === "ABIERTO") ?? null;
    return {
      ok: true,
      item: {
        ...cliente,
        cuenta: cliente.cuenta
          ? { ...cliente.cuenta, ciclos: serialized }
          : null,
        ciclo_actual: cicloActual,
      },
    };
  }

  async createCliente(data: ClienteCCRequest) {
    const telefono = normalizePhoneE164(data.telefono);
    const nombre = data.nombre.trim();

    const existing = await prisma.clienteCC.findFirst({
      where: { nombre, telefono, deleted_at: null },
    });
    if (existing) {
      throw new ConflictError(
        "Ya existe un cliente con ese nombre y teléfono",
        undefined,
        "cliente_cc_exists",
      );
    }

    const cliente = await prisma.clienteCC.create({
      data: {
        nombre,
        telefono,
        email: data.email?.trim() || null,
        direccion: data.direccion?.trim() || null,
        notas: data.notas?.trim() || null,
        cuenta: { create: {} },
      },
      include: { cuenta: true },
    });

    return { ok: true, item: cliente };
  }

  async updateCliente(id: string, data: ClienteCCUpdateRequest) {
    const existing = await prisma.clienteCC.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      throw new NotFoundError("Cliente no encontrado", "cliente_cc_not_found");
    }

    const updateData: Prisma.ClienteCCUpdateInput = {};
    if (data.nombre !== undefined) updateData.nombre = data.nombre.trim();
    if (data.telefono !== undefined) {
      updateData.telefono = normalizePhoneE164(data.telefono);
    }
    if (data.email !== undefined) updateData.email = data.email.trim() || null;
    if (data.direccion !== undefined) {
      updateData.direccion = data.direccion.trim() || null;
    }
    if (data.notas !== undefined) updateData.notas = data.notas.trim() || null;

    // Validar unique (nombre, telefono) post-normalización
    if (data.nombre !== undefined || data.telefono !== undefined) {
      const nombreCheck = data.nombre !== undefined ? data.nombre.trim() : existing.nombre;
      const telefonoCheck =
        data.telefono !== undefined
          ? normalizePhoneE164(data.telefono)
          : existing.telefono;
      const dup = await prisma.clienteCC.findFirst({
        where: {
          nombre: nombreCheck,
          telefono: telefonoCheck,
          deleted_at: null,
          id: { not: id },
        },
      });
      if (dup) {
        throw new ConflictError(
          "Ya existe un cliente con ese nombre y teléfono",
          undefined,
          "cliente_cc_exists",
        );
      }
    }

    const item = await prisma.clienteCC.update({
      where: { id },
      data: updateData,
      include: { cuenta: true },
    });
    return { ok: true, item };
  }

  async softDeleteCliente(id: string) {
    const existing = await prisma.clienteCC.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      throw new NotFoundError("Cliente no encontrado", "cliente_cc_not_found");
    }
    await prisma.clienteCC.update({
      where: { id },
      data: { deleted_at: new Date(), is_active: false },
    });
    return { ok: true };
  }

  // ---------- Ciclos historial ----------

  async listCiclos(clienteId: string, query: ClienteCCCiclosQuery) {
    const cliente = await prisma.clienteCC.findUnique({
      where: { id: clienteId },
      include: { cuenta: true },
    });
    if (!cliente || cliente.deleted_at) {
      throw new NotFoundError("Cliente no encontrado", "cliente_cc_not_found");
    }
    const cuentaId = cliente.cuenta?.id;
    if (!cuentaId) return { ok: true, items: [] };

    const where: Prisma.CicloWhereInput = { cuentaId };
    if (query.from || query.to) {
      const fechaRange: Prisma.DateTimeFilter = {};
      if (query.from) {
        fechaRange.gte = new Date(`${query.from}T00:00:00.000Z`);
      }
      if (query.to) {
        fechaRange.lte = new Date(`${query.to}T23:59:59.999Z`);
      }
      // Ciclo con al menos una deuda O pago cuya fecha caiga en el rango
      where.OR = [
        { deudas: { some: { fecha: fechaRange, is_active: true, deleted_at: null } } },
        { pagos: { some: { fecha: fechaRange, is_active: true, deleted_at: null } } },
      ];
    }

    const ciclos = await prisma.ciclo.findMany({
      where,
      orderBy: [{ fecha_apertura: "desc" }],
    });

    const nDias = await getVencimientoDias();
    const items = await Promise.all(ciclos.map((c) => serializeCiclo(c, nDias)));
    return { ok: true, items };
  }

  // ---------- Deudas ----------

  async addDeudasBulk(clienteId: string, data: DeudaBulkRequest) {
    const cliente = await prisma.clienteCC.findUnique({
      where: { id: clienteId },
      include: { cuenta: true },
    });
    if (!cliente || cliente.deleted_at) {
      throw new NotFoundError("Cliente no encontrado", "cliente_cc_not_found");
    }
    if (!cliente.cuenta) {
      throw new BadRequestError(
        "El cliente no tiene cuenta corriente",
        undefined,
        "no_cuenta",
      );
    }

    const parsed = parseProductosText(data.productos);
    const fecha = toDateAtNoon(data.fecha_default);

    // Validar fecha no futura
    const hoy = new Date();
    hoy.setUTCHours(23, 59, 59, 999);
    if (fecha > hoy) {
      throw new BadRequestError(
        "La fecha no puede ser futura",
        undefined,
        "future_date",
      );
    }

    // Buscar o crear ciclo abierto
    let cicloAbierto = await prisma.ciclo.findFirst({
      where: { cuentaId: cliente.cuenta.id, estado: "ABIERTO" },
    });
    if (!cicloAbierto) {
      cicloAbierto = await prisma.ciclo.create({
        data: { cuentaId: cliente.cuenta.id },
      });
    } else {
      // Validar que la fecha no sea anterior a la deuda más antigua del ciclo
      const oldest = await oldestDeudaFecha(cicloAbierto.id);
      if (oldest && fecha < oldest) {
        throw new BadRequestError(
          `La fecha (${data.fecha_default}) no puede ser anterior a la deuda más antigua del ciclo actual (${oldest.toISOString().slice(0, 10)})`,
          undefined,
          "date_before_oldest",
        );
      }
    }

    // Crear todas las deudas en una transacción
    await prisma.$transaction(
      parsed.map((line) =>
        prisma.deudaCC.create({
          data: {
            cicloId: cicloAbierto.id,
            cantidad: line.cantidad,
            titulo: line.titulo,
            precio_unit: line.precio_unit,
            total: line.total,
            fecha,
          },
        }),
      ),
    );

    await recalcularCiclo(cicloAbierto.id);

    const ciclo = await prisma.ciclo.findUnique({
      where: { id: cicloAbierto.id },
    });
    return { ok: true, data: { ciclo_id: cicloAbierto.id, ciclo } };
  }

  async updateDeuda(id: string, data: DeudaUpdateRequest) {
    const existing = await prisma.deudaCC.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      throw new NotFoundError("Deuda no encontrada", "deuda_cc_not_found");
    }

    const updateData: Prisma.DeudaCCUpdateInput = {};
    if (data.cantidad !== undefined) {
      updateData.cantidad = data.cantidad;
      // recalcular total si no viene precio_unit explícito
      const precio =
        data.precio_unit !== undefined
          ? data.precio_unit
          : Number(existing.precio_unit);
      updateData.total = data.cantidad * precio;
      updateData.precio_unit = precio;
    } else if (data.precio_unit !== undefined) {
      updateData.precio_unit = data.precio_unit;
      updateData.total = Number(existing.cantidad) * data.precio_unit;
    }
    if (data.titulo !== undefined) updateData.titulo = data.titulo.trim();
    if (data.notas !== undefined) updateData.notas = data.notas.trim() || null;
    if (data.fecha !== undefined) {
      const fecha = toDateAtNoon(data.fecha);
      const hoy = new Date();
      hoy.setUTCHours(23, 59, 59, 999);
      if (fecha > hoy) {
        throw new BadRequestError(
          "La fecha no puede ser futura",
          undefined,
          "future_date",
        );
      }
      updateData.fecha = fecha;
    }

    const item = await prisma.deudaCC.update({ where: { id }, data: updateData });
    await recalcularCiclo(existing.cicloId);
    return { ok: true, item };
  }

  async softDeleteDeuda(id: string) {
    const existing = await prisma.deudaCC.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      throw new NotFoundError("Deuda no encontrada", "deuda_cc_not_found");
    }
    await prisma.deudaCC.update({
      where: { id },
      data: { deleted_at: new Date(), is_active: false },
    });
    await recalcularCiclo(existing.cicloId);
    return { ok: true };
  }

  // ---------- Pagos ----------

  async addPago(cicloId: string, data: PagoCreateRequest) {
    const ciclo = await prisma.ciclo.findUnique({ where: { id: cicloId } });
    if (!ciclo) {
      throw new NotFoundError("Ciclo no encontrado", "ciclo_not_found");
    }
    if (ciclo.estado !== "ABIERTO") {
      throw new BadRequestError(
        "El ciclo está cerrado, no se pueden añadir pagos",
        undefined,
        "ciclo_closed",
      );
    }

    const fecha = toDateAtNoon(data.fecha);
    const hoy = new Date();
    hoy.setUTCHours(23, 59, 59, 999);
    if (fecha > hoy) {
      throw new BadRequestError(
        "La fecha de pago no puede ser futura",
        undefined,
        "future_date",
      );
    }
    const oldest = await oldestDeudaFecha(cicloId);
    if (oldest && fecha < oldest) {
      throw new BadRequestError(
        "La fecha de pago no puede ser anterior a la deuda más antigua del ciclo",
        undefined,
        "date_before_oldest",
      );
    }

    // Validar sobrepago: monto + ya pagado <= total deudas
    const [totalDeudas, totalPagos] = await Promise.all([
      sumDeudas(cicloId),
      sumPagos(cicloId),
    ]);
    const saldoPendiente = Math.max(0, totalDeudas - totalPagos);
    if (data.monto > saldoPendiente + 1e-9) {
      throw new BadRequestError(
        `El monto excede el saldo pendiente (saldo: ${saldoPendiente.toFixed(2)})`,
        { saldo_pendiente: saldoPendiente },
        "overpayment",
      );
    }

    const pago = await prisma.pagoCC.create({
      data: {
        cicloId,
        monto: data.monto,
        payment_method: data.payment_method,
        fecha,
        notas: data.notas?.trim() || null,
      },
    });

    await recalcularCiclo(cicloId);
    return { ok: true, item: pago };
  }

  async updatePago(id: string, data: PagoUpdateRequest) {
    const existing = await prisma.pagoCC.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      throw new NotFoundError("Pago no encontrado", "pago_cc_not_found");
    }

    const updateData: Prisma.PagoCCUpdateInput = {};
    if (data.monto !== undefined) updateData.monto = data.monto;
    if (data.payment_method !== undefined) {
      updateData.payment_method = data.payment_method;
    }
    if (data.notas !== undefined) updateData.notas = data.notas.trim() || null;
    if (data.fecha !== undefined) {
      const fecha = toDateAtNoon(data.fecha);
      const hoy = new Date();
      hoy.setUTCHours(23, 59, 59, 999);
      if (fecha > hoy) {
        throw new BadRequestError(
          "La fecha de pago no puede ser futura",
          undefined,
          "future_date",
        );
      }
      updateData.fecha = fecha;
    }

    // Pre-validar sobrepago considerando el nuevo monto
    if (data.monto !== undefined) {
      const [totalDeudas, totalPagos] = await Promise.all([
        sumDeudas(existing.cicloId),
        sumPagos(existing.cicloId),
      ]);
      const otrosPagos = totalPagos - Number(existing.monto);
      const saldoPendiente = Math.max(0, totalDeudas - otrosPagos);
      if (data.monto > saldoPendiente + 1e-9) {
        throw new BadRequestError(
          `El monto excede el saldo pendiente (saldo: ${saldoPendiente.toFixed(2)})`,
          { saldo_pendiente: saldoPendiente },
          "overpayment",
        );
      }
    }

    const item = await prisma.pagoCC.update({ where: { id }, data: updateData });
    await recalcularCiclo(existing.cicloId);
    return { ok: true, item };
  }

  async softDeletePago(id: string) {
    const existing = await prisma.pagoCC.findUnique({ where: { id } });
    if (!existing || existing.deleted_at) {
      throw new NotFoundError("Pago no encontrado", "pago_cc_not_found");
    }
    await prisma.pagoCC.update({
      where: { id },
      data: { deleted_at: new Date(), is_active: false },
    });
    await recalcularCiclo(existing.cicloId);
    return { ok: true };
  }
}

export const _unusedConflict = ConflictError;
