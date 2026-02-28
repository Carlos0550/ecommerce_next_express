"use client";
import Login from "@/Components/Admin/pages/Login";
import { Suspense } from "react";
export default function AdminAuthPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
