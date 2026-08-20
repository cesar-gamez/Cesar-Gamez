type RedactionGrade = {
  css: string;
  file: string;
};

const REDACTION_GRADES: RedactionGrade[] = [
  { css: "Redaction", file: "/fonts/redaction-latin-400-normal.woff2" },
  { css: "Redaction 10", file: "/fonts/redaction-10-latin-400-normal.woff2" },
  { css: "Redaction 20", file: "/fonts/redaction-20-latin-400-normal.woff2" },
  { css: "Redaction 35", file: "/fonts/redaction-35-latin-400-normal.woff2" },
  { css: "Redaction 50", file: "/fonts/redaction-50-latin-400-normal.woff2" },
  { css: "Redaction 70", file: "/fonts/redaction-70-latin-400-normal.woff2" },
  { css: "Redaction 100", file: "/fonts/redaction-100-latin-400-normal.woff2" },
];

export const REDACTION_CYCLE_MS = 300;

export function pickNextFont(fonts: string[], current: string): string {
  if (fonts.length === 0) return current;
  if (fonts.length === 1) return fonts[0];

  let next = current;
  while (next === current) {
    next = fonts[Math.floor(Math.random() * fonts.length)]!;
  }
  return next;
}

export async function loadInstalledRedactionFonts(): Promise<string[]> {
  const results = await Promise.all(
    REDACTION_GRADES.map(async (grade) => {
      const face = new FontFace(grade.css, `url("${grade.file}")`, {
        style: "normal",
        weight: "400",
      });
      try {
        await face.load();
        document.fonts.add(face);
        return grade.css;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((name): name is string => Boolean(name));
}
