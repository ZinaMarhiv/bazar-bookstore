
import express, { Request, Response } from "express";
import {
  CatalogRequestError,
  getBook,
  decrementStock,
  restoreStock,
} from "./catalogClient.js";
import { saveOrder } from "./orderStore.js";

const app = express();
const PORT = Number(process.env.PORT) || 3002;

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    service: "order-service",
    status: "ok",
  });
});

app.post("/purchase/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({
      error: "Book ID must be a positive integer",
    });
    return;
  }

  try {
    const book = await getBook(id);

    if (book.quantity <= 0) {
      res.status(409).json({
        error: "Book is out of stock",
      });
      return;
    }

    // The catalog performs the stock update.
    // Its update queue prevents overselling.
    await decrementStock(id);

    let order;

    try {
      order = await saveOrder(book.id, book.title, book.price);
    } catch (saveError) {
      console.error("Failed to save order:", saveError);

      // Compensating action: restore inventory.
      try {
        await restoreStock(id);
        console.log(`Restored stock for book ${id}`);
      } catch (restoreError) {
        console.error(
          `CRITICAL: Could not restore stock for book ${id}`,
          restoreError
        );
      }

      res.status(500).json({
        error: "Unable to save order",
      });
      return;
    }

    console.log(`bought book ${book.title}`);

    res.status(201).json({
      message: `bought book ${book.title}`,
      order,
    });
  } catch (error) {
    if (error instanceof CatalogRequestError) {
      res.status(error.status).json({
        error: error.message,
      });
      return;
    }

    console.error("Purchase failed:", error);

    res.status(500).json({
      error: "Unable to complete purchase",
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Order Service running on port ${PORT}`);
});
