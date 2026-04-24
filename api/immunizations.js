import { methodNotAllowed, withCors } from "./_lib/http.js";
import { requireAdminAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabase.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  if (!requireAdminAuth(req, res)) return;

  try {
    if (req.method === "GET") {
      const id = req.query.id;
      const patient_id = req.query.patient_id;
      const status = req.query.status;

      let query = supabaseAdmin
        .from("immunizations")
        .select("*, patients(full_name)")
        .order("scheduled_date", { ascending: true });

      if (id) query = query.eq("id", id).single();
      if (patient_id) query = query.eq("patient_id", patient_id);
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const { data, error } = await supabaseAdmin
        .from("immunizations")
        .insert(req.body)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === "PATCH") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id query parameter is required" });

      const { data, error } = await supabaseAdmin
        .from("immunizations")
        .update(req.body)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id query parameter is required" });

      const { error } = await supabaseAdmin.from("immunizations").delete().eq("id", id);
      if (error) throw error;
      return res.status(204).end();
    }

    return methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
