import { NextResponse } from "next/server";
import { loadScene, saveScene } from "@/lib/canvas/load-scene";
import { normalizeScene, type Scene } from "@/lib/canvas/scene";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const scene = await loadScene();
  return NextResponse.json(scene);
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Scene;
  const scene = normalizeScene(body);

  try {
    await saveScene(scene);
    return NextResponse.json({ ok: true, scene });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save scene";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
