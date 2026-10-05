import { NextResponse } from "next/server";
import { listHelp, listOrders, storageMode } from "@/lib/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since") ?? undefined;
  const [orders, help] = await Promise.all([
    listOrders(since),
    listHelp(since),
  ]);
  return NextResponse.json({
    orders,
    help,
    storage: storageMode(),
    serverTime: new Date().toISOString(),
  });
}
