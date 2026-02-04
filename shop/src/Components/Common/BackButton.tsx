"use client";
import { Button } from "@mantine/core"
import { useRouter } from "next/navigation"
export default function BackButton() {
  const router = useRouter()
  return (
    <Button variant="light" onClick={() => router.back()}>Volver</Button>
  )
}
