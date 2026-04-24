import { methodNotAllowed, withCors } from "./_lib/http.js";
import { requireAdminAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabase.js";
import { validateRequest } from "./_lib/validation.js";
import { providerSchema, providerUpdateSchema, resourceIdQuerySchema } from "./_lib/schemas.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  if (!requireAdminAuth(req, res)) return;

  try {
    if (req.method === "GET") {
      const id = req.query.id;
      let query = supabaseAdmin.from("providers").select("*").order("full_name", { ascending: true });

      if (id) {
        const validated = validateRequest(req, res, { query: resourceIdQuerySchema });
        if (!validated) return;
        query = query.eq("id", validated.query.id).single();
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const validated = validateRequest(req, res, { body: providerSchema });
      if (!validated) return;

      const { data, error } = await supabaseAdmin
        .from("providers")
        .insert(validated.body)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === "PATCH") {
      const validated = validateRequest(req, res, {
        query: resourceIdQuerySchema,
        body: providerUpdateSchema
      });
      if (!validated) return;

      const { data, error } = await supabaseAdmin
        .from("providers")
        .update(validated.body)
        .eq("id", validated.query.id)
        .select("*")
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      const validated = validateRequest(req, res, { query: resourceIdQuerySchema });
      if (!validated) return;

      const { error } = await supabaseAdmin.from("providers").delete().eq("id", validated.query.id);
      if (error) throw error;
      return res.status(204).end();
    }

    return methodNotAllowed(res, ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
