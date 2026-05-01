import { methodNotAllowed, withCors } from "./_lib/http.js";
import { requireAdminAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabase.js";
import { validateRequest } from "./_lib/validation.js";
import { animalBiteSchema, animalBiteUpdateSchema, patientIdQuerySchema } from "./_lib/schemas.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  if (!requireAdminAuth(req, res)) return;

  try {
    if (req.method === "GET") {
      const validated = validateRequest(req, res, { query: patientIdQuerySchema });
      if (!validated) return;

      const { id, patient_id, status } = validated.query;

      let query = supabaseAdmin
        .from("animal_bites")
        .select("*, patients(full_name)")
        .order("incident_date", { ascending: false });

      if (id) query = query.eq("id", id).single();
      if (patient_id) query = query.eq("patient_id", patient_id);
      if (status) query = query.eq("treatment_status", status);

      // Filter by nurse if not admin
      if (req.admin.role === 'nurse') {
        query = query.eq("created_by", req.admin.sub);
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const validated = validateRequest(req, res, { body: animalBiteSchema });
      if (!validated) return;

      const { data, error } = await supabaseAdmin
        .from("animal_bites")
        .insert({ ...validated.body, created_by: req.admin.sub })
        .select("*")
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === "PATCH") {
      const validated = validateRequest(req, res, {
        query: patientIdQuerySchema.pick({ id: true }),
        body: animalBiteUpdateSchema
      });
      if (!validated) return;

      const id = validated.query.id;
      if (!id) return res.status(400).json({ error: "id query parameter is required" });

      const { data, error } = await supabaseAdmin
        .from("animal_bites")
        .update(validated.body)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      const validated = validateRequest(req, res, {
        query: patientIdQuerySchema.pick({ id: true })
      });
      if (!validated) return;

      const id = validated.query.id;
      if (!id) return res.status(400).json({ error: "id query parameter is required" });

      const { error } = await supabaseAdmin.from("animal_bites").delete().eq("id", id);
      if (error) throw error;
      return res.status(204).end();
    }

    return methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
