import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CalendarDays, Dumbbell, Flame, LineChart, LogOut, Settings } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useSettings, useSubscription } from "@/hooks/use-grind-data";
import { flushPending } from "@/lib/offline-queue";
import { daysLeft } from "@/lib/grind";
import { useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/app", labelKey: "nav.today", icon: Flame },
  { to: "/app/plan", labelKey: "nav.plan", icon: CalendarDays },
  { to: "/app/exercises", labelKey: "nav.exercises", icon: Dumbbell },
  { to: "/app/progress", labelKey: "nav.progress", icon: LineChart },
  { to: "/app/settings", labelKey: "nav.settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { t, setLang, lang } = useI18n();
  const navigate = useNavigate();
  const { userId } = useAuthUser();
  const { data: settings } = useSettings(userId);
  const { data: subscription } = useSubscription(userId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (settings?.lang && settings.lang !== lang) setLang(settings.lang as Lang);
  }, [settings?.lang, lang, setLang]);

  useEffect(() => {
    if (!userId) return;
    const sync = async () => {
      const flushed = await flushPending(userId);
      if (flushed > 0) toast.success(t("workout.synced"));
    };
    void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("online", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, t]);

  const trialDays =
    subscription?.status === "trialing" ? daysLeft(subscription.trial_ends_at) : null;

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/app" className="font-display text-xl font-extrabold tracking-tight">
            GRIND
          </Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  pathname === item.to && "bg-muted text-foreground",
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {trialDays !== null && (
              <Link
                to="/pricing"
                className="hidden rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent sm:block"
              >
                {trialDays > 0 ? t("trial.left", { n: trialDays }) : t("trial.over")}
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("auth.signout")}
              onClick={async () => {
                await supabase.auth.signOut();
                void navigate({ to: "/" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur-xl md:hidden">
        <div className="flex items-stretch">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium text-muted-foreground",
                  active && "text-secondary",
                )}
              >
                <Icon className="size-5" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}