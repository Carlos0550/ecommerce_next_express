export type BusinessData = {
  id?: string;
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
};

export const getBusinessInfo = async (): Promise<BusinessData | null> => {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
  try {
    const res = await fetch(`${baseUrl}/business/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Error fetching business info:", error);
    return null;
  }
};
