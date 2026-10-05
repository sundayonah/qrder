import { NextResponse } from "next/server";
import { z } from "zod";
import { updateOrderStatus } from "@/lib/store";

const schema = z.object({
  status: z.enum(["new", "seen", "done"]),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = schema.parse(await req.json());
    const order = await updateOrderStatus(id, body.status);
    if (!order) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid" },
      { status: 400 },
    );
  }
}
