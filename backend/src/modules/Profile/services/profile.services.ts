import { prisma } from '@/config/prisma';
export default class ProfileServices {
  async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        profile_image: true,
        phone: true,
        shipping_street: true,
        shipping_postal_code: true,
        shipping_city: true,
        shipping_province: true,
      },
    });
    return { ok: true, user };
  }
  async updateMe(userId: number, data: Partial<{
    name: string;
    phone: string;
    shipping_street: string;
    shipping_postal_code: string;
    shipping_city: string;
    shipping_province: string;
  }>) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        profile_image: true,
        phone: true,
        shipping_street: true,
        shipping_postal_code: true,
        shipping_city: true,
        shipping_province: true,
      },
    });
    return { ok: true, user };
  }
  async updateAvatar(userId: number, filePath: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { profile_image: filePath },
      select: {
        id: true,
        email: true,
        name: true,
        profile_image: true,
      },
    });
    return { ok: true, user };
  }
}
