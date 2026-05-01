import { withCors } from "../_lib/http.js";
import { authenticateAdminLogin, issueAdminTokens } from "../_lib/auth.js";
import { validateRequest } from "../_lib/validation.js";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
  password: z.string().min(1, "Password is required"),
}).strict();

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const validated = validateRequest(req, res, { body: loginSchema });
    if (!validated) return;

    const { identifier, password } = validated.body;
    const admin = await authenticateAdminLogin(identifier, password);

    if (!admin) {
      return res.status(401).json({ error: "Invalid username/email or password" });
    }

    const { accessToken, refreshToken } = issueAdminTokens(admin);
    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
        shift: admin.shift
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
