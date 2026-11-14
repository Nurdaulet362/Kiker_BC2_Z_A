import { LESSONS, type Lesson } from "./learning/model";

export const isDemoAccess = (value: unknown): boolean => value === "true";
export const DEMO_ACCESS = isDemoAccess(import.meta.env.VITE_DEMO_ACCESS);

// The owner may set an external interest page here. No form is hosted by the app.
export const PRO_INTEREST_URL = "";

export function canAccessLesson(level: Lesson["level"], demoAccess = DEMO_ACCESS): boolean {
  return level === "foundation" || demoAccess;
}

export function resolveAccessRoute(hash: string, demoAccess = DEMO_ACCESS): string {
  if (hash === "#practice") return "#lesson/revenue-cancelled";
  const lesson = hash.startsWith("#lesson/") ? LESSONS.find(item => item.id === hash.slice(8)) : undefined;
  if (!demoAccess && (hash === "#trial" || lesson?.level === "practice")) return "#pricing";
  return hash;
}
