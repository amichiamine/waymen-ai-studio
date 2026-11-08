import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSiteContent } from "@/data-provider";
import { useI18n, useLocalize, type Localized } from "@/lib/i18n";
import type { BlockConfig } from "@/types/pages";
import { HelpCircle } from "lucide-react";

interface FaqItem {
  id?: string;
  question: Localized<string>;
  answer: Localized<string>;
}

export function FaqAccordionBlock({ config }: { config: BlockConfig }) {
  const { data: siteContent } = useSiteContent();
  const { t } = useI18n();
  const L = useLocalize();
  const p = config.props || {};

  const title = L(p.title as Localized<string>) || t("contact.faq.title") || "Foire Aux Questions";
  const subtitle =
    L(p.subtitle as Localized<string>) ||
    t("contact.faq.sub") ||
    "Retrouvez rapidement les réponses à vos questions les plus courantes.";

  const rawFaqs =
    p.faqs ||
    (siteContent?.contact?.faqs && siteContent.contact.faqs.length > 0
      ? siteContent.contact.faqs
      : []);
  const faqs = (Array.isArray(rawFaqs) ? rawFaqs : []) as FaqItem[];

  if (faqs.length === 0) return null;

  return (
    <section className="container-page py-12 md:py-16 text-start">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5 mb-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h2>
        </div>
        {subtitle && <p className="text-muted-foreground text-sm sm:text-base mb-8">{subtitle}</p>}

        <Accordion type="single" collapsible className="w-full space-y-3">
          {faqs.map((faq, idx) => {
            const question = L(faq.question);
            const answer = L(faq.answer);

            return (
              <AccordionItem
                key={faq.id || idx}
                value={`faq-${idx}`}
                className="rounded-2xl border border-border/60 bg-card/60 px-5 shadow-xs"
              >
                <AccordionTrigger className="text-base font-semibold hover:text-primary transition-colors text-start">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm sm:text-base leading-relaxed whitespace-pre-line pt-1 pb-4">
                  {answer}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
}
