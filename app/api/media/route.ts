import { NextResponse } from "next/server";
import {
  isAllowedMediaFile,
  safeMediaFileName,
} from "@/lib/canvas/media";
import { uploadCanvasMedia } from "@/lib/canvas/load-scene";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    "name" in value &&
    typeof (value as { name: unknown }).name === "string"
  );
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!isUploadedFile(file) || file.size === 0) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  if (!isAllowedMediaFile(file)) {
    return NextResponse.json(
      { error: "Use jpeg, jpg, png, heic, mov, or mp4" },
      { status: 400 },
    );
  }

  const fileName = safeMediaFileName(file.name);

  try {
    if (isSupabaseConfigured()) {
      const src = await uploadCanvasMedia(file, `canvas/${fileName}`);
      return NextResponse.json({ src });
    }

    const dest = path.join(process.cwd(), "public/media", fileName);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ src: `/media/${fileName}` });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save media";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
