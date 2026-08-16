import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  useAuthUser,
  useBodyWeights,
  useExercises,
  useHistory,
  useSettings,
} from "@/hooks/use-grind-data";
import { epley1Rm, exerciseName, setVolume } from "@/lib/grind";
import { useI18n } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const { t, lang } = useI18n();
  const { userId } = useAuthUser();
  const { data: settings } = useSettings(userId);
  const { data: history } = useHistory(userId);
  const { data: exercises } = useExercises();
  const { data: bodyWeights } = useBodyWeights(userId);
  const [exerciseId, setExerciseId] = useState<string>("");

  const unit = settings?.unit_preference ?? "kg";
  const trained = useMemo(() => {
    const ids = new Set((history ?? []).map((row) => row.exerciseId));
    return (exercises ?? []).filter((e) => ids.has(e.id));
  }, [history, exercises]);
  const selected = exerciseId || trained[0]?.id || "";

  const oneRmSeries = useMemo(() => {
    return (history ?? [])
      .filter((row) => row.exerciseId === selected)
      .map((row) => ({
        date: row.completedAt.slice(5, 10),
        value: Math.max(0, ...row.sets.map((s) => epley1Rm(s.weight, s.reps))),
      }))
      .reverse();
  }, [history, selected]);

  const volumeSeries = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const row of history ?? []) {
      const date = new Date(row.completedAt);
      const monday = new Date(date);
      const shift = (date.getDay() + 6) % 7;
      monday.setDate(date.getDate() - shift);
      const key = monday.toISOString().slice(0, 10);
      buckets.set(key, (buckets.get(key) ?? 0) + setVolume(row.sets));
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([week, value]) => ({ week: week.slice(5), value: Math.round(value) }));
  }, [history]);

  const prs = useMemo(() => {
    const rows = (history ?? []).filter((row) => row.exerciseId === selected);
    const sets = rows.flatMap((row) => row.sets);
    if (sets.length === 0) return null;
    return {
      maxWeight: Math.max(...sets.map((s) => s.weight)),
      maxReps: Math.max(...sets.map((s) => s.reps)),
      maxVolume: Math.round(Math.max(...rows.map((row) => setVolume(row.sets)))),
    };
  }, [history, selected]);

  const sessionDays = useMemo(
    () => new Set((history ?? []).map((row) => row.completedAt.slice(0, 10))),
    [history],
  );
  const last35 = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => {
        const d = new Date(Date.now() - (34 - i) * 86_400_000);
        return d.toISOString().slice(0, 10);
      }),
    [],
  );

  const bodySeries = (bodyWeights ?? []).map((row) => ({
    date: row.logged_at.slice(5),
    value: row.weight,
  }));

  return (
    <div className="space-y-6 animate-rise">
      <h1 className="text-3xl font-extrabold">{t("progress.title")}</h1>

      <Select value={selected} onValueChange={setExerciseId}>
        <SelectTrigger className="h-12 sm:w-72">
          <SelectValue placeholder={t("nav.exercises")} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {trained.map((exercise) => (
            <SelectItem key={exercise.id} value={exercise.id}>
              {exerciseName(exercise, lang)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Panel title={`${t("progress.oneRm")} (${unit})`}>
        {oneRmSeries.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={oneRmSeries}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--secondary)"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </Panel>

      <Panel title={`${t("progress.volume")} (${unit})`}>
        {volumeSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={volumeSeries}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="value" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
      </Panel>

      <Panel title={t("progress.prs")}>
        {prs ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Pr label={t("progress.maxWeight")} value={`${prs.maxWeight} ${unit}`} />
            <Pr label={t("progress.maxReps")} value={String(prs.maxReps)} />
            <Pr label={t("progress.maxVolume")} value={`${prs.maxVolume} ${unit}`} />
          </div>
        ) : (
          <Empty />
        )}
      </Panel>

      <Panel title={t("progress.heatmap")}>
        <div className="grid grid-cols-7 gap-1.5">
          {last35.map((day) => (
            <div
              key={day}
              title={day}
              className={cn(
                "aspect-square rounded-md border border-border/50",
                sessionDays.has(day) ? "bg-success/80" : "bg-muted",
              )}
            />
          ))}
        </div>
      </Panel>

      <Panel title={`${t("progress.body")} (${unit})`}>
        {bodySeries.length > 1 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={bodySeries}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--soft)"
                fill="var(--primary)"
                fillOpacity={0.25}
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Empty />
        )}
        {settings?.target_body_weight && (
          <p className="mt-3 text-xs text-accent">
            {t("settings.targetWeight")} : {settings.target_body_weight} {unit}
          </p>
        )}
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-5">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Pr({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-extrabold tabular text-accent">{value}</p>
    </div>
  );
}

function Empty() {
  const { t } = useI18n();
  return <p className="text-sm text-muted-foreground">{t("progress.noData")}</p>;
}