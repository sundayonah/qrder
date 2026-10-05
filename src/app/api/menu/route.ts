import { NextResponse } from "next/server";
import { getMenu, storageMode } from "@/lib/store";

export async function GET() {
  const menu = await getMenu();
  return NextResponse.json({ menu, storage: storageMode() });
}
