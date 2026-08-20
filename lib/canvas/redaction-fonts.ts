type RedactionGrade = {
  css: string;
  locals: string[];
};

const REDACTION_GRADES: RedactionGrade[] = [
  {
    css: "Redaction",
    locals: [
      "Redaction Regular",
      "Redaction-Regular",
      "Redacted Regular",
      "Redacted-Regular",
      "Redaction",
      "Redacted",
    ],
  },
  {
    css: "Redaction 10",
    locals: [
      "Redaction 10 Regular",
      "Redaction10-Regular",
      "Redacted 10 Regular",
      "Redacted10-Regular",
      "Redaction 10",
      "Redacted 10",
    ],
  },
  {
    css: "Redaction 20",
    locals: [
      "Redaction 20 Regular",
      "Redaction20-Regular",
      "Redacted 20 Regular",
      "Redacted20-Regular",
      "Redaction 20",
      "Redacted 20",
    ],
  },
  {
    css: "Redaction 35",
    locals: [
      "Redaction 35 Regular",
      "Redaction35-Regular",
      "Redacted 35 Regular",
      "Redacted35-Regular",
      "Redaction 35",
      "Redacted 35",
    ],
  },
  {
    css: "Redaction 50",
    locals: [
      "Redaction 50 Regular",
      "Redaction50-Regular",
      "Redacted 50 Regular",
      "Redacted50-Regular",
      "Redaction 50",
      "Redacted 50",
    ],
  },
  {
    css: "Redaction 70",
    locals: [
      "Redaction 70 Regular",
      "Redaction70-Regular",
      "Redacted 70 Regular",
      "Redacted70-Regular",
      "Redaction 70",
      "Redacted 70",
    ],
  },
  {
    css: "Redaction 100",
    locals: [
      "Redaction 100 Regular",
      "Redaction100-Regular",
      "Redacted 100 Regular",
      "Redacted100-Regular",
      "Redaction 100",
      "Redacted 100",
    ],
  },
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
  const loaded: string[] = [];

  for (const grade of REDACTION_GRADES) {
    const src = grade.locals.map((name) => `local("${name}")`).join(", ");
    const face = new FontFace(grade.css, src, {
      style: "normal",
      weight: "400",
    });

    try {
      await face.load();
      document.fonts.add(face);
      loaded.push(grade.css);
    } catch {
      continue;
    }
  }

  return loaded;
}
