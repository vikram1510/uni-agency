import { getCollection, type CollectionEntry } from "astro:content";

export type University = CollectionEntry<"universities">;
export type Level = University["data"]["levels"][number];

export const levelLabels: Record<Level, string> = {
  foundation: "Foundation (Level 3–5)",
  undergraduate: "Undergraduate",
  "top-up": "Level 6 Top-Up",
  postgraduate: "Postgraduate",
};

export async function getUniversities(): Promise<University[]> {
  const unis = await getCollection("universities");
  return unis.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export function universityPath(id: string): string {
  return `/universities/${id}/`;
}
