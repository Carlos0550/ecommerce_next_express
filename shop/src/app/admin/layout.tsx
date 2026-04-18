"use client";
import AdminLayout from "@/Components/Admin/AdminLayout";
import "@mantine/dates/styles.css";
import "@mantine/dropzone/styles.css";
import { usePathname } from "next/navigation";
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith("/admin/auth");
  if (isAuthPage) {
    return <>{children}</>;
  }
  return (
    <AdminLayout>{children}</AdminLayout>
  );
}
