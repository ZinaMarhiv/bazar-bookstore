import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Book {
  id: number;
  title: string;
  topic: string;
  quantity: number;
  price: number;
}

export interface CatalogUpdate {
  price?: number;
  quantityChange?: number;
}

const catalogPath = path.resolve(__dirname, "../data/catalog.json");

export async function readCatalog(): Promise<Book[]> {
  const content = await readFile(catalogPath, "utf8");
  return JSON.parse(content) as Book[];
}

export class CatalogError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

// All inventory changes run sequentially within this service process.
let updateQueue: Promise<void> = Promise.resolve();

export function updateBook(
  id: number,
  changes: CatalogUpdate
): Promise<Book> {
  const operation = updateQueue.then(async () => {
    const books = await readCatalog();
    const book = books.find((item) => item.id === id);

    if (!book) {
      throw new CatalogError(404, "Book not found");
    }

    const quantity = book.quantity + (changes.quantityChange ?? 0);

    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new CatalogError(409, "Insufficient stock or invalid resulting quantity");
    }

    book.quantity = quantity;

    if (changes.price !== undefined) {
      book.price = changes.price;
    }

    // Write a complete file before replacing the existing catalog.
    const temporaryPath = `${catalogPath}.tmp`;
    await writeFile(
      temporaryPath,
      JSON.stringify(books, null, 2),
      "utf8"
    );
    await rename(temporaryPath, catalogPath);

    return book;
  });

  // A failed update must not block later requests.
  updateQueue = operation.then(
    () => undefined,
    () => undefined
  );

  return operation;
}