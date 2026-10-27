import express from "express";
import { readCatalog } from "./catalog.js";

const app = express();
const port = 3001;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    service: "catalog",
    status: "ok"
  });
});

app.get("/search/:topic", async (req, res) => {
  try {
    const topic = req.params.topic.trim().toLowerCase();
    const books = await readCatalog();

    const matches = books
      .filter((book) => book.topic.toLowerCase() === topic)
      .map((book) => ({
        id: book.id,
        title: book.title
      }));

    console.log("Search results:", matches);
    res.json(matches);
  } catch (error) {
    console.error("Failed to search catalog:", error);
    res.status(500).json({ error: "Unable to read catalog" });
  }
});

app.get("/info/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    res.status(400).json({ error: "Book ID must be a positive integer" });
    return;
  }

  try {
    const books = await readCatalog();
    const book = books.find((item) => item.id === id);

    if (!book) {
      res.status(404).json({ error: "Book not found" });
      return;
    }

    console.log("Book information:", book);
    res.json(book);
  } catch (error) {
    console.error("Failed to read book:", error);
    res.status(500).json({ error: "Unable to read catalog" });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Catalog service listening on port ${port}`);
});