import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, listOrders } from "@/lib/store";

const createSchema = z.object({
  tableId: z.string().min(1),
  items: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        qty: z.number().int().positive(),
        price: z.number().nonnegative(),
        notes: z.string().optional(),
      }),
    )
    .min(1),
  notes: z.string().optional(),
  source: z.enum(["menu", "ai"]).default("menu"),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? undefined;
  const orders = await listOrders(since);
  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());
    const order = await createOrder(body);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid order" },
      { status: 400 },
    );
  }
}
