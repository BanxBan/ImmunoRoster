import { withCors } from "./_lib/http.js";
import { requireAdminAuth } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabase.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  if (!requireAdminAuth(req, res)) return;

  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Fetch GLOBAL stats regardless of which nurse is logged in
    const [patients, immunizations, bites, community] = await Promise.all([
      supabaseAdmin.from("patients").select("id, full_name, barangay"),
      supabaseAdmin.from("immunizations").select("id, status, scheduled_date, patient_id, vaccine_name, dose_number"),
      supabaseAdmin.from("animal_bites").select("id, treatment_status, patient_id, animal_type, incident_date"),
      supabaseAdmin.from("community_population").select("*")
    ]);

    if (patients.error) throw patients.error;
    if (immunizations.error) throw immunizations.error;
    if (bites.error) throw bites.error;
    if (community.error) throw community.error;

    return res.status(200).json({
      patients: patients.data,
      immunizations: immunizations.data,
      animalBites: bites.data,
      community: community.data
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
