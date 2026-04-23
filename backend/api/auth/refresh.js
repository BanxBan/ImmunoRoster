import { withCors } from "../_lib/http.js";
import { refreshAdminAccessToken } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { refresh_token: refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ error: "refresh_token is required" });
    }

    const accessToken = refreshAdminAccessToken(refreshToken);
    return res.status(200).json({ access_token: accessToken });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}
