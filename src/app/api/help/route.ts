import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyHelpReason } from "@/lib/ai";
import { createHelp, listHelp, updateHelpStatus } from "@/lib/store";

const createSchema = z.object({
  tableId: z.string().min(1),
  reason: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["new", "seen"]),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? undefined;
  const help = await listHelp(since);
  return NextResponse.json({ help });
}

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());
    const help = await createHelp({
      tableId: body.tableId,
      reason: classifyHelpReason(body.reason ?? ""),
    });
    return NextResponse.json({ help }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = patchSchema.parse(await req.json());
    const help = await updateHelpStatus(body.id, body.status);
    if (!help) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ help });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid" },
      { status: 400 },
    );
  }
}
