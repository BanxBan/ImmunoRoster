import { withCors } from "../_lib/http.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  full_name: z.string().min(1).optional()
}).strict();

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const validated = updateSchema.parse(req.body);
    const updates = { ...validated };

    if (updates.password) {
      updates.password_hash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }

    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      throw error;
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: data.id,
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        shift: data.shift
      }
    });
  } catch (error) {
    return res.status(error instanceof z.ZodError ? 400 : 500).json({ 
      error: error.message || "Internal server error" 
    });
  }
}
