import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Dumbbell, Moon, Play, Scale, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  useAuthUser,
  useBodyWeights,
  useHistory,
  useLogBodyWeight,
  usePlans,
  useSettings,
} from "@/hooks/use-grind-data";
import { setVolume, todayDayOfWeek } from "@/lib/grind";
import { loadSession } from "@/lib/offline-queue";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/app/")({
  component: TodayPage,
});

function TodayPage() {
  const { t } = useI18n();
  const { userId } = useAuthUser();
  const { data: settings } = useSettings(userId);
  const { data: plans } = usePlans(userId);
  const { data: history } = useHistory(userId);
  const { data: bodyWeights } = useBodyWeights(userId);
  const logWeight = useLogBodyWeight(userId);
  const [weightInput, setWeightInput] = useState("");

  const unit = settings?.unit_preference ?? "kg";
  const day = todayDayOfWeek();
  const plan = plans?.find((p) => p.day_of_week === day);
  const active = typeof window !== "undefined" ? loadSession() : null;

  const weekStart = Date.now() - 7 * 86_400_000;
  const weekVolume = Math.round(
    (history ?? [])
      .filter((row) => new Date(row.completedAt).getTime() >= weekStart)
      .reduce((sum, row) => sum + setVolume(row.sets), 0),
  );
  const monthStart = Date.now() - 30 * 86_400_000;
  const sessionCount = new Set(
    (history ?? [])
      .filter((row) => new Date(row.completedAt).getTime() >= monthStart)
      .map((row) => row.workoutId),
  ).size;
  const lastWeight = bodyWeights?.at(-1)?.weight;

  return (
    <div className="space-y-6 animate-rise">
      <section className="glow-card hero-surface rounded-3xl border border-border/60 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">
          {t("day." + day)}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
          {plan ? plan.name : t("today.title")}
        </h1>

        {!plan && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">{t("today.noPlan")}</p>
            <Button asChild variant="outline" className="h-12">
              <Link to="/app/plan">
                <CalendarDays className="size-4" /> {t("today.configure")}
              </Link>
            </Button>
          </div>
        )}

        {plan?.is_rest_day && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Moon className="size-4" /> {t("today.rest")}
          </p>
        )}

        {plan && !plan.is_rest_day && (
          <div className="mt-5 space-y-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Dumbbell className="size-4" />
              {plan.exercise_ids.length} {t("plan.exercises").toLowerCase()}
            </p>
            <Button asChild className="h-14 w-full text-base font-bold sm:w-auto sm:px-8">
              <Link to="/app/workout">
                <Play className="size-5" />
                {active ? t("today.resume") : t("today.start")}
              </Link>
            </Button>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<TrendingUp className="size-4 text-secondary" />}
          label={t("today.weekVolume")}
          value={`${weekVolume.toLocaleString()} ${unit}`}
        />
        <StatCard
          icon={<CalendarDays className="size-4 text-secondary" />}
          label={t("today.sessions")}
          value={String(sessionCount)}
        />
        <StatCard
          icon={<Scale className="size-4 text-secondary" />}
          label={t("today.bodyWeight")}
          value={lastWeight ? `${lastWeight} ${unit}` : "—"}
        />
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="text-lg font-bold">{t("today.bodyWeight")}</h2>
        <div className="mt-3 flex gap-2">
          <Input
            inputMode="decimal"
            placeholder={unit}
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value.replace(",", "."))}
            className="h-12 max-w-32 font-display text-lg"
          />
          <Button
            className="h-12"
            disabled={!weightInput || logWeight.isPending}
            onClick={() => {
              const value = Number(weightInput);
              if (!Number.isFinite(value) || value <= 0) return;
              logWeight.mutate(value, {
                onSuccess: () => {
                  setWeightInput("");
                  toast.success(t("settings.saved"));
                },
                onError: (error) => toast.error(error.message),
              });
            }}
          >
            {t("today.logWeight")}
          </Button>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-extrabold tabular">{value}</p>
    </div>
  );
}