/**
 * Disciplines describe a user's professional role within a company
 * (Architect / Engineer / Fire / Constructor). They are explicitly set by a
 * company admin on the Team page and stored on the `users.discipline` column.
 *
 * Older code inferred this from `DocumentCategory` assignments; that logic has
 * been removed in favor of the authoritative stored value.
 */
export const DISCIPLINES = [
  "Architect",
  "Engineer",
  "Fire",
  "Constructor",
] as const;
export type Discipline = (typeof DISCIPLINES)[number];

export type DisciplineOrUnassigned = Discipline | "Unassigned";

export const ALL_DISCIPLINE_FILTERS: DisciplineOrUnassigned[] = [
  ...DISCIPLINES,
  "Unassigned",
];

export function isDiscipline(value: unknown): value is Discipline {
  return (
    typeof value === "string" &&
    (DISCIPLINES as readonly string[]).includes(value)
  );
}

export function disciplineChipClass(
  d: DisciplineOrUnassigned,
  active: boolean
): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors";
  const tones: Record<DisciplineOrUnassigned, string> = {
    Architect: active
      ? "bg-blue-600 text-white"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    Engineer: active
      ? "bg-emerald-600 text-white"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    Fire: active
      ? "bg-red-600 text-white"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    Constructor: active
      ? "bg-amber-600 text-white"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    Unassigned: active
      ? "bg-muted-foreground text-background"
      : "bg-muted text-muted-foreground",
  };
  return `${base} ${tones[d]}`;
}
