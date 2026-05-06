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

// Diagnostic endpoint — verifies Supabase connectivity end-to-end
app.get("/debug/supabase", async (_req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const result = { hasUrl: !!url, hasKey: !!key, urlPrefix: url?.slice(0, 30) };
  if (!url || !key) return res.json({ ...result, error: "env vars missing" });

  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(url, key);
    const testKey = `test-${Date.now()}`;
    const { error: writeErr } = await supabase
      .from("conversations")
      .upsert({ phone_number: testKey, turns: [{ user: "test", assistant: "test" }] });
    result.write = writeErr ? `FAIL: ${writeErr.message}` : "OK";
    const { data, error: readErr } = await supabase
      .from("conversations")
      .select("turns")
      .eq("phone_number", testKey)
      .single();
    result.read = readErr ? `FAIL: ${readErr.message}` : `OK (${data?.turns?.length ?? 0} turns)`;
    await supabase.from("conversations").delete().eq("phone_number", testKey);
  } catch (e) {
    result.exception = e.message;
  }
  res.json(result);
});

app.use("/api/analyze", apiLimiter, analyzeRouter);
app.use("/api/webhook", webhookLimiter, webhookRouter);

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
