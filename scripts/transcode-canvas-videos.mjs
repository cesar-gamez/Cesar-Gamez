import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SCENE_ID = "main";
const BUCKET = "canvas-media";
const VIDEO_EXT = new Set(["mp4", "mov"]);
const MAX_WIDTH = 1280;

function parseEnvFile(raw) {
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const cut = trimmed.indexOf("=");
    if (cut === -1) continue;
    const key = trimmed.slice(0, cut).trim();
    let value = trimmed.slice(cut + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function extensionOf(src) {
  const pathname = (src.split("?")[0] ?? src);
  const dot = pathname.lastIndexOf(".");
  return dot === -1 ? "" : pathname.slice(dot + 1).toLowerCase();
}

function isVideo(src) {
  return VIDEO_EXT.has(extensionOf(src));
}

function alreadyTranscoded(src) {
  return /-h264\.mp4(\?|$)/i.test(src);
}

function objectPathFromUrl(src) {
  const marker = `/object/public/${BUCKET}/`;
  const from = src.indexOf(marker);
  if (from === -1) return null;
  return decodeURIComponent(src.slice(from + marker.length).split("?")[0] ?? "");
}

function h264Path(objectPath) {
  const ext = path.extname(objectPath);
  const base = objectPath.slice(0, -ext.length);
  return `${base}-h264.mp4`;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `${command} exited ${code}`));
    });
  });
}

async function transcode(inputPath, outputPath) {
  try {
    await run("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "high",
      "-crf",
      "23",
      "-preset",
      "medium",
      "-vf",
      `scale='min(${MAX_WIDTH},iw)':-2`,
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      outputPath,
    ]);
  } catch (error) {
    await run("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "high",
      "-crf",
      "23",
      "-preset",
      "medium",
      "-vf",
      `scale='min(${MAX_WIDTH},iw)':-2`,
      "-movflags",
      "+faststart",
      outputPath,
    ]);
    void error;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const envPath = path.join(process.cwd(), ".env.local");
  const env = {
    ...process.env,
    ...parseEnvFile(await readFile(envPath, "utf8")),
  };

  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !serviceKey) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  }

  await run("ffmpeg", ["-version"]);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: row, error: loadError } = await supabase
    .from("canvas_scenes")
    .select("document")
    .eq("id", SCENE_ID)
    .maybeSingle();
  if (loadError) throw loadError;
  if (!row?.document) throw new Error("No canvas scene found");

  const scene = row.document;
  const videos = (scene.media ?? []).filter(
    (item) => item?.src && isVideo(item.src) && !alreadyTranscoded(item.src),
  );

  if (videos.length === 0) {
    console.log("Nothing to transcode. Scene videos are already *-h264.mp4 or absent.");
    return;
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Transcoding ${videos.length} video(s) to 720p-ish H.264…`);

  const work = await mkdtemp(path.join(tmpdir(), "canvas-h264-"));
  const nextMedia = [...(scene.media ?? [])];

  try {
    for (const item of videos) {
      const objectPath = objectPathFromUrl(item.src);
      if (!objectPath) {
        console.warn(`Skip ${item.id}: src is not a public ${BUCKET} URL`);
        continue;
      }

      const destPath = h264Path(objectPath);
      const inputPath = path.join(work, path.basename(objectPath));
      const outputPath = path.join(work, path.basename(destPath));

      const download = await fetch(item.src);
      if (!download.ok) {
        throw new Error(`Download failed for ${objectPath} (${download.status})`);
      }
      await writeFile(inputPath, Buffer.from(await download.arrayBuffer()));

      if (dryRun) {
        console.log(`would transcode ${objectPath} -> ${destPath}`);
        continue;
      }

      await transcode(inputPath, outputPath);
      const bytes = await readFile(outputPath);
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(destPath, bytes, {
          contentType: "video/mp4",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(destPath);
      const index = nextMedia.findIndex((entry) => entry.id === item.id);
      if (index !== -1) {
        const current = nextMedia[index];
        nextMedia[index] = {
          ...current,
          src: data.publicUrl,
          rungs: [
            ...(current.rungs ?? []).filter((rung) => rung.src !== data.publicUrl),
            { src: data.publicUrl, width: MAX_WIDTH },
          ],
        };
      }

      const before = (await readFile(inputPath)).byteLength;
      console.log(
        `${objectPath}  ${(before / 1_048_576).toFixed(2)} MB -> ${(bytes.byteLength / 1_048_576).toFixed(2)} MB`,
      );
    }

    if (dryRun) return;

    const { error: saveError } = await supabase.from("canvas_scenes").upsert({
      id: SCENE_ID,
      document: { ...scene, media: nextMedia },
      updated_at: new Date().toISOString(),
    });
    if (saveError) throw saveError;

    console.log("Scene updated. Hard-refresh the site (Cache Storage keys follow the new URLs).");
    console.log("Original .mov/.mp4 files are still in the bucket; delete them in Storage if you want.");
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
