import { methodNotAllowed, withCors } from "./_lib/http.js";
import { requireAdminAuth } from "./_lib/auth.js";
import { withRefillStatus } from "./_lib/schedule.js";
import { supabaseAdmin } from "./_lib/supabase.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  if (!requireAdminAuth(req, res)) return;

  try {
    if (req.method === "GET") {
      const id = req.query.id;
      const patientId = req.query.patientId;
      const dueOnly = req.query.dueOnly === "true";

      let query = supabaseAdmin
        .from("medications")
        .select("*")
        .order("created_at", { ascending: false });

      if (id) query = query.eq("id", id).single();
      if (patientId) query = query.eq("patient_id", patientId);

      const { data, error } = await query;
      if (error) throw error;

      const transformed = Array.isArray(data)
        ? data.map(withRefillStatus)
        : withRefillStatus(data);

      if (dueOnly && Array.isArray(transformed)) {
        return res.status(200).json(transformed.filter((item) => item.is_refill_due));
      }

      return res.status(200).json(transformed);
    }

    if (req.method === "POST") {
      const payload = req.body;
      const { data, error } = await supabaseAdmin
        .from("medications")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(201).json(withRefillStatus(data));
    }

    if (req.method === "PATCH") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id query parameter is required" });

      const { data, error } = await supabaseAdmin
        .from("medications")
        .update(req.body)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(200).json(withRefillStatus(data));
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id query parameter is required" });

      const { error } = await supabaseAdmin.from("medications").delete().eq("id", id);
      if (error) throw error;
      return res.status(204).end();
    }

    return methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
