import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

console.log("Checking Supabase Connection...");
console.log("URL:", supabaseUrl ? "Present" : "Missing");
console.log("Key:", supabaseServiceRoleKey ? "Present" : "Missing");

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function test() {
  try {
    const { data, error } = await supabase.from("patients").select("id").limit(1);
    if (error) {
      console.error("Connection failed:", error.message);
      if (error.message.includes("Invalid token")) {
        console.error("Check your SUPABASE_SERVICE_ROLE_KEY.");
      }
      if (error.message.includes("Failed to fetch")) {
        console.error("Check your internet connection or SUPABASE_URL.");
      }
    } else {
      console.log("Connection successful! Data:", data);
    }
  } catch (err) {
    console.error("Unexpected error:", err.message);
  }
}

test();
