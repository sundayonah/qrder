"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { formatNaira } from "@/lib/menu";
import type { HelpRequest, Order } from "@/lib/types";

function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // ignore audio failures
  }
}

function buzz() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([120, 60, 120, 60, 200]);
  }
  playBeep();
}

export function KitchenBoard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [help, setHelp] = useState<HelpRequest[]>([]);
  const [storage, setStorage] = useState("memory");
  const [armed, setArmed] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>(new Date().toISOString());
  const known = useRef<Set<string>>(new Set());

  const refresh = useCallback(async (since?: string) => {
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    const res = await fetch(`/api/events${qs}`);
    const data = (await res.json()) as {
      orders: Order[];
      help: HelpRequest[];
      storage: string;
      serverTime: string;
    };

    if (!since) {
      setOrders(data.orders);
      setHelp(data.help);
      for (const o of data.orders) known.current.add(`o:${o._id}`);
      for (const h of data.help) known.current.add(`h:${h._id}`);
    } else {
      const freshOrders = data.orders.filter(
        (o) => !known.current.has(`o:${o._id}`),
      );
      const freshHelp = data.help.filter(
        (h) => !known.current.has(`h:${h._id}`),
      );

      if (freshOrders.length || freshHelp.length) {
        if (armed) buzz();
        for (const o of freshOrders) known.current.add(`o:${o._id}`);
        for (const h of freshHelp) known.current.add(`h:${h._id}`);
        setOrders((prev) => [...freshOrders, ...prev]);
        setHelp((prev) => [...freshHelp, ...prev]);
      }
    }

    setStorage(data.storage);
    setLastSeen(data.serverTime);
  }, [armed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!armed) return;
    const id = window.setInterval(() => {
      void refresh(lastSeen);
    }, 2500);
    return () => window.clearInterval(id);
  }, [armed, lastSeen, refresh]);

  async function markOrder(id: string, status: Order["status"]) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setOrders((prev) =>
      prev.map((o) => (o._id === id ? { ...o, status } : o)),
    );
  }

  async function markHelp(id: string) {
    await fetch("/api/help", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "seen" }),
    });
    setHelp((prev) =>
      prev.map((h) => (h._id === id ? { ...h, status: "seen" } : h)),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
            Qrder
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-black">
            Kitchen
          </h1>
          <p className="text-sm text-neutral-600">
            Storage: {storage} · Keep this tab open on your phone
          </p>
        </div>
        <Button
          type="button"
          variant={armed ? "secondary" : "primary"}
          onClick={() => {
            setArmed(true);
            buzz();
          }}
        >
          {armed ? "Alerts on" : "Enable buzz + sound"}
        </Button>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Staff calls</h2>
        {help.length === 0 && (
          <p className="text-sm text-neutral-500">No help requests yet.</p>
        )}
        <ul className="space-y-3">
          {help.map((h) => (
            <li
              key={h._id}
              className={`rounded-2xl border p-4 ${
                h.status === "new"
                  ? "border-black bg-white"
                  : "border-neutral-200 bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold">Table {h.tableId}</p>
                  <p className="text-sm text-neutral-700">{h.reason}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {new Date(h.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                {h.status === "new" && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void markHelp(h._id)}
                  >
                    Seen
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Orders</h2>
        {orders.length === 0 && (
          <div className="space-y-2 rounded-2xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
            <p className="font-medium text-black">No orders yet — kitchen is a live board.</p>
            <p>
              Food lives on the guest menu / admin. Open a table, place an order,
              and it appears here with the table number.
            </p>
            <p>
              <a className="underline" href="/t/1">
                Order from Table 1
              </a>
              {" · "}
              <a className="underline" href="/admin">
                View full menu in admin
              </a>
            </p>
          </div>
        )}
        <ul className="space-y-3">
          {orders.map((o) => {
            const total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
            return (
              <li
                key={o._id}
                className={`rounded-2xl border p-4 ${
                  o.status === "new"
                    ? "border-black"
                    : "border-neutral-200 bg-neutral-50"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-2xl font-semibold">Table {o.tableId}</p>
                  <span className="text-xs font-semibold tracking-wide uppercase text-neutral-500">
                    {o.source} · {o.status}
                  </span>
                </div>
                <ul className="space-y-1 text-sm">
                  {o.items.map((item) => (
                    <li key={`${o._id}-${item.id}`} className="flex justify-between">
                      <span>
                        {item.qty}× {item.name}
                      </span>
                      <span>{formatNaira(item.price * item.qty)}</span>
                    </li>
                  ))}
                </ul>
                {o.notes && (
                  <p className="mt-2 text-sm text-neutral-600">Note: {o.notes}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{formatNaira(total)}</p>
                  <div className="flex gap-2">
                    {o.status === "new" && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void markOrder(o._id, "seen")}
                      >
                        Ack
                      </Button>
                    )}
                    {o.status !== "done" && (
                      <Button
                        type="button"
                        onClick={() => void markOrder(o._id, "done")}
                      >
                        Done
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
