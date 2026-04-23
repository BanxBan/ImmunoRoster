import { withCors } from "./_lib/http.js";

export default async function handler(req, res) {
  if (withCors(req, res)) return;
  return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
}
