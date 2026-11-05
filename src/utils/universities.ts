import { getCollection, type CollectionEntry } from "astro:content";

export type University = CollectionEntry<"universities">;

export async function getUniversities(): Promise<University[]> {
  const unis = await getCollection("universities");
  return unis.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export function universityPath(id: string): string {
  return `/universities/${id}/`;
}
