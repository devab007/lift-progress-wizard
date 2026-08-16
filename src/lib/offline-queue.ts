import { supabase } from "@/integrations/supabase/client";
import type { SetType } from "./grind";

export type ActiveSet = {
  localId: string;
  exerciseId: string;
  setNumber: number;
  setType: SetType;
  weight: number;
  reps: number;
  targetReps: number;
  synced: boolean;
};

export type ActiveSession = {
  name: string;
  startedAt: number;
  exerciseIds: string[];
  sets: ActiveSet[];
};

const KEY = "grind.activeSession";

export function loadSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: ActiveSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

/**
 * Pushes a finished local session to the backend in one shot.
 * Called when the user finishes a session, and retried automatically
 * whenever the browser comes back online or the tab becomes visible.
 */
export async function pushSession(session: ActiveSession, userId: string) {
  const durationSeconds = Math.max(1, Math.round((Date.now() - session.startedAt) / 1000));
  const { data: workout, error: workoutError } = await supabase
    .from("workouts")
    .insert({ user_id: userId, name: session.name, duration_seconds: durationSeconds })
    .select("id")
    .single();
  if (workoutError || !workout) throw workoutError ?? new Error("workout insert failed");

  const usedExercises = session.exerciseIds.filter((id) =>
    session.sets.some((s) => s.exerciseId === id),
  );

  for (const [index, exerciseId] of usedExercises.entries()) {
    const { data: we, error: weError } = await supabase
      .from("workout_exercises")
      .insert({ workout_id: workout.id, exercise_id: exerciseId, order_index: index })
      .select("id")
      .single();
    if (weError || !we) throw weError ?? new Error("workout_exercise insert failed");

    const rows = session.sets
      .filter((s) => s.exerciseId === exerciseId)
      .map((s) => ({
        workout_exercise_id: we.id,
        set_number: s.setNumber,
        set_type: s.setType,
        weight: s.weight,
        reps: s.reps,
        target_reps: s.targetReps,
      }));
    if (rows.length > 0) {
      const { error } = await supabase.from("sets").insert(rows);
      if (error) throw error;
    }
  }

  return workout.id;
}

const PENDING_KEY = "grind.pendingSessions";

export function queueSession(session: ActiveSession) {
  const pending = readPending();
  pending.push(session);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function readPending(): ActiveSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]") as ActiveSession[];
  } catch {
    return [];
  }
}

export async function flushPending(userId: string) {
  const pending = readPending();
  if (pending.length === 0) return 0;
  const left: ActiveSession[] = [];
  let flushed = 0;
  for (const session of pending) {
    try {
      await pushSession(session, userId);
      flushed += 1;
    } catch {
      left.push(session);
    }
  }
  localStorage.setItem(PENDING_KEY, JSON.stringify(left));
  return flushed;
}