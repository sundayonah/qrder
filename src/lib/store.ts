import { randomUUID } from "crypto";
import { DEFAULT_MENU } from "./menu";
import { MENU_IMAGE_VERSION } from "./menu-images";
import { getDb, hasMongo } from "./mongodb";
import type { HelpRequest, MenuItem, Order, OrderLine } from "./types";

type MenuMeta = { _id: string; version: number };

type MemoryStore = {
  menu: MenuItem[];
  orders: Order[];
  help: HelpRequest[];
};

declare global {
  // eslint-disable-next-line no-var
  var _qrderMemory: MemoryStore | undefined;
  // eslint-disable-next-line no-var
  var _qrderMenuVersion: number | undefined;
}

function memory(): MemoryStore {
  if (!global._qrderMemory) {
    global._qrderMemory = {
      menu: [...DEFAULT_MENU],
      orders: [],
      help: [],
    };
    global._qrderMenuVersion = MENU_IMAGE_VERSION;
  }
  if (
    global._qrderMenuVersion !== MENU_IMAGE_VERSION ||
    global._qrderMemory.menu.length < DEFAULT_MENU.length
  ) {
    global._qrderMemory.menu = [...DEFAULT_MENU];
    global._qrderMenuVersion = MENU_IMAGE_VERSION;
  }
  return global._qrderMemory;
}

export async function getMenu(): Promise<MenuItem[]> {
  const db = await getDb();
  if (!db) return memory().menu;

  const col = db.collection<MenuItem>("menu");
  const meta = db.collection<MenuMeta>("meta");
  const versionDoc = await meta.findOne({ _id: "menu" });
  const count = await col.countDocuments();
  const needsReseed =
    count === 0 ||
    count < DEFAULT_MENU.length ||
    !versionDoc ||
    versionDoc.version !== MENU_IMAGE_VERSION;

  if (needsReseed) {
    await col.deleteMany({});
    await col.insertMany(DEFAULT_MENU as never[]);
    await meta.updateOne(
      { _id: "menu" },
      { $set: { version: MENU_IMAGE_VERSION } },
      { upsert: true },
    );
  }
  return col.find({}).toArray();
}

export async function reseedMenu(): Promise<MenuItem[]> {
  const db = await getDb();
  if (!db) {
    memory().menu = [...DEFAULT_MENU];
    global._qrderMenuVersion = MENU_IMAGE_VERSION;
    return memory().menu;
  }

  const col = db.collection<MenuItem>("menu");
  const meta = db.collection<MenuMeta>("meta");
  await col.deleteMany({});
  await col.insertMany(DEFAULT_MENU as never[]);
  await meta.updateOne(
    { _id: "menu" },
    { $set: { version: MENU_IMAGE_VERSION } },
    { upsert: true },
  );
  return col.find({}).toArray();
}

export async function createOrder(input: {
  tableId: string;
  items: OrderLine[];
  notes?: string;
  source: "menu" | "ai";
}): Promise<Order> {
  const order: Order = {
    _id: randomUUID(),
    tableId: input.tableId,
    items: input.items,
    notes: input.notes,
    status: "new",
    createdAt: new Date().toISOString(),
    source: input.source,
  };

  const db = await getDb();
  if (!db) {
    memory().orders.unshift(order);
    return order;
  }

  await db.collection("orders").insertOne(order as never);
  return order;
}

export async function listOrders(since?: string): Promise<Order[]> {
  const db = await getDb();
  if (!db) {
    const all = memory().orders;
    if (!since) return all;
    return all.filter((o) => o.createdAt > since);
  }

  const query = since ? { createdAt: { $gt: since } } : {};
  return db
    .collection<Order>("orders")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
}

export async function updateOrderStatus(
  id: string,
  status: Order["status"],
): Promise<Order | null> {
  const db = await getDb();
  if (!db) {
    const order = memory().orders.find((o) => o._id === id);
    if (!order) return null;
    order.status = status;
    return order;
  }

  const result = await db
    .collection<Order>("orders")
    .findOneAndUpdate(
      { _id: id },
      { $set: { status } },
      { returnDocument: "after" },
    );
  return result ?? null;
}

export async function createHelp(input: {
  tableId: string;
  reason: string;
}): Promise<HelpRequest> {
  const help: HelpRequest = {
    _id: randomUUID(),
    tableId: input.tableId,
    reason: input.reason,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  const db = await getDb();
  if (!db) {
    memory().help.unshift(help);
    return help;
  }

  await db.collection("help").insertOne(help as never);
  return help;
}

export async function listHelp(since?: string): Promise<HelpRequest[]> {
  const db = await getDb();
  if (!db) {
    const all = memory().help;
    if (!since) return all;
    return all.filter((h) => h.createdAt > since);
  }

  const query = since ? { createdAt: { $gt: since } } : {};
  return db
    .collection<HelpRequest>("help")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
}

export async function updateHelpStatus(
  id: string,
  status: HelpRequest["status"],
): Promise<HelpRequest | null> {
  const db = await getDb();
  if (!db) {
    const help = memory().help.find((h) => h._id === id);
    if (!help) return null;
    help.status = status;
    return help;
  }

  const result = await db
    .collection<HelpRequest>("help")
    .findOneAndUpdate(
      { _id: id },
      { $set: { status } },
      { returnDocument: "after" },
    );
  return result ?? null;
}

export function storageMode() {
  return hasMongo() ? "mongodb" : "memory";
}
