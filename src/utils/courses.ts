import { getCollection, type CollectionEntry } from "astro:content";

export type Course = CollectionEntry<"courses">;
export type Level = Course["data"]["level"];

export const levels: { id: Level; label: string; intro: string }[] = [
  {
    id: "undergraduate",
    label: "Undergraduate",
    intro: "Bachelor's degrees, usually 3 years full-time. Open to school leavers and mature students with A-levels, BTECs or an Access course.",
  },
  {
    id: "postgraduate",
    label: "Postgraduate",
    intro: "Master's degrees for graduates who want to specialise or change career, usually 1 year full-time.",
  },
  {
    id: "top-up",
    label: "Level 6 Top-Up",
    intro: "Already have an HND or Foundation Degree? Top it up to a full bachelor's degree in just one year.",
  },
  {
    id: "foundation",
    label: "Level 3–5 Diploma",
    intro: "Step-by-step qualifications with no formal entry requirements at Level 3, leading to work or a top-up degree.",
  },
];

export const levelLabels = Object.fromEntries(levels.map((level) => [level.id, level.label])) as Record<Level, string>;

export async function getCourses(): Promise<Course[]> {
  const courses = await getCollection("courses");
  return courses.sort((a, b) => a.data.title.localeCompare(b.data.title));
}

export function coursePath(course: Course): string {
  return `/courses/${course.data.level}/${course.id}/`;
}

export function levelPath(level: Level): string {
  return `/courses/${level}/`;
}
