import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Exercise, LoggedSet, ProgressionStyle } from "@/lib/grind";

export type UserSettings = {
  user_id: string;
  lang: string;
  unit_preference: string;
  progression_style: ProgressionStyle;
  goal: string;
  target_body_weight: number | null;
  rest_timer_seconds: number;
};

export function useAuthUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setEmail(session?.user?.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, email, ready };
}

export function useSettings(userId: string | null) {
  return useQuery({
    queryKey: ["settings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as UserSettings | null) ?? null;
    },
  });
}

export function useUpdateSettings(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<UserSettings>) => {
      const { error } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId!, ...patch, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", userId] }),
  });
}

export function useSubscription(userId: string | null) {
  return useQuery({
    queryKey: ["subscription", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("id, user_id, name, muscle_group, equipment, is_custom")
        .order("muscle_group");
      if (error) throw error;
      return (data ?? []) as unknown as Exercise[];
    },
  });
}

export type WorkoutPlan = {
  id: string;
  day_of_week: number;
  name: string;
  is_rest_day: boolean;
  exercise_ids: string[];
};

export function usePlans(userId: string | null) {
  return useQuery({
    queryKey: ["plans", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("id, day_of_week, name, is_rest_day, exercise_ids")
        .order("day_of_week");
      if (error) throw error;
      return (data ?? []) as WorkoutPlan[];
    },
  });
}

export type HistoryRow = {
  workoutId: string;
  completedAt: string;
  workoutName: string;
  durationSeconds: number | null;
  exerciseId: string;
  sets: LoggedSet[];
};

/** Full training history flattened per (workout, exercise). */
export function useHistory(userId: string | null) {
  return useQuery({
    queryKey: ["history", userId],
    enabled: !!userId,
    queryFn: async (): Promise<HistoryRow[]> => {
      const { data, error } = await supabase
        .from("workouts")
        .select(
          "id, name, completed_at, duration_seconds, workout_exercises(exercise_id, order_index, sets(set_number, set_type, weight, reps, target_reps))",
        )
        .order("completed_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows: HistoryRow[] = [];
      for (const workout of data ?? []) {
        for (const we of workout.workout_exercises ?? []) {
          rows.push({
            workoutId: workout.id,
            completedAt: workout.completed_at,
            workoutName: workout.name,
            durationSeconds: workout.duration_seconds,
            exerciseId: we.exercise_id,
            sets: (we.sets ?? []).map((s) => ({
              set_number: s.set_number,
              set_type: s.set_type as LoggedSet["set_type"],
              weight: Number(s.weight),
              reps: s.reps,
              target_reps: s.target_reps,
            })),
          });
        }
      }
      return rows;
    },
  });
}

export function useBodyWeights(userId: string | null) {
  return useQuery({
    queryKey: ["body-weights", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("body_weight_logs")
        .select("id, weight, logged_at")
        .order("logged_at");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        weight: Number(row.weight),
        logged_at: row.logged_at,
      }));
    },
  });
}

export function useLogBodyWeight(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weight: number) => {
      const { error } = await supabase
        .from("body_weight_logs")
        .upsert(
          { user_id: userId!, weight, logged_at: new Date().toISOString().slice(0, 10) },
          { onConflict: "user_id,logged_at" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-weights", userId] }),
  });
}