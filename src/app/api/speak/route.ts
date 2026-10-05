import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  text: z.string().min(1).max(800),
});

type Voice = {
  voice_id: string;
  category?: string;
  name?: string;
};

async function pickVoiceId(apiKey: string): Promise<string | null> {
  const preferred = process.env.ELEVENLABS_VOICE_ID;
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) {
    return preferred || null;
  }
  const data = (await res.json()) as { voices?: Voice[] };
  const voices = data.voices ?? [];
  const premade = voices.find((v) => v.category === "premade");
  const owned = voices.find(
    (v) => v.category === "cloned" || v.category === "generated",
  );
  // Free API cannot use community library voices.
  if (preferred) {
    const match = voices.find((v) => v.voice_id === preferred);
    if (match && match.category !== "library") return preferred;
  }
  return premade?.voice_id ?? owned?.voice_id ?? null;
}

async function tts(
  apiKey: string,
  voiceId: string,
  text: string,
  modelId: string,
) {
  return fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
      }),
    },
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ElevenLabs is not configured", skipped: true },
      { status: 503 },
    );
  }

  try {
    const { text } = schema.parse(await req.json());
    const voiceId = await pickVoiceId(apiKey);
    if (!voiceId) {
      return NextResponse.json(
        { error: "No usable ElevenLabs voice on this account", skipped: true },
        { status: 503 },
      );
    }

    const models = [
      process.env.ELEVENLABS_MODEL_ID,
      "eleven_flash_v2_5",
      "eleven_turbo_v2_5",
      "eleven_multilingual_v2",
    ].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

    let lastError = "";
    for (const modelId of models) {
      const res = await tts(apiKey, voiceId, text, modelId);
      if (res.ok) {
        const audio = await res.arrayBuffer();
        return new NextResponse(audio, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      }
      lastError = await res.text();
      console.error("ElevenLabs TTS failed", modelId, lastError);
      if (!lastError.includes("paid_plan") && !lastError.includes("model")) {
        break;
      }
    }

    return NextResponse.json(
      { error: "Could not speak the confirmation.", skipped: true },
      { status: 503 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid" },
      { status: 400 },
    );
  }
}
