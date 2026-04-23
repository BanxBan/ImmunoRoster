import { withCors } from "../_lib/http.js";
import { authenticateAdminLogin, issueAdminTokens } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { identifier, email, password } = req.body || {};
    const admin = await authenticateAdminLogin(identifier || email, password);

    if (!admin) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { accessToken, refreshToken } = issueAdminTokens(admin);
    return res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
