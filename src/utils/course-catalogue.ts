import { coursePath, getCourses, levelLabels } from "@utils/courses";
import { getUniversities, universityPath } from "@utils/universities";

let cached: Promise<string> | undefined;

async function build(): Promise<string> {
  const [universities, courses] = await Promise.all([getUniversities(), getCourses()]);
  const names = new Map(universities.map((uni) => [uni.id, uni.data.name]));

  const uniLines = universities.map((uni) => {
    const d = uni.data;
    return [
      `- ${d.name} (${universityPath(uni.id)})`,
      `  Locations: ${d.locations.join(", ")}`,
      `  Levels: ${d.levels.map((level) => levelLabels[level]).join(", ")}`,
      `  Known for: ${d.subjects.join(", ")}`,
      `  ${d.summary}`,
    ].join("\n");
  });

  const courseLines = courses.map((course) => {
    const d = course.data;
    const offeredAt = d.universities.map((ref) => names.get(ref.id)).filter(Boolean);
    return [
      `- ${d.title} (${coursePath(course)})`,
      `  Level: ${levelLabels[d.level]} | Subject: ${d.subject} | Duration: ${d.duration} | Starts: ${d.intakes.join(", ")}`,
      `  ${d.summary}`,
      `  Typical entry requirements: ${d.entryRequirements.join("; ")}`,
      `  Universities: ${offeredAt.length ? offeredAt.join(", ") : "several partner universities, an advisor can confirm which"}`,
    ].join("\n");
  });

  return `<universities>\n${uniLines.join("\n")}\n</universities>\n\n<courses>\n${courseLines.join("\n")}\n</courses>`;
}

export function getCourseCatalogue(): Promise<string> {
  cached ??= build();
  return cached;
}
