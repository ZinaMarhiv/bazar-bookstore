import { readFile } from "node:fs/promises";
import path from "node:path";

export interface Book {
  id: number;
  title: string;
  topic: string;
  quantity: number;
  price: number;
}

// Works from both src and the compiled dist directory.
const catalogPath = path.resolve(__dirname, "../data/catalog.json");

export async function readCatalog(): Promise<Book[]> {
  const content = await readFile(catalogPath, "utf8");
  return JSON.parse(content) as Book[];
}
