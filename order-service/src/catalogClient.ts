
const CATALOG_URL = process.env.CATALOG_URL || "http://localhost:3001";

export interface Book {
  id: number;
  title: string;
  topic: string;
  quantity: number;
  price: number;
}

export class CatalogRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "CatalogRequestError";
  }
}

async function catalogRequest(
  path: string,
  options?: RequestInit
): Promise<Book> {
  let response: Response;

  try {
    response = await fetch(`${CATALOG_URL}${path}`, {
      ...options,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new CatalogRequestError(
      503,
      "Catalog Service is unavailable"
    );
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    let message = "Catalog request failed";

    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      message = body.error;
    }

    throw new CatalogRequestError(response.status, message);
  }

  return (await response.json()) as Book;
}

export async function getBook(id: number): Promise<Book> {
  return catalogRequest(`/info/${id}`);
}

export async function decrementStock(id: number): Promise<Book> {
  return catalogRequest(`/update/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantityChange: -1 }),
  });
}

export async function restoreStock(id: number): Promise<Book> {
  return catalogRequest(`/update/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantityChange: 1 }),
  });
}
