"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { formatNaira } from "@/lib/menu";
import type { MenuItem, OrderLine } from "@/lib/types";

type Props = {
  tableId: string;
};

export function GuestTable({ tableId }: Props) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [aiText, setAiText] = useState("");
  const [aiLines, setAiLines] = useState<OrderLine[]>([]);
  const [aiEngine, setAiEngine] = useState<string | null>(null);
  const [helpNote, setHelpNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const speakAudioRef = useRef<HTMLAudioElement | null>(null);
  const confirmModeRef = useRef(false);
  const confirmTimerRef = useRef<number | null>(null);
  const pendingItemsRef = useRef<OrderLine[]>([]);
  const awaitingConfirmRef = useRef(false);

  useEffect(() => {
    void fetch("/api/menu")
      .then((r) => r.json())
      .then((data: { menu: MenuItem[] }) => setMenu(data.menu));
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      speakAudioRef.current?.pause();
      if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
    };
  }, []);

  const categoryNames = useMemo(() => {
    return ["All", ...new Set(menu.map((m) => m.category))];
  }, [menu]);

  const categories = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menu) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    const entries = [...map.entries()];
    if (activeCategory === "All") return entries;
    return entries.filter(([cat]) => cat === activeCategory);
  }, [menu, activeCategory]);

  const cartLines: OrderLine[] = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = menu.find((m) => m.id === id)!;
        return {
          id: item.id,
          name: item.name,
          qty,
          price: item.price,
        };
      });
  }, [cart, menu]);

  const checkoutLines = useMemo(() => {
    // Prefer merged cart; if only AI suggestion exists, use that
    if (cartLines.length) return cartLines;
    return aiLines;
  }, [cartLines, aiLines]);

  const cartCount = checkoutLines.reduce((n, l) => n + l.qty, 0);
  const total = checkoutLines.reduce((sum, line) => sum + line.price * line.qty, 0);

  useEffect(() => {
    if (!cartOpen || cartLines.length > 0 || aiLines.length === 0) return;
    setCart((prev) => {
      const next = { ...prev };
      for (const line of aiLines) {
        next[line.id] = (next[line.id] ?? 0) + line.qty;
      }
      return next;
    });
    setAiLines([]);
  }, [cartOpen, cartLines.length, aiLines]);

  function orderSummary(lines: OrderLine[]) {
    return lines
      .map((line) => `${line.qty} ${line.name}`)
      .join(", ");
  }

  function speakWithBrowser(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }

  async function speakText(text: string) {
    const withTimeout = (p: Promise<void>, ms: number) =>
      Promise.race([
        p,
        new Promise<void>((resolve) => window.setTimeout(resolve, ms)),
      ]);

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok && res.headers.get("content-type")?.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        speakAudioRef.current?.pause();
        const audio = new Audio(url);
        speakAudioRef.current = audio;
        await withTimeout(
          new Promise<void>((resolve) => {
            audio.onended = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onerror = () => resolve();
            void audio.play().catch(() => resolve());
          }),
          12000,
        );
        return;
      }
    } catch {
      // fall through to browser voice
    }
    await withTimeout(speakWithBrowser(text), 8000);
  }

  async function speakConfirmation(lines: OrderLine[]) {
    pendingItemsRef.current = lines;
    awaitingConfirmRef.current = true;
    const text = `I heard ${orderSummary(lines)}. Should I take this order? Please say yes or no.`;
    setStatus("Please say yes or no after I finish speaking.");
    await speakText(text);
    await listenForConfirm();
  }

  function bump(id: string, delta: number) {
    setCart((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  }

  async function parseAi(spoken?: string): Promise<OrderLine[]> {
    const text = (spoken ?? aiText).trim();
    if (!text) return [];
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/parse-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Parse failed");
      const lines = (data.lines ?? []) as OrderLine[];
      setAiLines(lines);
      setAiEngine(data.engine);
      if (!lines.length) {
        setStatus("Couldn’t match that to the menu — try naming a dish.");
        setAwaitingConfirm(false);
        awaitingConfirmRef.current = false;
      } else {
        setAwaitingConfirm(true);
        awaitingConfirmRef.current = true;
        pendingItemsRef.current = lines;
        await speakConfirmation(lines);
      }
      return lines;
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Parse failed");
      return [];
    } finally {
      setBusy(false);
    }
  }

  async function addAiToCart() {
    let lines = aiLines;
    if (!lines.length && aiText.trim()) {
      lines = await parseAi();
    }
    if (!lines.length) return;
    setAwaitingConfirm(true);
    await speakConfirmation(lines);
  }

  function isYes(spoken: string) {
    return /\b(yes|yeah|yep|yup|yas|ok|okay|sure|correct|right|send|take)\b/i.test(
      spoken,
    );
  }

  function isNo(spoken: string) {
    return /\b(nope|nah|change|wrong|wait|repeat|don'?t)\b/i.test(spoken) ||
      /\bno\b/i.test(spoken);
  }

  async function handleYesNo(spoken: string) {
    setStatus(`Heard: “${spoken}”`);
    const items = pendingItemsRef.current.length
      ? pendingItemsRef.current
      : aiLines;
    if (isYes(spoken)) {
      await takeOrder(items);
      return;
    }
    if (isNo(spoken)) {
      await rejectOrder();
      return;
    }
    await speakText("Please say yes or no.");
    await listenForConfirm();
  }

  async function takeOrder(items = aiLines) {
    if (!items.length) {
      setStatus("Nothing to send. Please order again.");
      await speakText("I don't have an order to send. Please order again.");
      return;
    }
    speakAudioRef.current?.pause();
    setBusy(true);
    setStatus("Sending to the kitchen…");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          tableId,
          items,
          notes: aiText || undefined,
          source: "ai",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order failed");
      pendingItemsRef.current = [];
      awaitingConfirmRef.current = false;
      setAiLines([]);
      setAwaitingConfirm(false);
      setAiText("");
      setStatus(`Order sent · Table ${tableId}`);
      await speakText("Okay. I have sent this order to the kitchen.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Order failed";
      setStatus(message);
      await speakText("Sorry. I could not send that order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function rejectOrder() {
    speakAudioRef.current?.pause();
    setAiLines([]);
    setAwaitingConfirm(false);
    awaitingConfirmRef.current = false;
    pendingItemsRef.current = [];
    setAiText("");
    setStatus("Please order again.");
    await speakText("Okay. Please order again.");
    await startVoice(false);
  }

  async function speakShort(text: string) {
    await speakText(text);
  }

  function pickAudioMime() {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg",
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  }

  function stopMic() {
    if (confirmTimerRef.current) {
      window.clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setListening(false);
  }

  async function listenForConfirm() {
    confirmModeRef.current = true;
    await startVoice(true);
  }

  async function startVoice(confirm = false) {
    if (listening) return;
    if (!confirm && busy) return;
    if (typeof MediaRecorder === "undefined") {
      setStatus("This browser can’t record audio. Type your order instead.");
      return;
    }
    if (!confirm) setStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickAudioMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void finishVoice(recorder.mimeType || mimeType || "audio/webm");
      };
      mediaRecorderRef.current = recorder;
      confirmModeRef.current = confirm;
      recorder.start();
      setListening(true);
      if (confirm) {
        setStatus("Say yes or no…");
        if (confirmTimerRef.current) window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = window.setTimeout(() => {
          mediaRecorderRef.current?.stop();
        }, 4500);
      }
    } catch {
      setStatus("Microphone permission is needed to speak your order.");
      stopMic();
    }
  }

  async function finishVoice(mimeType: string) {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];
    stopMic();
    if (blob.size < 800) {
      if (confirmModeRef.current) {
        confirmModeRef.current = false;
        setStatus("I didn’t catch that. Please say yes or no.");
        await speakText("Please say yes or no.");
        await listenForConfirm();
        return;
      }
      setStatus("That was too short — hold the mic and speak your order.");
      return;
    }

    setBusy(true);
    setStatus(
      confirmModeRef.current ? "Hearing your answer…" : "Hearing your order…",
    );
    try {
      const ext = mimeType.includes("mp4")
        ? "m4a"
        : mimeType.includes("ogg")
          ? "ogg"
          : "webm";
      const form = new FormData();
      form.append("audio", blob, `order.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not hear that");
      const spoken = String(data.text ?? "").trim();
      if (!spoken) throw new Error("No speech detected. Try again.");

      if (confirmModeRef.current || awaitingConfirmRef.current) {
        confirmModeRef.current = false;
        await handleYesNo(spoken);
        return;
      }

      setAiText(spoken);
      setStatus(`Heard: “${spoken}”`);
      await parseAi(spoken);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Voice order failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleVoice() {
    if (listening) {
      mediaRecorderRef.current?.stop();
      return;
    }
    void startVoice();
  }

  async function placeOrder() {
    if (!checkoutLines.length) return;
    setBusy(true);
    setStatus(null);
    try {
      const source = cartLines.length ? "menu" : "ai";
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId,
          items: checkoutLines,
          notes: aiText || undefined,
          source,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Order failed");
      setStatus(`Order sent · Table ${tableId}`);
      setCart({});
      setAiLines([]);
      setAiText("");
      setCartOpen(false);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  async function callHelp() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId, reason: helpNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Help failed");
      setStatus(`Staff notified · Table ${tableId}`);
      setHelpNote("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Help failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 pb-28">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase">
            Qrder
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-black">
            Table {tableId}
          </h1>
          <p className="text-sm text-neutral-600">
            Browse the menu or tell AI what you want.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="relative cursor-pointer rounded-xl border border-black bg-black px-4 py-3 text-sm font-semibold text-white"
        >
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-black">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <aside className="order-1 space-y-3 rounded-2xl border border-neutral-200 p-4 lg:order-2 lg:sticky lg:top-4">
          <h2 className="text-lg font-semibold text-black">Need help?</h2>
          <p className="text-sm text-neutral-600">Buzzes waiter</p>
          <input
            value={helpNote}
            onChange={(e) => setHelpNote(e.target.value)}
            placeholder="Optional: water, bill, spoons…"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm text-black outline-none focus:border-black"
          />
          <Button
            type="button"
            className="w-full"
            onClick={() => void callHelp()}
            disabled={busy}
          >
            Buzz
          </Button>
        </aside>

        <div className="order-2 flex flex-col gap-8 lg:order-1">
      <section className="space-y-3 rounded-2xl border border-neutral-200 p-4">
        <h2 className="text-lg font-semibold text-black">Talk to AI</h2>
        <p className="text-sm text-neutral-600">
          Tap the mic, say your order, tap again to stop — or type and add to
          AI reads it back and asks if it should take the order. Say{" "}
          <strong>yes</strong> or <strong>no</strong>.
        </p>
        <textarea
          value={aiText}
          onChange={(e) => {
            setAiText(e.target.value);
            setAiLines([]);
            setAiEngine(null);
            setAwaitingConfirm(false);
          }}
          rows={3}
          placeholder='e.g. "jollof for 2, extra plantain, and zobo"'
          className="w-full cursor-text resize-none rounded-xl border border-neutral-300 bg-white px-3 py-3 text-sm text-black outline-none focus:border-black"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={listening ? "secondary" : "primary"}
            onClick={toggleVoice}
            disabled={busy && !listening}
            aria-label={listening ? "Stop recording" : "Speak your order"}
            title={listening ? "Stop recording" : "Speak your order"}
            className={`!px-3 ${listening ? "animate-pulse" : ""}`}
          >
            {listening ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" />
                <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-3.08A7 7 0 0 0 19 11Z" />
              </svg>
            )}
          </Button>
          <Button
            type="button"
            onClick={() => void addAiToCart()}
            disabled={busy || awaitingConfirm || (!aiLines.length && !aiText.trim())}
          >
            Add to cart
          </Button>
        </div>
        {aiEngine && (
          <p className="text-xs text-neutral-500">Parsed via {aiEngine}</p>
        )}
        {aiLines.length > 0 && (
          <ul className="space-y-1 text-sm text-black">
            {aiLines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span>
                  {line.qty}× {line.name}
                </span>
                <span>{formatNaira(line.price * line.qty)}</span>
              </li>
            ))}
          </ul>
        )}
        {awaitingConfirm && (
          <p className="text-sm font-medium text-black">
            Listening… say <strong>yes</strong> to take this order, or{" "}
            <strong>no</strong> to change it.
          </p>
        )}
      </section>

      <div className="sticky top-0 z-10 -mx-4 bg-white/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categoryNames.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeCategory === cat
                  ? "bg-black text-white"
                  : "border border-neutral-300 bg-white text-black hover:bg-neutral-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-8">
        {categories.map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-lg font-semibold text-black">{category}</h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200"
                >
                  <div className="relative aspect-4/3 bg-neutral-100">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex-1">
                      <p className="font-medium text-black">{item.name}</p>
                      <p className="text-sm text-neutral-600">
                        {item.description}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-black">
                        {formatNaira(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-3 !py-2"
                        onClick={() => bump(item.id, -1)}
                        disabled={!cart[item.id]}
                      >
                        −
                      </Button>
                      <span className="w-5 text-center text-sm font-semibold">
                        {cart[item.id] ?? 0}
                      </span>
                      <Button
                        type="button"
                        className="!px-3 !py-2"
                        onClick={() => bump(item.id, 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {status && (
        <p className="rounded-xl bg-neutral-100 px-3 py-3 text-sm font-medium text-black">
          {status}
        </p>
      )}
        </div>
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black bg-white p-4">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setCartOpen(true)}
            >
              View cart · {cartCount}
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => void placeOrder()}
              disabled={busy}
            >
              Send · {formatNaira(total)}
            </Button>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your cart</h2>
              <button
                type="button"
                aria-label="Close cart"
                className="cursor-pointer rounded-lg p-1 text-black hover:bg-neutral-100"
                onClick={() => setCartOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-sm text-neutral-600">Table {tableId}</p>
            {checkoutLines.length === 0 ? (
              <p className="text-sm text-neutral-500">Cart is empty.</p>
            ) : (
              <ul className="space-y-3">
                {checkoutLines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3"
                  >
                    <div>
                      <p className="font-medium">{line.name}</p>
                      <p className="text-sm text-neutral-600">
                        {formatNaira(line.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-3 !py-2"
                        onClick={() => bump(line.id, -1)}
                      >
                        −
                      </Button>
                      <span className="w-5 text-center text-sm font-semibold">
                        {line.qty}
                      </span>
                      <Button
                        type="button"
                        className="!px-3 !py-2"
                        onClick={() => bump(line.id, 1)}
                      >
                        +
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{formatNaira(total)}</span>
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={busy || checkoutLines.length === 0}
                onClick={() => void placeOrder()}
              >
                Send order · Table {tableId}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
