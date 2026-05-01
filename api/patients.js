import { methodNotAllowed, withCors } from "./_lib/http.js";
import { requireAdminAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabase.js";
import { validateRequest } from "./_lib/validation.js";
import { patientSchema, patientUpdateSchema, patientSearchQuerySchema } from "./_lib/schemas.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  if (!requireAdminAuth(req, res)) return;

  try {
    if (req.method === "GET") {
      const validated = validateRequest(req, res, { query: patientSearchQuerySchema });
      if (!validated) return;

      const { id, search, barangay, municipality } = validated.query;
      let query = supabaseAdmin
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (id) query = query.eq("id", id).single();
      if (!id && search) query = query.ilike("full_name", `%${search.trim()}%`);
      if (!id && barangay) query = query.eq("barangay", barangay.trim());
      if (!id && municipality) query = query.eq("municipality", municipality.trim());

      // Filter by nurse if not admin
      if (req.admin.role === 'nurse') {
        query = query.eq("created_by", req.admin.sub);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const validated = validateRequest(req, res, { body: patientSchema });
      if (!validated) return;

      const { data, error } = await supabaseAdmin
        .from("patients")
        .insert({ ...validated.body, created_by: req.admin.sub })
        .select("*")
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === "PATCH") {
      const validated = validateRequest(req, res, {
        query: patientSearchQuerySchema.pick({ id: true }),
        body: patientUpdateSchema
      });
      if (!validated) return;

      const id = validated.query.id;
      if (!id) return res.status(400).json({ error: "id query parameter is required" });

      const { data, error } = await supabaseAdmin
        .from("patients")
        .update(validated.body)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      const validated = validateRequest(req, res, {
        query: patientSearchQuerySchema.pick({ id: true })
      });
      if (!validated) return;

      const id = validated.query.id;
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
