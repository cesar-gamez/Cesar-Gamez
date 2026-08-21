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

function fontSource(file: string): string {
  const href = new URL(file, window.location.origin).href;
  return `url("${href}") format("woff2")`;
}

async function loadFace(family: string, file: string, weight: string) {
  const face = new FontFace(family, fontSource(file), {
    style: "normal",
    weight,
  });
  document.fonts.add(face);
  await face.load();
}

export async function loadInstalledRedactionFonts(): Promise<string[]> {
  await Promise.all(
    REDACTION_GRADES.map(async (grade) => {
      try {
        await Promise.all([
          loadFace(grade.css, grade.file, "400"),
          loadFace(grade.css, grade.file, "900"),
        ]);
      } catch {
        try {
          await document.fonts.load(`900 96px "${grade.css}"`);
        } catch {
          /* CSS @font-face still registers the grade. */
        }
      }
    }),
  );

  return REDACTION_GRADES.map((grade) => grade.css);
}
