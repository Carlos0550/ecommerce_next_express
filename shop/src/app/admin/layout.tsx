"use client";
import { AdminContextProvider } from "@/providers/AdminContext";
import AdminLayout from "@/Components/Admin/AdminLayout";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/tiptap/styles.css";
import { usePathname } from "next/navigation";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/admin/auth");

  if (isAuthPage) {
    return <AdminContextProvider>{children}</AdminContextProvider>;
  }

  return (
    <AdminContextProvider>
      <AdminLayout>{children}</AdminLayout>
    </AdminContextProvider>
  );
}
