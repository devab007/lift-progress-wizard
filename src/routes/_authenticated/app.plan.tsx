import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useExercises, usePlans, type WorkoutPlan } from "@/hooks/use-grind-data";
import { exerciseName } from "@/lib/grind";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/plan")({
  component: PlanPage,
});

const DAYS = [1, 2, 3, 4, 5, 6, 7];

function PlanPage() {
  const { t, lang } = useI18n();
  const { userId } = useAuthUser();
  const { data: plans } = usePlans(userId);
  const { data: exercises } = useExercises();
  const qc = useQueryClient();

  const savePlan = useMutation({
    mutationFn: async (plan: {
      day_of_week: number;
      name: string;
      is_rest_day: boolean;
      exercise_ids: string[];
    }) => {
      const { error } = await supabase
        .from("workout_plans")
        .upsert({ user_id: userId!, ...plan }, { onConflict: "user_id,day_of_week" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["plans", userId] });
      toast.success(t("settings.saved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-5 animate-rise">
      <h1 className="text-3xl font-extrabold">{t("plan.title")}</h1>
      <div className="space-y-4">
        {DAYS.map((day) => (
          <DayCard
            key={day}
            day={day}
            plan={plans?.find((p) => p.day_of_week === day)}
            exercises={exercises ?? []}
            lang={lang}
            onSave={(payload) => savePlan.mutate({ day_of_week: day, ...payload })}
          />
        ))}
      </div>
    </div>
  );
}

function DayCard({
  day,
  plan,
  exercises,
  lang,
  onSave,
}: {
  day: number;
  plan: WorkoutPlan | undefined;
  exercises: { id: string; name: Record<string, string>; muscle_group: string }[];
  lang: "fr" | "en" | "es";
  onSave: (payload: { name: string; is_rest_day: boolean; exercise_ids: string[] }) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState(plan?.name ?? "");
  const [rest, setRest] = useState(plan?.is_rest_day ?? false);
  const [ids, setIds] = useState<string[]>(plan?.exercise_ids ?? []);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-display text-lg font-bold">{t("day." + day)}</p>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          {t("plan.restDay")}
          <Switch checked={rest} onCheckedChange={setRest} />
        </label>
      </div>

      {!rest && (
        <div className="mt-4 space-y-4">
          <Input
            placeholder={t("plan.sessionName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12"
          />

          <div className="space-y-2">
            {ids.map((id) => {
              const exercise = exercises.find((e) => e.id === id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm"
                >
                  <span className="flex-1">
                    {exercise ? exerciseName(exercise, lang) : "—"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("common.delete")}
                    onClick={() => setIds(ids.filter((x) => x !== id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}

            <Select value="" onValueChange={(value) => setIds([...ids, value])}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={t("plan.pick")} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {exercises
                  .filter((e) => !ids.includes(e.id))
                  .map((exercise) => (
                    <SelectItem key={exercise.id} value={exercise.id}>
                      {exerciseName(exercise, lang)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Button
        className="mt-4 h-12 w-full font-bold sm:w-auto sm:px-6"
        onClick={() =>
          onSave({
            name: rest ? t("plan.restDay") : name || t("day." + day),
            is_rest_day: rest,
            exercise_ids: rest ? [] : ids,
          })
        }
      >
        <Plus className="size-4" /> {t("plan.save")}
      </Button>
    </div>
  );
}