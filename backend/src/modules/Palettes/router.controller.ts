import { Request, Response } from "express";
import paletteServices from "./services/palette.services";
import { generatePaletteFromPrompt } from "@/config/groq";

class PaletteController {
  async list(req: Request, res: Response) {
    const items = await paletteServices.list();
    res.json(items);
  }

  async get(req: Request, res: Response) {
    const { id } = req.params as { id: string };
    const item = await paletteServices.get(id);
    if (!item) return res.status(404).json({ error: "Palette not found" });
    res.json(item);
  }

  async create(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: "tenant_required" });

      const { name, colors, is_active } = req.body as { name: string; colors: string[]; is_active?: boolean };
      if (!name || !Array.isArray(colors) || colors.length !== 10) return res.status(400).json({ error: "Nombre y 10 colores requeridos" });
      const created = await paletteServices.create({ name, colors, is_active }, tenantId);
      res.status(201).json(created);
    } catch (e) {
      return res.status(500).json({ error: "Error creando paleta" });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { name, colors, is_active } = req.body as { name: string; colors: string[]; is_active?: boolean };
      if (!name || !Array.isArray(colors) || colors.length !== 10) return res.status(400).json({ error: "Nombre y 10 colores requeridos" });
      const updated = await paletteServices.update(id, { name, colors, is_active });
      res.json(updated);
    } catch {
      return res.status(500).json({ error: "Error actualizando paleta" });
    }
  }

  async remove(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await paletteServices.remove(id);
      res.status(204).send();
    } catch {
      return res.status(500).json({ error: "Error eliminando paleta" });
    }
  }

  async activate(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { active } = req.body as { active: boolean };
      const updated = await paletteServices.activate(id, !!active);
      res.json(updated);
    } catch {
      return res.status(500).json({ error: "Error actualizando estado" });
    }
  }

  async setUsage(req: Request, res: Response) {
    try {
      const { paletteId, target } = req.body as { paletteId: string; target: "admin" | "shop" };
      if (!paletteId || !["admin", "shop"].includes(String(target))) {
        return res.status(400).json({ error: "Datos inválidos" });
      }
      await paletteServices.setUsage(paletteId, target);
      res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: "Error configurando uso" });
    }
  }

  async getActiveFor(req: Request, res: Response) {
    const { target } = req.params as { target: "admin" | "shop" };
    if (!["admin", "shop"].includes(String(target))) return res.status(400).json({ error: "target inválido" });
    const palette = await paletteServices.getActiveFor(target);
    if (!palette) return res.status(404).json({ error: "No hay paleta activa" });
    res.json(palette);
  }

  async generate(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: "tenant_required" });

      const { prompt } = req.body as { prompt: string };
      if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Prompt requerido' });
      const { name, colors } = await generatePaletteFromPrompt(prompt);
      const created = await paletteServices.create({ name, colors, is_active: true }, tenantId);
      res.status(201).json(created);
    } catch (e) {
      return res.status(500).json({ error: 'Error generando paleta' });
    }
  }

  async random(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
      if (!tenantId) return res.status(400).json({ error: "tenant_required" });

      const { name } = req.body as { name?: string };
      const randHex = () => '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
      const base = Array.from({ length: 10 }, () => randHex());
      const created = await paletteServices.create({ name: name ?? 'random', colors: base, is_active: true }, tenantId);
      res.status(201).json(created);
    } catch {
      return res.status(500).json({ error: 'Error generando paleta aleatoria' });
    }
  }
}

export default new PaletteController();
