import { methodNotAllowed, withCors } from "./_lib/http.js";
import { requireAdminAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabase.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  if (!requireAdminAuth(req, res)) return;

  try {
    if (req.method === "GET") {
      const id = req.query.id;
      const search = String(req.query.search || "").trim();
      const barangay = String(req.query.barangay || "").trim();
      const municipality = String(req.query.municipality || "").trim();
      let query = supabaseAdmin
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (id) query = query.eq("id", id).single();
      if (!id && search) query = query.ilike("full_name", `%${search}%`);
      if (!id && barangay) query = query.eq("barangay", barangay);
      if (!id && municipality) query = query.eq("municipality", municipality);

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const payload = req.body;
      const { data, error } = await supabaseAdmin
        .from("patients")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === "PATCH") {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: "id query parameter is required" });

      const { data, error } = await supabaseAdmin
        .from("patients")
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

      const { error } = await supabaseAdmin.from("patients").delete().eq("id", id);
      if (error) throw error;
      return res.status(204).end();
    }

    return methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
