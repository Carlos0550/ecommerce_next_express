"use client";
import { Hero as HeroPrimitive } from "@/Components/ui/Hero";

interface HeroProps {
  title: string;
  description?: string;
  backgroundImage?: string;
}

export default function Hero({ title, description }: HeroProps) {
  const scrollToProducts = () => {
    const el = document.getElementById("productos");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <div style={{ padding: "24px 20px 12px" }}>
      <HeroPrimitive
        tag="Nueva colección"
        title={title}
        subtitle={description}
        ctaLabel="Explorar productos"
        onCta={scrollToProducts}
      />
    </div>
  );
}
