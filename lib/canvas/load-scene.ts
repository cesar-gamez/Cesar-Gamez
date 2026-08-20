import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_SCENE,
  normalizeScene,
  type Scene,
} from "@/lib/canvas/scene";
import {
  CANVAS_MEDIA_BUCKET,
  CANVAS_SCENE_ID,
  createPublicSupabase,
  createServiceSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { mediaContentType } from "@/lib/canvas/media";

const SCENE_PATH = path.join(process.cwd(), "data/scene.json");

async function loadSceneFromDisk(): Promise<Scene> {
  try {
    const raw = await fs.readFile(SCENE_PATH, "utf8");
    return normalizeScene(JSON.parse(raw));
  } catch {
    return DEFAULT_SCENE;
  }
}

async function loadSceneFromSupabase(): Promise<Scene | null> {
  const supabase = createPublicSupabase();
  const { data, error } = await supabase
    .from("canvas_scenes")
    .select("document")
    .eq("id", CANVAS_SCENE_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data?.document) return null;
  return normalizeScene(data.document);
}

export async function loadScene(): Promise<Scene> {
  if (isSupabaseConfigured()) {
    try {
      const cloud = await loadSceneFromSupabase();
      if (cloud) return cloud;
    } catch {
      // Fall back to the local document if the project is not set up yet.
    }
  }
  return loadSceneFromDisk();
}

async function uploadLocalMediaIfNeeded(scene: Scene): Promise<Scene> {
  const supabase = createServiceSupabase();
  const media = await Promise.all(
    scene.media.map(async (item) => {
      if (!item.src.startsWith("/media/")) return item;

      const filePath = path.join(process.cwd(), "public", item.src);
      try {
        const bytes = await fs.readFile(filePath);
        const objectPath = `canvas/${path.basename(item.src)}`;
        const { error } = await supabase.storage
          .from(CANVAS_MEDIA_BUCKET)
          .upload(objectPath, bytes, {
            contentType: mediaContentType(item.src),
            upsert: true,
          });
        if (error) throw error;

        const { data } = supabase.storage
          .from(CANVAS_MEDIA_BUCKET)
          .getPublicUrl(objectPath);

        return { ...item, src: data.publicUrl };
      } catch {
        return item;
      }
    }),
  );

  return { ...scene, media };
}

export async function saveScene(scene: Scene): Promise<void> {
  const normalized = normalizeScene(scene);

  if (!isSupabaseConfigured()) {
    await fs.mkdir(path.dirname(SCENE_PATH), { recursive: true });
    await fs.writeFile(SCENE_PATH, `${JSON.stringify(normalized, null, 2)}\n`);
    return;
  }

  const document = await uploadLocalMediaIfNeeded(normalized);
  const supabase = createServiceSupabase();
  const { error } = await supabase.from("canvas_scenes").upsert({
    id: CANVAS_SCENE_ID,
    document,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function uploadCanvasMedia(
  file: Blob,
  objectPath: string,
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured");
  }

  const supabase = createServiceSupabase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = "name" in file && typeof file.name === "string" ? file.name : objectPath;
  const { error } = await supabase.storage
    .from(CANVAS_MEDIA_BUCKET)
    .upload(objectPath, bytes, {
      contentType: mediaContentType(name),
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage
    .from(CANVAS_MEDIA_BUCKET)
    .getPublicUrl(objectPath);
  return data.publicUrl;
}
