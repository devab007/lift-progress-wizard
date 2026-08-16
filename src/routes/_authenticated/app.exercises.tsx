import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUser, useExercises } from "@/hooks/use-grind-data";
import {
  EQUIPMENTS,
  MUSCLE_GROUPS,
  exerciseName,
  type Equipment,
  type MuscleGroup,
} from "@/lib/grind";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/exercises")({
  component: ExercisesPage,
});

function ExercisesPage() {
  const { t, lang } = useI18n();
  const { userId } = useAuthUser();
  const { data: exercises } = useExercises();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<MuscleGroup | "all">("all");
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<MuscleGroup>("chest");
  const [newEquipment, setNewEquipment] = useState<Equipment>("barbell");

  const createExercise = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("exercises").insert({
        user_id: userId!,
        name: { fr: newName, en: newName, es: newName },
        muscle_group: newGroup,
        equipment: newEquipment,
        is_custom: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName("");
      void qc.invalidateQueries({ queryKey: ["exercises"] });
      toast.success(t("settings.saved"));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeExercise = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["exercises"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (exercises ?? []).filter((exercise) => {
      if (group !== "all" && exercise.muscle_group !== group) return false;
      if (!term) return true;
      return exerciseName(exercise, lang).toLowerCase().includes(term);
    });
  }, [exercises, group, search, lang]);

  return (
    <div className="space-y-6 animate-rise">
      <h1 className="text-3xl font-extrabold">{t("exercises.title")}</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("exercises.search")}
            className="h-12 pl-9"
          />
        </div>
        <Select value={group} onValueChange={(value) => setGroup(value as MuscleGroup | "all")}>
          <SelectTrigger className="h-12 sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("exercises.group")}</SelectItem>
            {MUSCLE_GROUPS.map((item) => (
              <SelectItem key={item} value={item}>
                {t("muscle." + item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((exercise) => (
          <div
            key={exercise.id}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
          >
            <div className="flex-1">
              <p className="font-medium">{exerciseName(exercise, lang)}</p>
              <p className="text-xs text-muted-foreground">
                {t("muscle." + exercise.muscle_group)} · {t("equip." + exercise.equipment)}
              </p>
            </div>
            {exercise.is_custom && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("common.delete")}
                onClick={() => removeExercise.mutate(exercise.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <h2 className="text-lg font-bold">{t("exercises.add")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("exercises.name")}
            className="h-12"
          />
          <Select value={newGroup} onValueChange={(value) => setNewGroup(value as MuscleGroup)}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_GROUPS.map((item) => (
                <SelectItem key={item} value={item}>
                  {t("muscle." + item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={newEquipment}
            onValueChange={(value) => setNewEquipment(value as Equipment)}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EQUIPMENTS.map((item) => (
                <SelectItem key={item} value={item}>
                  {t("equip." + item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="mt-4 h-12 w-full font-bold sm:w-auto sm:px-6"
          disabled={!newName.trim() || createExercise.isPending}
          onClick={() => createExercise.mutate()}
        >
          <Plus className="size-4" /> {t("common.add")}
        </Button>
      </div>
    </div>
  );
}