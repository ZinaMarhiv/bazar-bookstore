import express from "express";
import { BackendError, callBackend } from "./backendClient.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

const catalogUrl =
  process.env.CATALOG_URL || "http://localhost:3001";

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    service: "frontend",
    status: "ok"
  });
});

app.get("/search/:topic", async (req, res) => {
  try {
    const topic = encodeURIComponent(req.params.topic);
    const result = await callBackend(
      catalogUrl,
      `/search/${topic}`
    );

    console.log("Search response:", result.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    if (error instanceof BackendError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Search failed:", error);
    res.status(500).json({ error: "Unable to complete search" });
  }
});

app.get("/info/:id", async (req, res) => {
  try {
    const id = encodeURIComponent(req.params.id);
    const result = await callBackend(catalogUrl, `/info/${id}`);

    console.log("Information response:", result.body);
    res.status(result.status).json(result.body);
  } catch (error) {
    if (error instanceof BackendError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error("Information request failed:", error);
    res.status(500).json({
      error: "Unable to retrieve book information"
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Frontend service listening on port ${port}`);
});