require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { apiLimiter, webhookLimiter } = require("./middleware/rateLimit");
const analyzeRouter = require("./routes/analyze");
const webhookRouter = require("./routes/webhook");

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" })); // allow image payloads

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/analyze", apiLimiter, analyzeRouter);
app.use("/api/webhook", webhookLimiter, webhookRouter);

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
