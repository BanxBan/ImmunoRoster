import { withCors } from "../_lib/http.js";
import { withBoosterStatus, withRefillStatus } from "../_lib/schedule.js";
import { supabaseAdmin } from "../_lib/supabase.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  // Basic protection for cron endpoint.
  const expectedToken = process.env.CRON_SECRET;
  const headerToken = req.headers["x-cron-secret"];
  if (expectedToken && expectedToken !== headerToken) {
    return res.status(401).json({ error: "Unauthorized cron request" });
  }

  try {
    const [immunizationsResult, medicationsResult] = await Promise.all([
      supabaseAdmin.from("immunizations").select("*"),
      supabaseAdmin.from("medications").select("*")
    ]);

    if (immunizationsResult.error) throw immunizationsResult.error;
    if (medicationsResult.error) throw medicationsResult.error;

    const dueBoosters = (immunizationsResult.data || [])
      .map(withBoosterStatus)
      .filter((item) => item.is_booster_due);
    const dueRefills = (medicationsResult.data || [])
      .map(withRefillStatus)
      .filter((item) => item.is_refill_due);

    // Hook point for email/SMS/notification integrations.
    return res.status(200).json({
      run_at: new Date().toISOString(),
      booster_due_count: dueBoosters.length,
      refill_due_count: dueRefills.length
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
