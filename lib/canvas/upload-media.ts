export async function uploadMediaFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/media", {
    method: "POST",
    body: form,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    src?: string;
    error?: string;
  };
  if (!response.ok || !payload.src) {
    throw new Error(payload.error ?? "Upload failed");
  }
  return payload.src;
}
