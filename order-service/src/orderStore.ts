
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Order {
  orderId: number;
  bookId: number;
  title: string;
  price: number;
  timestamp: string;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// Serialize order writes so concurrent requests do not
// overwrite each other's records.
let orderQueue: Promise<void> = Promise.resolve();

async function readOrders(): Promise<Order[]> {
  try {
    const content = await readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(content) as Order[];
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }

    throw error;
  }
}

export function saveOrder(
  bookId: number,
  title: string,
  price: number
): Promise<Order> {
  const operation = orderQueue.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });

    const orders = await readOrders();

    const order: Order = {
      orderId:
        orders.reduce(
          (max, current) => Math.max(max, current.orderId),
          0
        ) + 1,
      bookId,
      title,
      price,
      timestamp: new Date().toISOString()
    };

    orders.push(order);

    await writeFile(
      ORDERS_FILE,
      JSON.stringify(orders, null, 2),
      "utf-8"
    );

    return order;
  });

  // Keep the queue usable even if a write fails.
  orderQueue = operation.then(
    () => undefined,
    () => undefined
  );

  return operation;
}

