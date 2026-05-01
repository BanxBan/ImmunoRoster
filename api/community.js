import { supabaseAdmin } from "./_lib/supabase.js";
import { withCors } from "./_lib/http.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  try {
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("community_population")
        .select("*")
        .order("barangay", { ascending: true });

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const { data, error } = await supabaseAdmin
        .from("community_population")
        .insert([req.body])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
