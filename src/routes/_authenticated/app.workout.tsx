import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CloudOff, Flag, Plus, Timer, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuthUser, useExercises, useHistory, usePlans, useSettings } from "@/hooks/use-grind-data";
import {
  SET_TYPES,
  epley1Rm,
  exerciseName,
  recommendNextSet,
  todayDayOfWeek,
  type LoggedSet,
  type SetType,
} from "@/lib/grind";
import {
  clearSession,
  loadSession,
  pushSession,
  queueSession,
  saveSession,
  type ActiveSession,
} from "@/lib/offline-queue";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { NumPad } from "@/components/num-pad";
import { RestTimer } from "@/components/rest-timer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/workout")({
  component: WorkoutPage,
});

function WorkoutPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId } = useAuthUser();
  const { data: settings } = useSettings(userId);
  const { data: plans } = usePlans(userId);
  const { data: exercises } = useExercises();
  const { data: history } = useHistory(userId);

  const [session, setSession] = useState<ActiveSession | null>(null);
  const [activeExercise, setActiveExercise] = useState<string | null>(null);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [setType, setSetType] = useState<SetType>("normal");
  const [restStartedAt, setRestStartedAt] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const unit = settings?.unit_preference ?? "kg";
  const restSeconds = settings?.rest_timer_seconds ?? 90;
  const plan = plans?.find((p) => p.day_of_week === todayDayOfWeek());

  // Restore or create the local (offline-first) session.
  useEffect(() => {
    if (session) return;
    const existing = loadSession();
    if (existing) {
      setSession(existing);
      setActiveExercise(existing.exerciseIds[0] ?? null);
      return;
    }
    if (!plan) return;
    const fresh: ActiveSession = {
      name: plan.name,
      startedAt: Date.now(),
      exerciseIds: plan.exercise_ids,
      sets: [],
    };
    saveSession(fresh);
    setSession(fresh);
    setActiveExercise(fresh.exerciseIds[0] ?? null);
  }, [plan, session]);

  useEffect(() => {
    if (!session) return;
    const id = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [session]);

  const lastSetsFor = useCallback(
    (exerciseId: string): LoggedSet[] => {
      const rows = (history ?? []).filter((row) => row.exerciseId === exerciseId);
      return rows[0]?.sets ?? [];
    },
    [history],
  );

  const reco = useMemo(() => {
    if (!activeExercise) return null;
    return recommendNextSet(lastSetsFor(activeExercise), settings?.progression_style ?? "modere");
  }, [activeExercise, lastSetsFor, settings?.progression_style]);

  useEffect(() => {
    if (!reco) return;
    setWeight(reco.weight ? String(reco.weight) : "");
    setReps(String(reco.reps));
  }, [reco]);

  const currentSets = session?.sets.filter((s) => s.exerciseId === activeExercise) ?? [];

  const bestPreviousOneRm = activeExercise
    ? Math.max(
        0,
        ...(history ?? [])
          .filter((row) => row.exerciseId === activeExercise)
          .flatMap((row) => row.sets.map((s) => epley1Rm(s.weight, s.reps))),
      )
    : 0;

  const logSet = () => {
    if (!session || !activeExercise) return;
    const w = Number(weight);
    const r = Number(reps);
    if (!Number.isFinite(w) || w < 0 || !Number.isFinite(r) || r <= 0) return;

    const next: ActiveSession = {
      ...session,
      sets: [
        ...session.sets,
        {
          localId: crypto.randomUUID(),
          exerciseId: activeExercise,
          setNumber: currentSets.length + 1,
          setType,
          weight: w,
          reps: r,
          targetReps: reco?.reps ?? 8,
          synced: false,
        },
      ],
    };
    saveSession(next);
    setSession(next);
    setPulse(true);
    window.setTimeout(() => setPulse(false), 500);
    if (navigator.vibrate) navigator.vibrate(20);
    setRestStartedAt(Date.now());

    if (setType !== "warmup" && epley1Rm(w, r) > bestPreviousOneRm && bestPreviousOneRm > 0) {
      if (navigator.vibrate) navigator.vibrate([30, 40, 90]);
      toast.success(t("workout.pr"));
    }
    if (!navigator.onLine) toast.message(t("workout.offline"));
  };

  const finish = async () => {
    if (!session || !userId) return;
    if (session.sets.length === 0) {
      clearSession();
      void navigate({ to: "/app" });
      return;
    }
    try {
      await pushSession(session, userId);
      toast.success(t("workout.synced"));
    } catch {
      queueSession(session);
      toast.message(t("workout.offline"));
    }
    clearSession();
    setSession(null);
    void qc.invalidateQueries({ queryKey: ["history", userId] });
    void navigate({ to: "/app" });
  };

  if (!session) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-sm text-muted-foreground">{t("today.noPlan")}</p>
      </div>
    );
  }

  const exercise = exercises?.find((e) => e.id === activeExercise);

  return (
    <div className="space-y-5 pb-40 animate-rise">
      <header className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-secondary">{t("workout.title")}</p>
          <h1 className="text-2xl font-extrabold">{session.name}</h1>
        </div>
        <p className="ml-auto flex items-center gap-2 font-display text-xl font-bold tabular">
          <Timer className="size-4 text-muted-foreground" />
          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
          {String(elapsed % 60).padStart(2, "0")}
        </p>
        {!navigator.onLine && <CloudOff className="size-4 text-accent" />}
      </header>

      {session.exerciseIds.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
          {t("workout.empty")}
        </p>
      ) : (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {session.exerciseIds.map((id) => {
            const item = exercises?.find((e) => e.id === id);
            const done = session.sets.filter((s) => s.exerciseId === id).length;
            return (
              <button
                key={id}
                onClick={() => setActiveExercise(id)}
                className={cn(
                  "shrink-0 rounded-full border border-border/60 px-4 py-2 text-sm font-medium",
                  activeExercise === id
                    ? "border-secondary/60 bg-secondary/15 text-secondary"
                    : "bg-card text-muted-foreground",
                )}
              >
                {item ? exerciseName(item, lang) : "—"}
                {done > 0 && <span className="ml-2 text-xs text-success">{done}</span>}
              </button>
            );
          })}
        </div>
      )}

      {exercise && (
        <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold">{exerciseName(exercise, lang)}</h2>
            {reco && reco.reason !== "first-time" && (
              <span className="neon-ring rounded-full bg-accent px-3 py-1 font-display text-xs font-bold text-accent-foreground">
                <Zap className="mr-1 inline size-3" />
                {t("workout.reco")} : {reco.weight} {unit} × {reco.reps}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`${t("workout.weight")} (${unit})`} value={weight || "0"} />
            <Field label={t("workout.reps")} value={reps || "0"} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumPad value={weight} onChange={setWeight} allowDecimal />
            <NumPad value={reps} onChange={setReps} />
          </div>

          <div className="flex flex-wrap gap-2">
            {SET_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSetType(type)}
                className={cn(
                  "rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold",
                  setType === type ? "border-primary bg-primary/20 text-foreground" : "text-muted-foreground",
                )}
              >
                {t("workout.type." + type)}
              </button>
            ))}
          </div>

          <Button
            onClick={logSet}
            className={cn(
              "h-16 w-full bg-success text-base font-extrabold text-success-foreground hover:bg-success/90",
              pulse && "animate-set-pulse",
            )}
          >
            <Check className="size-5" /> {t("workout.validate")}
          </Button>

          <ul className="space-y-2">
            {currentSets.map((s) => (
              <li
                key={s.localId}
                className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm"
              >
                <span className="font-display font-bold text-muted-foreground">
                  {t("workout.set")} {s.setNumber}
                </span>
                <span className="font-display text-base font-bold tabular">
                  {s.weight} {unit} × {s.reps}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {t("workout.type." + s.setType)}
                </span>
                <Check className="size-4 text-success" />
              </li>
            ))}
            {currentSets.length === 0 && (
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <Plus className="size-3" /> {t("workout.addSet")}
              </li>
            )}
          </ul>
        </section>
      )}

      <Button variant="outline" className="h-14 w-full font-bold" onClick={() => void finish()}>
        <Flag className="size-4" /> {t("workout.finish")}
      </Button>

      {restStartedAt !== null && (
        <RestTimer
          seconds={restSeconds}
          startedAt={restStartedAt}
          onDone={() => setRestStartedAt(null)}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-extrabold tabular">{value}</p>
    </div>
  );
}