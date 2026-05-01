import { withCors } from "../_lib/http.js";
import { supabaseAdmin } from "../_lib/supabase.js";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  shift: z.enum(["AM", "PM", "Night"])
}).strict();

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const validated = registerSchema.parse(req.body);
    const { username, email, password, full_name, shift } = validated;

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .insert([
        { 
          username, 
          email, 
          full_name, 
          password_hash, 
          shift,
          role: 'nurse' 
        }
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: "Username or email already exists" });
      }
      throw error;
    }

    return res.status(201).json({
      message: "Nurse account created successfully",
      user: {
        id: data.id,
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
