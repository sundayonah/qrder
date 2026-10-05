export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  image: string;
};

export type OrderLine = {
  id: string;
  name: string;
  qty: number;
  price: number;
  notes?: string;
};

export type Order = {
  _id: string;
  tableId: string;
  items: OrderLine[];
  notes?: string;
  status: "new" | "seen" | "done";
  createdAt: string;
  source: "menu" | "ai";
};

export type HelpRequest = {
  _id: string;
  tableId: string;
  reason: string;
  status: "new" | "seen";
  createdAt: string;
};

export type KitchenEvent =
  | { type: "order"; data: Order }
  | { type: "help"; data: HelpRequest };
