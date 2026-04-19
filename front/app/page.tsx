import Link from "next/link";
import { CinnamonLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-20 text-center">
      <CinnamonLogo size={40} />
      <div className="max-w-lg space-y-3">
        <h1 className="font-grotesk text-3xl font-semibold tracking-tight">
          Frontend en construcción.
        </h1>
        <p className="text-sm text-[color:var(--color-text-dim)]">
          Estamos reescribiendo la tienda. Por ahora, accedé al panel de administración.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg" className="rounded-full">
          <Link href="/admin/login">Panel admin</Link>
        </Button>
      </div>
    </main>
  );
}
