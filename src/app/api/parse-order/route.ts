import { NextResponse } from "next/server";
import { z } from "zod";
import { parseGuestOrder } from "@/lib/ai";
import { getMenu } from "@/lib/store";

const schema = z.object({
  text: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  try {
    const { text } = schema.parse(await req.json());
    const menu = await getMenu();
    const result = await parseGuestOrder(text, menu);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid" },
      { status: 400 },
    );
  }
}
