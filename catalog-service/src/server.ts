import express from "express";

const app = express();
const port = 3001;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    service: "catalog",
    status: "ok"
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Catalog service listening on port ${port}`);
});