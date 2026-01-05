import { prisma } from '@/config/prisma';

export default class FaqServices {
  async listPublic() {
    const items = await prisma.fAQ.findMany({
      where: { is_active: true, deleted_at: null },
      orderBy: [{ position: 'asc' }, { created_at: 'desc' }],
    });
    return { ok: true, items };
  }

  async listAdmin(page: number = 1, limit: number = 50) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [items, total] = await Promise.all([
      prisma.fAQ.findMany({
        orderBy: [{ position: 'asc' }, { created_at: 'desc' }],
        skip,
        take: Math.max(1, limit),
      }),
      prisma.fAQ.count(),
    ]);
    return { ok: true, items, page, total };
  }

  async create(data: { question: string; answer: string; position?: number; is_active?: boolean }, tenantId: string) {
    const item = await prisma.fAQ.create({ data: { ...data, tenant: { connect: { id: tenantId } } } });
    return { ok: true, item };
  }

  async update(id: string, data: Partial<{ question: string; answer: string; position: number; is_active: boolean }>) {
    const item = await prisma.fAQ.update({ where: { id }, data });
    return { ok: true, item };
  }

  async softDelete(id: string) {
    await prisma.fAQ.delete({ where: { id } });
    return { ok: true };
  }
}

