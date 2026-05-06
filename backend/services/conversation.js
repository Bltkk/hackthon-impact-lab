const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const MAX_TURNS = 6;
const TTL_HOURS = 1;

async function getHistory(phoneNumber) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("turns, updated_at")
      .eq("phone_number", phoneNumber)
      .single();

    if (error || !data) return [];

    // Expire after TTL_HOURS of inactivity
    const updatedAt = new Date(data.updated_at);
    const hoursAgo = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
    if (hoursAgo > TTL_HOURS) {
      await clearHistory(phoneNumber);
      return [];
    }

    return data.turns || [];
  } catch (err) {
    console.error("getHistory error:", err.message);
    return [];
  }
}

async function pushHistory(phoneNumber, userText, assistantSummary) {
  try {
    const turns = await getHistory(phoneNumber);
    turns.push({ user: userText, assistant: assistantSummary });
    if (turns.length > MAX_TURNS) turns.shift();

    await supabase
      .from("conversations")
      .upsert({ phone_number: phoneNumber, turns, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error("pushHistory error:", err.message);
  }
}

async function clearHistory(phoneNumber) {
  try {
    await supabase.from("conversations").delete().eq("phone_number", phoneNumber);
  } catch (err) {
    console.error("clearHistory error:", err.message);
  }
}

module.exports = { getHistory, pushHistory };
