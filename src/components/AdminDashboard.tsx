"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { formatNaira } from "@/lib/menu";
import { TableQrGrid } from "@/components/SetupQr";
import type { HelpRequest, MenuItem, Order } from "@/lib/types";

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
    // ignore
  }
}

function buzz() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([120, 60, 120, 60, 200]);
  }
  playBeep();
}

type Tab = "orders" | "menu" | "qr";

export function AdminDashboard({ appUrl }: { appUrl: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [help, setHelp] = useState<HelpRequest[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [storage, setStorage] = useState("memory");
  const [armed, setArmed] = useState(false);
  const [lastSeen, setLastSeen] = useState(new Date().toISOString());
  const [activeCategory, setActiveCategory] = useState("All");
  const known = useRef(new Set<string>());

  const refreshOrders = useCallback(
    async (since?: string) => {
      const qs = since ? `?since=${encodeURIComponent(since)}` : "";
      try {
        const res = await fetch(`/api/events${qs}`, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!res.ok) return;
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
      } catch {
        // ngrok / HMR can drop a poll; try again next interval
      }
    },
    [armed],
  );

  useEffect(() => {
    void refreshOrders();
    void fetch("/api/menu")
      .then((r) => r.json())
      .then((d: { menu: MenuItem[] }) => setMenu(d.menu));
    void fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { email?: string }) => {
        if (d.email) setEmail(d.email);
      });
  }, [refreshOrders]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshOrders(lastSeen);
    }, 2500);
    return () => window.clearInterval(id);
  }, [lastSeen, refreshOrders]);

  const categories = useMemo(() => {
    return ["All", ...new Set(menu.map((m) => m.category))];
  }, [menu]);

  const visibleMenu = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menu) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    const entries = [...map.entries()];
    if (activeCategory === "All") return entries;
    return entries.filter(([c]) => c === activeCategory);
  }, [menu, activeCategory]);

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
            Qrder Admin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-neutral-600">
            {email || "Signed in"} · {storage}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={armed ? "secondary" : "primary"}
            onClick={() => {
              setArmed(true);
              buzz();
            }}
          >
            {armed ? "Alerts on" : "Enable buzz"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {(
          [
            ["orders", "Live orders"],
            ["menu", "Menu"],
            ["qr", "Table QRs"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
              tab === id
                ? "bg-black text-white"
                : "border border-neutral-300 bg-white text-black"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <>
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
                      ? "border-black"
                      : "border-neutral-200 bg-neutral-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-2xl font-semibold">
                        Table {h.tableId}
                      </p>
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
            <h2 className="text-lg font-semibold">Customer orders</h2>
            {orders.length === 0 && (
              <p className="rounded-2xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">
                Waiting for orders. When a guest sends from the homepage, you’ll
                see <strong>table number</strong> and <strong>items</strong>{" "}
                here.
              </p>
            )}
            <ul className="space-y-3">
              {orders.map((o) => {
                const total = o.items.reduce(
                  (s, i) => s + i.price * i.qty,
                  0,
                );
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
                      <p className="text-2xl font-semibold">
                        Table {o.tableId}
                      </p>
                      <span className="text-xs font-semibold tracking-wide uppercase text-neutral-500">
                        {o.source} · {o.status}
                      </span>
                    </div>
                    <ul className="space-y-1 text-sm">
                      {o.items.map((item) => (
                        <li
                          key={`${o._id}-${item.id}`}
                          className="flex justify-between gap-3"
                        >
                          <span>
                            {item.qty}× {item.name}
                          </span>
                          <span>{formatNaira(item.price * item.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    {o.notes && (
                      <p className="mt-2 text-sm text-neutral-600">
                        Note: {o.notes}
                      </p>
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
        </>
      )}

      {tab === "menu" && (
        <section className="space-y-4">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                  activeCategory === cat
                    ? "bg-black text-white"
                    : "border border-neutral-300 bg-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {visibleMenu.map(([category, items]) => (
            <div key={category} className="space-y-3">
              <h2 className="text-lg font-semibold">
                {category}{" "}
                <span className="text-sm font-normal text-neutral-500">
                  ({items.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-neutral-200"
                  >
                    <div className="relative aspect-[4/3] bg-neutral-100">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="50vw"
                      />
                    </div>
                    <div className="space-y-1 p-3">
                      <div className="flex justify-between gap-2">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm font-semibold">
                          {formatNaira(item.price)}
                        </p>
                      </div>
                      <p className="text-sm text-neutral-600">
                        {item.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "qr" && <TableQrGrid appUrl={appUrl} compact />}
    </div>
  );
}
