import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const apiKey = process.env.AI_API_KEY ?? process.env.GROQ_API_KEY;
  const baseUrl =
    process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
  const model = process.env.AI_STT_MODEL ?? "whisper-large-v3";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Voice needs an AI API key (Groq Whisper)." },
      { status: 503 },
    );
  }

  const incoming = await req.formData();
  const file = incoming.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No audio received" }, { status: 400 });
  }

  const form = new FormData();
  form.append("file", file, file.name || "order.webm");
  form.append("model", model);
  form.append("language", "en");
  form.append("response_format", "json");
  form.append(
    "prompt",
    "Restaurant order: jollof, fried rice, egusi, suya, plantain, zobo, swallow, amala, eba.",
  );

  const res = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("transcribe failed", detail);
    return NextResponse.json(
      { error: "Could not hear that. Try again or type the order." },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { text?: string };
  const text = data.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json(
      { error: "No speech detected. Try again." },
      { status: 400 },
    );
  }

  return NextResponse.json({ text });
}
