
import express, { Request, Response } from "express";

const app = express();
const PORT = Number(process.env.PORT) || 3002;

// Allow the server to receive JSON requests.
app.use(express.json());

// Health endpoint to verify that the Order Service is running.
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    service: "order-service",
    status: "ok"
  });
});

// Start the Order Service.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Order Service running on port ${PORT}`);
});
