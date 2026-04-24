import { withCors } from "../_lib/http.js";
import { refreshAdminAccessToken } from "../_lib/auth.js";
import { validateRequest } from "../_lib/validation.js";
import { z } from "zod";

const refreshSchema = z.object({
  refresh_token: z.string().min(1, "refresh_token is required"),
}).strict();

export default async function handler(req, res) {
  if (withCors(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const validated = validateRequest(req, res, { body: refreshSchema });
    if (!validated) return;

    const { refresh_token: refreshToken } = validated.body;
    const accessToken = refreshAdminAccessToken(refreshToken);
    return res.status(200).json({ access_token: accessToken });
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}
