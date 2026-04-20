import { fetchFaqs } from "@/lib/shop/server";
import { FaqAccordion } from "@/components/shop/faq-accordion";

export const metadata = { title: "Preguntas frecuentes" };
export const revalidate = 300;

export default async function FaqPage() {
  const faqs = await fetchFaqs();
  return (
    <div className="mx-auto max-w-[720px] px-4 pb-16 pt-4 md:pt-10">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[1.5px] text-[var(--color-accent)]">
        Ayuda
      </div>
      <h1 className="font-grotesk text-[28px] font-semibold tracking-[-0.6px] md:text-[38px]">
        Preguntas frecuentes
      </h1>
      <p className="mt-2 text-[13px] text-[var(--color-text-dim)] md:text-[14px]">
        Respuestas a las consultas más comunes sobre envíos, pagos y devoluciones.
      </p>
      <div className="mt-6">
        {faqs.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-10 text-center text-sm text-[var(--color-text-dim)]">
            Todavía no hay preguntas publicadas.
          </div>
        ) : (
          <FaqAccordion items={faqs} />
        )}
      </div>
    </div>
  );
}
