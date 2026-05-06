const { createClient } = require("@supabase/supabase-js");

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const MAX_TURNS = 6;
const TTL_HOURS = 1;

async function getHistory(phoneNumber) {
  try {
    const supabase = getClient();
    if (!supabase) {
      console.warn("[conversation] Supabase client not configured");
      return [];
    }
    const { data, error } = await supabase
      .from("conversations")
      .select("turns, updated_at")
      .eq("phone_number", phoneNumber)
      .single();

    if (error) {
      if (error.code !== "PGRST116") console.error("[conversation] getHistory error:", error.message);
      return [];
    }
    if (!data) return [];

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
    const supabase = getClient();
    if (!supabase) return;
    const turns = await getHistory(phoneNumber);
    turns.push({ user: userText, assistant: assistantSummary });
    if (turns.length > MAX_TURNS) turns.shift();

    const { error } = await supabase
      .from("conversations")
      .upsert({ phone_number: phoneNumber, turns, updated_at: new Date().toISOString() });

    if (error) console.error("[conversation] pushHistory error:", error.message);
    else console.log(`[conversation] saved ${turns.length} turns for ${phoneNumber}`);
  } catch (err) {
    console.error("[conversation] pushHistory exception:", err.message);
  }
}

async function clearHistory(phoneNumber) {
  try {
    const supabase = getClient();
    if (!supabase) return;
    await supabase.from("conversations").delete().eq("phone_number", phoneNumber);
  } catch (err) {
    console.error("clearHistory error:", err.message);
  }
}

module.exports = { getHistory, pushHistory };
