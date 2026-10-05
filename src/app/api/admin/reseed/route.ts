import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth-server";
import { reseedMenu, storageMode } from "@/lib/store";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const menu = await reseedMenu();
  return NextResponse.json({
    ok: true,
    count: menu.length,
    storage: storageMode(),
    menu,
  });
}
