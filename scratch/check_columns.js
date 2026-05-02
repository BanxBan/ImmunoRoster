import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkColumns() {
  const tables = ["patients", "immunizations", "animal_bites"];
  for (const table of tables) {
    console.log(`Checking table: ${table}`);
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.error(`Error selecting from ${table}:`, error.message);
    } else if (data.length > 0) {
      const keys = Object.keys(data[0]);
      console.log(`Columns in ${table}:`, keys.join(", "));
      if (!keys.includes("created_by")) {
        console.warn(`WARNING: Missing 'created_by' column in ${table}`);
      }
    } else {
      console.log(`Table ${table} is empty, cannot check columns easily via select.`);
      // Try to insert a dummy record and see if it fails with created_by
      const { error: insertError } = await supabase.from(table).insert({ created_by: '00000000-0000-0000-0000-000000000000' });
      if (insertError && insertError.message.includes("column \"created_by\" of relation")) {
         console.warn(`CONFIRMED: Missing 'created_by' column in ${table}`);
      }
    }
  }
}

checkColumns();
