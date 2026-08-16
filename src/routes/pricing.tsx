import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Grind progressive overload tracker" },
      {
        name: "description",
        content:
          "Grind pricing: 3-day free trial, then 6.99 EUR per month or 49 EUR per year for the full progressive overload tracker.",
      },
      { property: "og:title", content: "Pricing — Grind" },
      { property: "og:description", content: "3 days free, then 6.99 EUR/month or 49 EUR/year." },
    ],
  }),
  component: PricingPage,
});

const PERKS = [
  "landing.f1.title",
  "landing.f2.title",
  "landing.f3.title",
  "landing.f4.title",
] as const;

function PricingPage() {
  const { t } = useI18n();

  return (
    <div className="hero-surface min-h-screen px-4 py-14">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="font-display text-2xl font-extrabold">
          GRIND
        </Link>
        <h1 className="mt-8 text-4xl font-extrabold sm:text-5xl">{t("pricing.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("pricing.subtitle")}</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card p-7">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {t("pricing.monthly")}
            </p>
            <p className="mt-4 font-display text-5xl font-extrabold tabular">6,99 €</p>
            <p className="text-sm text-muted-foreground">{t("pricing.perMonth")}</p>
            <Button asChild variant="outline" className="mt-6 h-12 w-full">
              <Link to="/auth">{t("pricing.choose")}</Link>
            </Button>
          </div>

          <div className="glow-card relative rounded-2xl border border-secondary/50 bg-card p-7">
            <span className="neon-ring absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
              {t("pricing.best")}
            </span>
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary">
              {t("pricing.yearly")}
            </p>
            <p className="mt-4 font-display text-5xl font-extrabold tabular">49,00 €</p>
            <p className="text-sm text-muted-foreground">
              {t("pricing.perYear")} · ~4,08 € {t("pricing.perMonth")}
            </p>
            <p className="mt-2 text-sm font-semibold text-accent">{t("pricing.save")}</p>
            <Button asChild className="mt-6 h-12 w-full font-bold">
              <Link to="/auth">{t("pricing.choose")}</Link>
            </Button>
          </div>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-3 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span>{t(perk)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}