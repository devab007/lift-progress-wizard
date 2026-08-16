import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Gauge, Trophy, WifiOff } from "lucide-react";

import heroImage from "@/assets/hero-barbell.jpg";
import { useI18n, LANGS, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grind — Smart Progressive Overload Tracker" },
      {
        name: "description",
        content:
          "Grind computes the exact weight and reps for your next set from your training history. Gym-fast logging, offline-first, PRs and 1RM analytics.",
      },
      { property: "og:title", content: "Grind — Smart Progressive Overload Tracker" },
      {
        property: "og:description",
        content: "Log sets in seconds, get overload recommendations, break records.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Brain, title: "landing.f1.title", text: "landing.f1.text" },
  { icon: Gauge, title: "landing.f2.title", text: "landing.f2.text" },
  { icon: WifiOff, title: "landing.f3.title", text: "landing.f3.text" },
  { icon: Trophy, title: "landing.f4.title", text: "landing.f4.text" },
] as const;

function Landing() {
  const { t, lang, setLang } = useI18n();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-5">
        <span className="font-display text-2xl font-extrabold">GRIND</span>
        <div className="ml-auto flex items-center gap-1">
          {LANGS.map((item) => (
            <button
              key={item}
              onClick={() => setLang(item as Lang)}
              className={
                item === lang
                  ? "rounded-full bg-muted px-3 py-1.5 text-xs font-bold uppercase"
                  : "rounded-full px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground"
              }
            >
              {item}
            </button>
          ))}
        </div>
        <Button asChild variant="ghost" className="hidden sm:inline-flex">
          <Link to="/auth">{t("auth.signin")}</Link>
        </Button>
      </header>

      <section className="hero-surface mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 lg:grid-cols-2">
        <div className="animate-rise">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
            {t("app.tagline")}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t("landing.heroText")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              className="h-14 bg-accent px-7 text-base font-extrabold text-accent-foreground hover:bg-accent/90"
            >
              <Link to="/auth">{t("landing.cta")}</Link>
            </Button>
            <Button asChild variant="outline" className="h-14 px-7 text-base">
              <Link to="/pricing">{t("landing.secondary")}</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("auth.trial")}</p>
        </div>

        <div className="glow-card overflow-hidden rounded-3xl border border-border/60">
          <img
            src={heroImage}
            alt="Loaded barbell under violet neon light in a dark gym"
            width={1600}
            height={1104}
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-border/60 bg-card p-6"
              >
                <Icon className="size-6 text-secondary" />
                <h2 className="mt-4 text-xl font-bold">{t(feature.title)}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{t(feature.text)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="glow-card flex flex-col items-start gap-5 rounded-3xl border border-secondary/40 bg-card p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold">
              6,99 € {t("pricing.perMonth")} · 49,00 € {t("pricing.perYear")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("pricing.subtitle")}</p>
          </div>
          <Button asChild className="ml-auto h-14 px-7 text-base font-bold">
            <Link to="/pricing">{t("pricing.title")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
