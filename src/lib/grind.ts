import type { Lang } from "./i18n";

export type MuscleGroup =
  | "chest"
  | "back"
  | "quads"
  | "hamstrings"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "calves"
  | "abs";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "quads",
  "hamstrings",
  "shoulders",
  "biceps",
  "triceps",
  "calves",
  "abs",
];

export type Equipment = "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight";
export const EQUIPMENTS: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight"];

export type SetType = "normal" | "warmup" | "drop" | "failure";
export const SET_TYPES: SetType[] = ["normal", "warmup", "drop", "failure"];

export type ProgressionStyle = "conservateur" | "modere" | "agressif";

export type Exercise = {
  id: string;
  user_id: string | null;
  name: Record<string, string>;
  muscle_group: string;
  equipment: string;
  is_custom: boolean;
};

export type LoggedSet = {
  set_number: number;
  set_type: SetType;
  weight: number;
  reps: number;
  target_reps: number;
};

export function exerciseName(exercise: Pick<Exercise, "name">, lang: Lang) {
  const name = exercise.name as Record<string, string>;
  return name[lang] ?? name["en"] ?? name["fr"] ?? Object.values(name)[0] ?? "";
}

/** Estimated one-rep max — Epley formula. */
export function epley1Rm(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function roundToIncrement(weight: number, increment = 2.5) {
  return Math.round(weight / increment) * increment;
}

export type Recommendation = {
  weight: number;
  reps: number;
  reason: "increase" | "add-reps" | "first-time";
};

const PERCENT_BY_STYLE: Record<ProgressionStyle, number> = {
  conservateur: 0.02,
  modere: 0.035,
  agressif: 0.05,
};

/**
 * Progressive overload engine.
 * If every working set met or beat its rep target -> increase load
 * (max of +2.5 and the style percentage). Otherwise -> keep the load
 * and add reps.
 */
export function recommendNextSet(
  lastSets: LoggedSet[],
  style: ProgressionStyle = "modere",
  defaultTargetReps = 8,
): Recommendation {
  const working = lastSets.filter((s) => s.set_type !== "warmup");
  if (working.length === 0) {
    return { weight: 0, reps: defaultTargetReps, reason: "first-time" };
  }

  const topWeight = Math.max(...working.map((s) => s.weight));
  const topSets = working.filter((s) => s.weight === topWeight);
  const target = topSets[0]?.target_reps ?? defaultTargetReps;
  const allHit = working.every((s) => s.reps >= (s.target_reps || defaultTargetReps));

  if (allHit) {
    const bump = Math.max(2.5, topWeight * PERCENT_BY_STYLE[style]);
    return { weight: roundToIncrement(topWeight + bump), reps: target, reason: "increase" };
  }

  const bestReps = Math.max(...topSets.map((s) => s.reps));
  const addReps = style === "agressif" ? 2 : 1;
  return {
    weight: topWeight,
    reps: Math.max(target, bestReps + addReps),
    reason: "add-reps",
  };
}

export function setVolume(sets: LoggedSet[]) {
  return sets.reduce((total, s) => total + s.weight * s.reps, 0);
}

export function todayDayOfWeek(date = new Date()) {
  const js = date.getDay();
  return js === 0 ? 7 : js;
}

export function formatWeight(value: number, unit: string) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}

export function daysLeft(iso: string | null | undefined) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}