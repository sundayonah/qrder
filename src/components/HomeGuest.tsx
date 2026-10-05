"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button } from "@/components/Button";
import { GuestTable } from "@/components/GuestTable";

function HomeInner() {
  const search = useSearchParams();
  const router = useRouter();
  const tableFromUrl = search.get("table")?.trim() || "";
  const [draft, setDraft] = useState(tableFromUrl);
  const [tableId, setTableId] = useState(tableFromUrl);

  function confirmTable(e?: FormEvent) {
    e?.preventDefault();
    const next = draft.trim();
    if (!next) return;
    setTableId(next);
    router.replace(`/?table=${encodeURIComponent(next)}`);
  }

  if (!tableId) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
            Qrder
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome — what’s your table?
          </h1>
          <p className="text-sm text-neutral-600">
            Scan the QR on your table, or enter the table number to see the menu,
            talk to AI, and send your order.
          </p>
        </div>
        <form onSubmit={confirmTable} className="space-y-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            inputMode="numeric"
            placeholder="e.g. 3"
            className="w-full cursor-text rounded-xl border border-neutral-300 bg-white px-3 py-3 text-base text-black outline-none focus:border-black"
          />
          <Button type="submit" className="w-full" disabled={!draft.trim()}>
            View menu
          </Button>
        </form>
      </div>
    );
  }

  return <GuestTable tableId={tableId} />;
}

export function HomeGuest() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-16 text-sm text-neutral-500">Loading menu…</p>
      }
    >
      <HomeInner />
    </Suspense>
  );
}
