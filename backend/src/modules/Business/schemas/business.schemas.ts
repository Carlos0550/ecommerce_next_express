import { BusinessBankData } from "@prisma/client";

export type BusinessDataRequest = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  type?: string;
  description?: string;
  business_image?: string;
  favicon?: string;
  hero_image?: string;
  bankData: BusinessBankData[];
};
