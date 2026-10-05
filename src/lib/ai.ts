import { z } from "zod";
import type { MenuItem, OrderLine } from "./types";

const parsedSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      qty: z.coerce.number().int().positive().default(1),
      notes: z.string().optional(),
    }),
  ),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type ParsedOrder = z.infer<typeof parsedSchema>;

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const GENERIC = new Set([
  "rice",
  "soup",
  "chicken",
  "beef",
  "spicy",
  "popular",
  "side",
  "drink",
  "cold",
  "grill",
  "swallow",
  "snack",
  "sweet",
  "hot",
  "fish",
  "meat",
  "protein",
  "vegan",
  "vegetarian",
  "salad",
  "fried",
  "mains",
  "plate",
  "plates",
  "order",
  "want",
]);

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function applyNumberWords(s: string) {
  return s.replace(
    /\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g,
    (w) => String(NUMBER_WORDS[w] ?? w),
  );
}

function qtyBefore(hay: string, index: number) {
  const before = hay.slice(Math.max(0, index - 28), index);
  const match = before.match(
    /(\d+)\s*(?:x|plates?|portions?|packs?|bowls?)?\s*(?:of\s+)?$/i,
  );
  const n = match ? Number(match[1]) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

const EXTRA_ALIASES: Record<string, string[]> = {
  ogbono: ["ogbono soup", "obono soup", "obonos soup", "ogbonos"],
  jollof: ["jollof rice"],
  "jollof-chicken": ["jollof rice and chicken", "jollof and chicken"],
  "jollof-beef": ["jollof rice and beef", "jollof and beef"],
  afang: ["afang soup"],
};

function aliasesFor(item: MenuItem): string[] {
  const extras = (EXTRA_ALIASES[item.id] ?? []).map(normalize);
  return [
    ...new Set([
      normalize(item.name),
      normalize(item.id.replace(/-/g, " ")),
      ...extras,
    ]),
  ].filter((n) => n.length >= 4);
}

function heuristicParse(text: string, menu: MenuItem[]): ParsedOrder {
  const hay = applyNumberWords(normalize(text));
  const claimed: { start: number; end: number }[] = [];
  const found = new Map<string, number>();

  const ranked = menu
    .map((item) => {
      const names = aliasesFor(item).sort((a, b) => b.length - a.length);
      return { item, names, maxLen: names[0]?.length ?? 0 };
    })
    .sort((a, b) => b.maxLen - a.maxLen);

  function overlaps(start: number, end: number) {
    return claimed.some((c) => start < c.end && end > c.start);
  }

  for (const { item, names } of ranked) {
    for (const name of names) {
      let from = 0;
      while (from <= hay.length) {
        const idx = hay.indexOf(name, from);
        if (idx === -1) break;
        const end = idx + name.length;
        const boundaryBefore = idx === 0 || hay[idx - 1] === " ";
        const boundaryAfter = end === hay.length || hay[end] === " ";
        if (boundaryBefore && boundaryAfter && !overlaps(idx, end)) {
          claimed.push({ start: idx, end });
          found.set(item.id, (found.get(item.id) ?? 0) + qtyBefore(hay, idx));
          break;
        }
        from = idx + 1;
      }
      if (found.has(item.id)) break;
    }
  }

  if (found.size === 0 && /\bwater\b|\bthirsty\b/.test(hay)) {
    const water = menu.find((m) => m.id === "water");
    if (water) found.set(water.id, 1);
  }

  return {
    items: [...found.entries()].map(([id, qty]) => ({ id, qty })),
    notes: text,
    confidence: found.size ? 0.7 : 0.1,
  };
}

function toOrderLines(parsed: ParsedOrder, menu: MenuItem[]): OrderLine[] {
  const byId = new Map(menu.map((m) => [m.id, m]));
  const lines: OrderLine[] = [];
  for (const line of parsed.items) {
    const item = byId.get(line.id);
    if (!item) continue;
    lines.push({
      id: item.id,
      name: item.name,
      qty: line.qty,
      price: item.price,
      ...(line.notes ? { notes: line.notes } : {}),
    });
  }
  return lines;
}

function extractJson(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced?.[1] ?? trimmed;
  return JSON.parse(raw);
}

async function callOpenModel(
  text: string,
  menu: MenuItem[],
): Promise<ParsedOrder | null> {
  const apiKey = process.env.AI_API_KEY ?? process.env.GROQ_API_KEY;
  const baseUrl =
    process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1";
  const models = [
    process.env.AI_MODEL,
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
  ].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

  if (!apiKey) return null;

  try {
    const listed = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (listed.ok) {
      const body = (await listed.json()) as { data?: { id: string }[] };
      const ids = new Set((body.data ?? []).map((m) => m.id));
      const live = [...models.filter((id) => ids.has(id))];
      for (const id of ids) {
        if (
          !id.includes("whisper") &&
          !id.includes("guard") &&
          !id.includes("tts") &&
          !live.includes(id)
        ) {
          live.push(id);
        }
      }
      if (live.length) models.splice(0, models.length, ...live.slice(0, 4));
    }
  } catch {
    // keep fallback list
  }

  const menuBrief = menu.map((m) => ({
    id: m.id,
    name: m.name,
  }));

  for (const model of models) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You parse restaurant orders into JSON.
Return ONLY: {"items":[{"id":"<menu id>","qty":<number>}],"notes":"","confidence":0.0}
Rules:
- Include ONLY dishes the guest clearly asked for.
- Never add extra dishes just because they share a word like rice or soup.
- "jollof rice" maps to id "jollof", not "jollof-chicken" or "jollof-beef", unless they said chicken or beef.
- Use quantities from the guest (two/2 plates = qty 2).
- Only use ids from the menu list.`,
            },
            {
              role: "user",
              content: `Menu: ${JSON.stringify(menuBrief)}\n\nGuest said: ${text}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        console.error("AI parse failed", model, await res.text());
        continue;
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;
      return parsedSchema.parse(extractJson(content));
    } catch (error) {
      console.error("AI parse exception", model, error);
    }
  }

  return null;
}

export async function parseGuestOrder(
  text: string,
  menu: MenuItem[],
): Promise<{
  parsed: ParsedOrder;
  lines: OrderLine[];
  engine: "open-model" | "heuristic";
}> {
  const fromModel = await callOpenModel(text, menu);
  const parsed = fromModel ?? heuristicParse(text, menu);
  return {
    parsed,
    lines: toOrderLines(parsed, menu),
    engine: fromModel ? "open-model" : "heuristic",
  };
}

export function classifyHelpReason(text: string): string {
  const lower = text.toLowerCase().trim();
  if (!lower) return "Need assistance";
  if (/bill|check|pay/.test(lower)) return "Request bill";
  if (/water/.test(lower)) return "Need water";
  if (/spoon|fork|knife|napkin|tissue/.test(lower)) return "Need utensils";
  if (/clean|spill|table/.test(lower)) return "Table help";
  return text.slice(0, 80);
}
